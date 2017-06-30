import * as machina from 'machina';
import * as amqp10 from 'amqp10';
import * as dbg from 'debug';
import { EventEmitter } from 'events';
import { Message, results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';

const debug = dbg('SenderLink');

interface MessageOperation {
  message: Message;
  callback: (err?: Error, result?: results.MessageEnqueued) => void;
}

/*Codes_SRS_NODE_AMQP_SENDER_LINK_16_002: [The `SenderLink` class shall inherit from `EventEmitter`.]*/
/*Codes_SRS_NODE_AMQP_SENDER_LINK_16_003: [The `SenderLink` class shall implement the `AmqpLink` interface.]*/
export class SenderLink extends EventEmitter implements AmqpLink {
  private _linkAddress: string;
  private _linkOptions: any;
  private _linkObject: any;
  private _fsm: machina.Fsm;
  private _amqp10Client: amqp10.AmqpClient;
  private _unsentMessageQueue: MessageOperation[];
  private _pendingMessageQueue: MessageOperation[];
  private _detachHandler: (detachEvent: any) => void;
  private _errorHandler: (err: Error) => void;

  constructor(linkAddress: string, linkOptions: any, amqp10Client: amqp10.AmqpClient) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._amqp10Client = amqp10Client;
    this._unsentMessageQueue = [];
    this._pendingMessageQueue = [];

    this._detachHandler = (detachEvent: any): void => {
      this._fsm.transition('detaching', detachEvent.error);
    };

    this._errorHandler = (err: Error): void => {
      this._fsm.transition('detaching', err);
    };

    const pushToQueue = (message, callback) => {
      this._unsentMessageQueue.push({
        message: message,
        callback: callback
      });
    };

    this._fsm = new machina.Fsm({
      /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_001: [The `SenderLink` internal state machine shall be initialized in the `detached` state.]*/
      initialState: 'detached',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
            if (this._unsentMessageQueue.length > 0) {
              let messageCallbackError = err || new Error('Link Detached');

              let unsent = this._unsentMessageQueue.shift();
              while (unsent) {
                unsent.callback(messageCallbackError);
                unsent = this._unsentMessageQueue.shift();
              }
            }

            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.]*/
            if (this._pendingMessageQueue.length > 0) {
              let messageCallbackError = err || new Error('Link Detached');

              let pending = this._pendingMessageQueue.shift();
              while (pending) {
                pending.callback(messageCallbackError);
                pending = this._pendingMessageQueue.shift();
              }
            }

            if (callback) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_018: [If returning to the `detached` state because of an error that happened while trying to attach the link or send a message, the `callback` for this function shall be called with that error.]*/
              callback(err);
            } else if (err) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_016: [If returning to the `detached` state because of an error that didn't happen while trying to attach the link or send a message, the sender link shall call emit an `error` event with that error.]*/
              this.emit('error', err);
            }
          },
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
          attach: (callback) => this._fsm.transition('attaching', callback),
          detach: () => { return; },
          send: (message, callback) => {
            pushToQueue(message, callback);
            this._fsm.handle('attach');
          }
        },
        attaching: {
          _onEnter: (callback) => {
            this._attachLink((err) => {
              let newState = err ? 'detached' : 'attached';
              this._fsm.transition(newState, callback, err);
            });
          },
          detach: () => this._fsm.transition('detaching'),
          send: (message, callback) => pushToQueue(message, callback)
        },
        attached: {
          _onEnter: (callback) => {
            let toSend = this._unsentMessageQueue.shift();
            while (toSend) {
              this._fsm.handle('send', toSend.message, toSend.callback);
              toSend = this._unsentMessageQueue.shift();
            }
            if (callback) callback();
          },
          _onExit: () => {
            this._linkObject.removeListener('detached', this._detachHandler);
          },
          attach: (callback) => callback(),
          detach: () => this._fsm.transition('detaching'),
          send: (message, callback) => {
            const op = {
              message: message,
              callback: callback
            };

            this._pendingMessageQueue.push(op);

            /*Codes_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
            let _processPendingMessageCallback = (error?, result?) => {
              const opIndex = this._pendingMessageQueue.indexOf(op);
              if (opIndex >= 0) {
                this._pendingMessageQueue.splice(opIndex, 1);
                if (op.callback) {
                  /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
                  /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
                  process.nextTick(() => callback(error, result));
                }
              }
            };

            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `amqp10.AmqpClient` to send the specified `message` to the IoT hub.]*/
            this._linkObject.send(message)
                            .then((state) => {
                              _processPendingMessageCallback(null, new results.MessageEnqueued(state));
                              return null;
                            })
                            .catch((err) => {
                              _processPendingMessageCallback(err);
                            });
          }
        },
        detaching: {
          _onEnter: (err) => {
            if (this._linkObject) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_009: [** The `detach` method shall detach the link created by the `amqp10.AmqpClient` underlying object.]*/
              this._linkObject.forceDetach();
              this._linkObject = null;
            }
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_017: [** The `detach` method shall return the state machine to the `detached` state.]*/
            this._fsm.transition('detached', null, err);
          },
          '*': () => this._fsm.deferUntilTransition('detached')
        }
      }
    });
  }

  detach(): void {
    this._fsm.handle('detach');
  }

  attach(callback: (err?: Error) => void): void {
    this._fsm.handle('attach', callback);
  }

  send(message: AmqpMessage, callback: (err?: Error, result?: results.MessageEnqueued) => void): void {
    this._fsm.handle('send', message, callback);
  }

  private _attachLink(callback: (err?: Error) => void): void {
    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_008: [If the `amqp10.AmqpClient` fails to create the link the `callback` function shall be called with this error object.]*/
    let connectionError = null;
    let clientErrorHandler = (err) => {
      connectionError = err;
    };

    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_005: [If the `amqp10.AmqpClient` emits an `errorReceived` event during the time the link is attached, the `callback` function shall be called with this error.]*/
    this._amqp10Client.on('client:errorReceived', clientErrorHandler);

    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.]*/
    this._amqp10Client.createSender(this._linkAddress, this._linkOptions)
      .then((amqp10link) => {
        if (!connectionError) {
          debug('Sender object created for endpoint: ' + this._linkAddress);
          this._linkObject = amqp10link;
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_006: [The `SenderLink` object should subscribe to the `detached` event of the newly created `amqp10` link object.]*/
          this._linkObject.on('detached', this._detachHandler);
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_007: [The `SenderLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object.]*/
          this._linkObject.on('errorReceived', this._errorHandler);
        }
        this._amqp10Client.removeListener('client:errorReceived', clientErrorHandler);

        return callback(connectionError);
      })
      .catch((err) => callback(err));
  }
}
