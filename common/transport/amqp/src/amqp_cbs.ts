import * as machina from 'machina';
import * as uuid from 'uuid';
import * as async from 'async';
import { EventEmitter } from 'events';
import * as dbg from 'debug';
import { Session } from 'rhea';
import { errors } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { SenderLink } from './sender_link';
import { ReceiverLink } from './receiver_link';

const debug = dbg('azure-iot-amqp-base:CBS');

/**
 * @interface  module:azure-iot-amqp-base.PutTokenOperation
 * @classdesc  Describes a "put token" operation state: "put-token" operations are used to renew the CBS token and stay connected.
 *
 * @property   {Function}   putTokenCallback       The callback to be invoked on termination of the put token operation.
 *                                                 This could be because the put token operation response was received
 *                                                 from the service or because the put token operation times out.
 * @property   {Number}     expirationTime         The number of seconds from the epoch, by which the put token operation will
 *                                                 be expected to finish.
 * @property   {Number}     correlationId          The put token operation was sent with a message id.  The response
 *                                                 to the put token operation will contain this message id as the
 *                                                 correlation id.  This id is a uuid.
 *
 */
interface PutTokenOperation {
  putTokenCallback: (err: Error | null, result?: any) => void;
  expirationTime: number;
  correlationId: string;
}

/**
 * @class      module:azure-iot-amqp-base.PutTokenStatus
 * @classdesc  Describes the state of the "put token" feature of the client that enables Claim-Based-Security authentication.
 *
 * @property   {Function}   outstandingPutTokens                This array will hold outstanding put token operations.  The array has
 *                                                              a monotonically increasing time ordering.  This is effected by the nature
 *                                                              of inserting new elements at the end of the array.  Note that elements may
 *                                                              be removed from the array at any index.
 * @property   {Number}     numberOfSecondsToTimeout            Currently a fixed value.  Could have a set option if we want to make this configurable.
 * @property   {Number}     putTokenTimeOutExaminationInterval  While there are ANY put token operations outstanding a timer will be invoked every
 *                                                              10 seconds to examine the outstandingPutTokens array for any put tokens that may have
 *                                                              expired.
 * @property   {Number}     timeoutTimer                        Timer used to trigger examination of the outstandingPutTokens array.
 */
class PutTokenStatus {
    outstandingPutTokens: PutTokenOperation[] = [];
    numberOfSecondsToTimeout: number = 120;
    putTokenTimeOutExaminationInterval: number = 10000;
    timeoutTimer: number;
}

/**
 * @private
 * Handles claims based security (sending and receiving SAS tokens over AMQP links).
 * This resides in the amqp-base package because it's used by the device and service SDKs but
 * the life cycle of this object is actually managed by the upper layer of each transport.
 */
export class ClaimsBasedSecurityAgent extends EventEmitter {
  private static _putTokenSendingEndpoint: string = '$cbs';
  private static _putTokenReceivingEndpoint: string = '$cbs';
  private _rheaSession: Session;
  private _fsm: machina.Fsm;
  private _senderLink: SenderLink;
  private _receiverLink: ReceiverLink;
  private _putToken: PutTokenStatus = new PutTokenStatus();
  private _putTokenQueue: {
    audience: string,
    token: string,
    callback: (err?: Error) => void
  }[];

  constructor(session: Session) {
    super();

    this._rheaSession = session;
    /*Codes_SRS_NODE_AMQP_CBS_16_001: [The `constructor` shall instantiate a `SenderLink` object for the `$cbs` endpoint.]*/
    this._senderLink = new SenderLink(ClaimsBasedSecurityAgent._putTokenSendingEndpoint, null, this._rheaSession);

    /*Codes_SRS_NODE_AMQP_CBS_16_002: [The `constructor` shall instantiate a `ReceiverLink` object for the `$cbs` endpoint.]*/
    this._receiverLink = new ReceiverLink(ClaimsBasedSecurityAgent._putTokenReceivingEndpoint, null, this._rheaSession);

    this._putTokenQueue = [];

    this._fsm = new machina.Fsm({
      initialState: 'detached',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            let tokenOperation = this._putTokenQueue.shift();
            while (tokenOperation) {
              tokenOperation.callback(err);
              tokenOperation = this._putTokenQueue.shift();
            }

            /*Codes_SRS_NODE_AMQP_CBS_16_006: [If given as an argument, the `attach` method shall call `callback` with a standard `Error` object if any link fails to attach.]*/
            if (callback) {
              callback(err);
            }
          },
          attach: (callback) => {
            this._fsm.transition('attaching', callback);
          },
          detach: (callback) => { if (callback) callback(); },
          /*Tests_SRS_NODE_AMQP_CBS_16_021: [The `forceDetach()` method shall return immediately if no link is attached.]*/
          forceDetach: () => { return; },
          putToken: (audience, token, callback) => {
            this._putTokenQueue.push({
              audience: audience,
              token: token,
              callback: callback
            });
            this._fsm.transition('attaching');
          }
         },
        attaching: {
          _onEnter: (callback) => {
            this._senderLink.attach((err) => {
              if (err) {
                this._fsm.transition('detaching', callback, err);
              } else {
                this._receiverLink.attach((err) => {
                  if (err) {
                    this._fsm.transition('detaching', callback, err);
                  } else {
                    this._receiverLink.on('message', (msg) => {
                      //
                      // Regardless of whether we found the put token in the list of outstanding
                      // operations, accept it.  This could be a put token that we previously
                      // timed out.  Be happy.  It made it home, just too late to be useful.
                      //
                      /*Codes_SRS_NODE_AMQP_CBS_16_020: [All responses shall be accepted.]*/
                      this._receiverLink.accept(msg);
                      for (let i = 0; i < this._putToken.outstandingPutTokens.length; i++) {
                        //
                        // Just as a reminder.  For cbs, the message id and the correlation id
                        // always stayed as string values.  They never went on over the wire
                        // as the amqp uuid type.
                        //
                        if (msg.correlation_id === this._putToken.outstandingPutTokens[i].correlationId) {
                          const completedPutToken = this._putToken.outstandingPutTokens[i];
                          this._putToken.outstandingPutTokens.splice(i, 1);
                          //
                          // If this was the last outstanding put token then get rid of the timer trying to clear out expiring put tokens.
                          //
                          if (this._putToken.outstandingPutTokens.length === 0) {
                            clearTimeout(this._putToken.timeoutTimer);
                          }
                          if (completedPutToken.putTokenCallback) {
                            /*Codes_SRS_NODE_AMQP_CBS_16_019: [A put token response of 200 will invoke `putTokenCallback` with null parameters.]*/
                            let error = null;
                            if (msg.application_properties['status-code'] !== 200) {
                              /*Codes_SRS_NODE_AMQP_CBS_16_018: [A put token response not equal to 200 will invoke `putTokenCallback` with an error object of UnauthorizedError.]*/
                              error = new errors.UnauthorizedError(msg.application_properties['status-description']);
                            }
                            completedPutToken.putTokenCallback(error);
                          }
                          break;
                        }
                      }
                    });
                    this._fsm.transition('attached', callback);
                  }
                });
              }
            });
          },
          detach: (callback, err) => this._fsm.transition('detaching', callback, err),
          forceDetach: () => {
            /*Tests_SRS_NODE_AMQP_CBS_16_022: [The `forceDetach()` method shall call `forceDetach()` on all attached links.]*/
            if (this._senderLink) {
              this._senderLink.forceDetach();
            }
            if (this._receiverLink) {
              this._receiverLink.forceDetach();
            }
            this._fsm.transition('detached');
          },
          putToken: (audience, token, callback) => {
            this._putTokenQueue.push({
              audience: audience,
              token: token,
              callback: callback
            });
          }
         },
        attached: {
          _onEnter: (callback) => {
            if (callback) {
              callback();
            }
            let tokenOperation = this._putTokenQueue.shift();
            while (tokenOperation) {
              this._fsm.handle('putToken', tokenOperation.audience, tokenOperation.token, tokenOperation.callback);
              tokenOperation = this._putTokenQueue.shift();
            }
          },
          /*Codes_SRS_NODE_AMQP_CBS_06_001: [If in the attached state, either the sender or the receiver links gets an error, an error of `azure-iot-amqp-base:error-indicated` will have been indicated on the container object and the cbs will remain in the attached state.  The owner of the cbs MUST detach.] */
          attach: (callback) => callback(),
          detach: (callback, err) => {
            debug('while attached - detach for CBS links ' + this._receiverLink + ' ' + this._senderLink);
            this._fsm.transition('detaching', callback, err);
          },
          forceDetach: () => {
            debug('while attached - force detach for CBS links ' + this._receiverLink + ' ' + this._senderLink);
            /*Tests_SRS_NODE_AMQP_CBS_16_022: [The `forceDetach()` method shall call `forceDetach()` on all attached links.]*/
            this._receiverLink.forceDetach();
            this._senderLink.forceDetach();
            this._fsm.transition('detached');
          },
          putToken: (audience, token, putTokenCallback) => {
          /*SRS_NODE_AMQP_CBS_16_011: [The `putToken` method shall construct an amqp message that contains the following application properties:
          ```
          'operation': 'put-token'
          'type': 'servicebus.windows.net:sastoken'
          'name': <audience>
          ```
          and system properties of
          ```
          'to': '$cbs'
          'messageId': <uuid>
          'reply_to': 'cbs'
          ```
          and a body containing `<sasToken>`.]*/
            let amqpMessage = new AmqpMessage();
            amqpMessage.application_properties = {
              operation: 'put-token',
              type: 'servicebus.windows.net:sastoken',
              name: audience
            };
            amqpMessage.body = token;
            amqpMessage.to = '$cbs';
            //
            // For CBS, the message id and correlation id are encoded as string
            //
            amqpMessage.message_id = uuid.v4();
            amqpMessage.reply_to = 'cbs';

            let outstandingPutToken: PutTokenOperation = {
              putTokenCallback: putTokenCallback,
              expirationTime: Math.round(Date.now() / 1000) + this._putToken.numberOfSecondsToTimeout,
              correlationId: amqpMessage.message_id
            };

            this._putToken.outstandingPutTokens.push(outstandingPutToken);
            //
            // If this is the first put token then start trying to time it out.
            //
            if (this._putToken.outstandingPutTokens.length === 1) {
              this._putToken.timeoutTimer = setTimeout(this._removeExpiredPutTokens.bind(this), this._putToken.putTokenTimeOutExaminationInterval);
            }
            /*Codes_SRS_NODE_AMQP_CBS_16_012: [The `putToken` method shall send this message over the `$cbs` sender link.]*/
            this._senderLink.send(amqpMessage, (err) => {
              if (err) {
                // Find the operation in the outstanding array.  Remove it from the array since, well, it's not outstanding anymore.
                // Since we may have arrived here asynchronously, we simply can't assume that it is the end of the array.  But,
                // it's more likely near the end.
                // If the token has expired it won't be found, but that's ok because its callback will have been called when it was removed.
                for (let i = this._putToken.outstandingPutTokens.length - 1; i >= 0; i--) {
                  if (this._putToken.outstandingPutTokens[i].correlationId === amqpMessage.message_id) {
                    const outStandingPutTokenInError = this._putToken.outstandingPutTokens[i];
                    this._putToken.outstandingPutTokens.splice(i, 1);
                    //
                    // This was the last outstanding put token.  No point in having a timer around trying to time nothing out.
                    //
                    if (this._putToken.outstandingPutTokens.length === 0) {
                      clearTimeout(this._putToken.timeoutTimer);
                    }
                    /*Codes_SRS_NODE_AMQP_CBS_16_013: [The `putToken` method shall call `callback` (if supplied) if the `send` generates an error such that no response from the service will be forthcoming.]*/
                    outStandingPutTokenInError.putTokenCallback(err);
                    break;
                  }
                }
              }
            });
          }
        },
        detaching: {
          _onEnter: (forwardedCallback, err) => {
            /*Codes_SRS_NODE_AMQP_CBS_16_008: [`detach` shall detach both sender and receiver links and return the state machine to the `detached` state.]*/
            const links = [this._senderLink, this._receiverLink];
            async.each(links, (link, callback) => {
              if (link) {
                debug('while detaching for link ');
                link.detach(callback);
              } else {
                callback();
              }
            }, () => {
              this._fsm.transition('detached', forwardedCallback, err);
            });
          },
          '*': (callback) => this._fsm.deferUntilTransition('detached')
        }
      }
    });
  }

  attach(callback: (err?: Error) => void): void {
    this._fsm.handle('attach', callback);
  }

  detach(callback: (err?: Error) => void): void {
    this._fsm.handle('detach', callback);
  }

  forceDetach(): void {
    this._fsm.handle('forceDetach');
  }

  /**
   * @method             module:azure-iot-amqp-base.Amqp#putToken
   * @description        Sends a put token operation to the IoT Hub to provide authentication for a device.
   * @param              audience          The path that describes what is being authenticated.  An example would be
   *                                       hub.azure-devices.net%2Fdevices%2Fmydevice
   * @param              token             The actual sas token being used to authenticate the device.  For the most
   *                                       part the audience is likely to be the sr field of the token.
   * @param {Function}   putTokenCallback  Called when the put token operation terminates.
   */
  putToken(audience: string, token: string, putTokenCallback: (err?: Error) => void): void {
    /*Codes_SRS_NODE_AMQP_CBS_16_009: [The `putToken` method shall throw a ReferenceError if the `audience` argument is falsy.]*/
    if (!audience) {
      throw new ReferenceError('audience cannot be \'' + audience + '\'');
    }

    /*Codes_SRS_NODE_AMQP_CBS_16_010: [The `putToken` method shall throw a ReferenceError if the `token` argument is falsy.]*/
    if (!token) {
      throw new ReferenceError('token cannot be \'' + token + '\'');
    }

    this._fsm.handle('putToken', audience, token, putTokenCallback);
  }

  private _removeExpiredPutTokens(): void {
    const currentTime = Math.round(Date.now() / 1000);
    let expiredPutTokens: PutTokenOperation[] = [];
    while (this._putToken.outstandingPutTokens.length > 0) {
      //
      // The timeouts in this array by definition are monotonically increasing.  We will be done looking if we
      // hit one that is not yet expired.
      //
      /*Codes_SRS_NODE_AMQP_CBS_16_014: [The `putToken` method will time out the put token operation if no response is returned within a configurable number of seconds.]*/
      if (this._putToken.outstandingPutTokens[0].expirationTime < currentTime) {
        expiredPutTokens.push(this._putToken.outstandingPutTokens[0]);
        this._putToken.outstandingPutTokens.splice(0, 1);
      } else {
        break;
      }
    }
    expiredPutTokens.forEach((currentExpiredPut) => {
      /*Codes_SRS_NODE_AMQP_CBS_16_015: [The `putToken` method will invoke the `callback` (if supplied) with an error object if the put token operation timed out.]*/
      currentExpiredPut.putTokenCallback(new errors.TimeoutError('Put Token operation had no response within ' + this._putToken.numberOfSecondsToTimeout));
    });
    //
    // If there are any putTokens left keep trying to time them out.
    //
    if (this._putToken.outstandingPutTokens.length > 0) {
      this._putToken.timeoutTimer = setTimeout(this._removeExpiredPutTokens.bind(this), this._putToken.putTokenTimeOutExaminationInterval);
    }
  }
}
