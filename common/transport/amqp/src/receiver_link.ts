import * as machina from 'machina';
import * as dbg from 'debug';
import { EventEmitter } from 'events';
import { Message, errors, results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';

const debug = dbg('amqp-common:receiverlink');

/*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_002: [** The `ReceiverLink` class shall inherit from `EventEmitter`.]*/
/*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_003: [** The `ReceiverLink` class shall implement the `AmqpLink` interface.]*/
export class ReceiverLink  extends EventEmitter implements AmqpLink {
  private _linkAddress: string;
  private _linkOptions: any;
  private _linkObject: any;
  private _fsm: machina.Fsm;
  private _amqp10Client: any;
  private _detachHandler: (detachEvent: any) => void;
  private _errorHandler: (err: Error) => void;
  private _messageHandler: (message: AmqpMessage) => void;

  constructor(linkAddress: string, linkOptions: any, amqp10Client: any) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._amqp10Client = amqp10Client;

    this._detachHandler = (detachEvent: any): void => {
      debug('handling detach event: ' + JSON.stringify(detachEvent));
      this._fsm.handle('forceDetach', detachEvent.error);
    };

    this._errorHandler = (err: Error): void => {
      debug('handling error event: ' + err.toString());
      this._fsm.handle('forceDetach', err);
    };

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `amqp10` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
    this._messageHandler = (message: AmqpMessage): void => {
      this.emit('message', AmqpMessage.toMessage(message));
    };

    this._fsm = new machina.Fsm({
      initialState: 'detached',
      namespace: 'receiverlink',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            this._linkObject = null;

            if (callback) {
              callback(err);
            } else if (err) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_011: [If a `detached` or `errorReceived` event is emitted by the `amqp10` link object, the `ReceiverLink` object shall forward that error to the client.]*/
              this.emit('error', err);
            }
          },
          attach: (callback) => {
            this._fsm.transition('attaching', callback);
          },
          detach: (callback) => { this._safeCallback(callback); },
          forceDetach: () => { return; },
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attaching: {
          _onEnter: (callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_004: [The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance.]*/
            debug('creating receiver with amqp10 for: ' + this._linkAddress);
            this._amqp10Client.createReceiver(this._linkAddress, this._linkOptions)
              .then((amqp10link) => {
                debug('receiver object created by amqp10 for endpoint: ' + this._linkAddress);
                if (this._fsm.state === 'attaching') {
                  this._linkObject = amqp10link;
                  /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_006: [The `ReceiverLink` object should subscribe to the `detached` event of the newly created `amqp10` link object.]*/
                  this._linkObject.on('detached', this._detachHandler);
                  /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_007: [The `ReceiverLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object.]*/
                  this._linkObject.on('errorReceived', this._errorHandler);
                  this._linkObject.on('message', this._messageHandler);
                  /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_020: [The `attach` method shall call the `callback` if the link was successfully attached.]*/
                  this._fsm.transition('attached', callback);
                } else {
                  debug('client forceDetached us already - cleaning up');
                  amqp10link.forceDetach();
                }
                return null;
              })
              .catch((err) => {
                debug('amqp10 failed to create receiver: ' + err.toString());
                this._fsm.transition('detached', callback, err);
              });
          },
          detach: (callback) => this._fsm.transition('detaching', callback),
          forceDetach: (err) => this._fsm.transition('detached', undefined, err),
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attached: {
          _onEnter: (callback, err) => {
            this._safeCallback(callback, err);
          },
          attach: (callback) => {
            this._safeCallback(callback);
          },
          detach: (callback) => this._fsm.transition('detaching', callback),
          forceDetach: (err) => {
            if (this._linkObject) {
              this._removeListeners();
              this._linkObject.forceDetach();
            }

            this._fsm.transition('detached', undefined, err);
          },
          accept: (message, callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified.]*/
            this._linkObject.accept(message);
            this._safeCallback(callback, null, new results.MessageCompleted());
          },
          reject: (message, callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified.]*/
            this._linkObject.reject(message);
            this._safeCallback(callback, null, new results.MessageRejected());
          },
          abandon: (message, callback) => {
            this._linkObject.release(message);
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified.]*/
            this._safeCallback(callback, null, new results.MessageAbandoned());
          }
        },
        detaching: {
          _onEnter: (callback, err) => {
            if (this._linkObject) {
              this._removeListeners();
              this._linkObject.detach().then(() => {
                this._fsm.transition('detached', callback, err);
              }).catch((err) => {
                debug('error detaching the receiver link: ' + err.toString());
                this._fsm.transition('detached', callback, err);
              });
            } else {
              this._fsm.transition('detached', callback, err);
            }
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

  detach(callback: (err?: Error) => void): void {
    this._fsm.handle('detach', callback);
  }

  forceDetach(err?: Error): void {
    this._fsm.handle('forceDetach', err);
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

  private _removeListeners(): void {
    this._linkObject.removeListener('detached', this._detachHandler);
    this._linkObject.removeListener('message', this._messageHandler);
    this._linkObject.removeListener('errorReceived', this._errorHandler);
  }

  private _safeCallback(callback: (err?: Error, result?: any) => void, error?: Error | null, result?: any): void {
    if (callback) {
      process.nextTick(() => callback(error, result));
    }
  }
}
