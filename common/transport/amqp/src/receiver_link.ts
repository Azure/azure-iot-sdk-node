import * as machina from 'machina';
import * as amqp10 from 'amqp10';
import * as dbg from 'debug';
import { EventEmitter } from 'events';
import { Message, errors, results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';

const debug = dbg('ReceiverLink');

/*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_002: [** The `ReceiverLink` class shall inherit from `EventEmitter`.]*/
/*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_003: [** The `ReceiverLink` class shall implement the `AmqpLink` interface.]*/
export class ReceiverLink  extends EventEmitter implements AmqpLink {
  private _linkAddress: string;
  private _linkOptions: any;
  private _linkObject: any;
  private _fsm: machina.Fsm;
  private _amqp10Client: amqp10.AmqpClient;
  private _detachHandler: (detachEvent: any) => void;
  private _errorHandler: (err: Error) => void;
  private _messageHandler: (message: AmqpMessage) => void;

  constructor(linkAddress: string, linkOptions: any, amqp10Client: amqp10.AmqpClient) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._amqp10Client = amqp10Client;

    this._detachHandler = (detachEvent: any): void => {
      this._fsm.transition('detaching', detachEvent.error);
    };

    this._errorHandler = (err: Error): void => {
      this._fsm.transition('detaching', err);
    };

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `amqp10` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
    this._messageHandler = (message: AmqpMessage): void => {
      this.emit('message', AmqpMessage.toMessage(message));
    };

    this._fsm = new machina.Fsm({
      /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_001: [** The `ReceiverLink` internal state machine shall be initialized in the `detached` state.]*/
      initialState: 'detached',
      states: {
        detached: {
          _onEnter: (err) => {
            if (err) {
              this.emit('error', err);
            }
          },
          attach: (callback) => {
            this._fsm.transition('attaching', callback);
          },
          detach: () => { return; },
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attaching: {
          _onEnter: (callback) => {
            this._attachLink((err) => {
              let newState = err ? 'detached' : 'attached';
              if (callback) {
                this._fsm.transition(newState);
                callback(err);
              } else {
                this._fsm.transition(newState, err);
              }
            });
          },
          detach: () => this._fsm.transition('detaching'),
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attached: {
          attach: (callback) => {
            if (callback) {
              return callback();
            }
          },
          detach: () => this._fsm.transition('detaching'),
          accept: (message, callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified.]*/
            this._linkObject.accept(message);
            if (callback) callback(null, new results.MessageCompleted());
          },
          reject: (message, callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified.]*/
            this._linkObject.reject(message);
            if (callback) callback(null, new results.MessageRejected());
          },
          abandon: (message, callback) => {
            this._linkObject.release(message);
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified.]*/
            if (callback) callback(null, new results.MessageAbandoned());
          }
        },
        detaching: {
          _onEnter: (err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_009: [The `detach` method shall detach the link created by the `amqp10.AmqpClient` underlying object.]*/
            if (this._linkObject) {
              this._linkObject.removeListener('detached', this._detachHandler);
              this._linkObject.removeListener('message', this._messageHandler);
              this._linkObject.removeListener('errorReceived', this._errorHandler);
              this._linkObject.forceDetach();
              this._linkObject = null;
            }

            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_010: [The `detach` method shall return the state machine to the `detached` state.]*/
            this._fsm.transition('detached', err);
          },
          '*': () => this._fsm.deferUntilTransition('detached')
        }
      }
    });

    this.on('removeListener', (eventName) => {
      // stop listening for AMQP events if our consumers stop listening for our events
      if (eventName === 'message' && this.listeners('message').length === 0) {
        this._fsm.handle('detach');
      }
    });

    this.on('newListener', (eventName) => {
      // lazy-init AMQP event listeners
      if (eventName === 'message') {
        this._fsm.handle('attach');
      }
    });
  }

  detach(): void {
    this._fsm.handle('detach');
  }

  attach(callback: (err?: Error) => void): void {
    this._fsm.handle('attach', callback);
  }

  accept(message: Message, callback?: (err?: Error, result?: results.MessageCompleted) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `accept` method shall throw if the `message` argument is falsy.]*/
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._fsm.handle('accept', message.transportObj, callback);
  }

  complete(message: Message, callback?: (err?: Error, result?: results.MessageCompleted) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_015: [The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only).]*/
    this.accept(message, callback);
  }

  reject(message: Message, callback?: (err?: Error, result?: results.MessageRejected) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `reject` method shall throw if the `message` argument is falsy.]*/
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._fsm.handle('reject', message.transportObj, callback);
  }

  abandon(message: Message, callback?: (err?: Error, result?: results.MessageAbandoned) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `abandon` method shall throw if the `message` argument is falsy.]*/
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._fsm.handle('abandon', message.transportObj, callback);
  }

  private _attachLink(done: (err?: Error) => void): void {
    let connectionError = null;
    let clientErrorHandler = (err) => {
      connectionError = err;
    };
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_005: [If the `amqp10.AmqpClient` emits an `errorReceived` event during the time the link is attached, the `callback` function shall be called with this error.]*/
    this._amqp10Client.on('client:errorReceived', clientErrorHandler);

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_004: [The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance.]*/
    this._amqp10Client.createReceiver(this._linkAddress, this._linkOptions)
      .then((amqp10link) => {
        amqp10link.on('detached', (detached) => {
          debug('receiver link detached: ' + this._linkAddress);
        });
        this._amqp10Client.removeListener('client:errorReceived', clientErrorHandler);
        if (!connectionError) {
          debug('Receiver object created for endpoint: ' + this._linkAddress);
          this._linkObject = amqp10link;
          /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_006: [The `ReceiverLink` object should subscribe to the `detached` event of the newly created `amqp10` link object.]*/
          this._linkObject.on('detached', this._detachHandler);
          /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_007: [The `ReceiverLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object.]*/
          this._linkObject.on('errorReceived', this._errorHandler);
          this._linkObject.on('message', this._messageHandler);
          /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_020: [The `attach` method shall call the `callback` if the link was successfully attached.]*/
          this._safeCallback(done);
        } else {
          /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_005: [If the `amqp10.AmqpClient` emits an `errorReceived` event during the time the link is attached, the `callback` function shall be called with this error.]*/
          this._safeCallback(done, connectionError);
        }

        return null;
      })
      .catch((err) => {
        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_008: [If the `amqp10.AmqpClient` fails to create the link the `callback` function shall be called with this error object.]*/
        this._safeCallback(done, err);
      });
  }

  private _safeCallback(callback: (err?: Error, result?: any) => void, error?: Error | null, result?: any): void {
    if (callback) {
      process.nextTick(() => callback(error, result));
    }
  }
}
