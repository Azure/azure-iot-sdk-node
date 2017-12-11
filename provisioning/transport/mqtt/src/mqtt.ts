// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import * as uuid from 'uuid';
import * as machina from 'machina';
import * as dbg from 'debug';
const debug = dbg('azure-iot-provisioning-device-mqtt:Mqtt');

import { MqttBase } from 'azure-iot-mqtt-base';
import { errors, X509 } from 'azure-iot-common';
import { X509ProvisioningTransport } from 'azure-iot-provisioning-device';
import { ProvisioningDeviceConstants, ProvisioningTransportOptions } from 'azure-iot-provisioning-device';
import { RegistrationRequest } from 'azure-iot-provisioning-device';
import { translateError } from 'azure-iot-provisioning-device';


/**
 * Topic to subscribe to for responses
 */
const responseTopic: string = '$dps/registrations/res/#';

export class Mqtt extends EventEmitter implements X509ProvisioningTransport {
  private _mqttBase: MqttBase;
  private _config: ProvisioningTransportOptions = {};
  private _fsm: machina.Fsm;
  private _auth: X509;

  private _operations: {
    [key: string]: (err?: Error, payload?: any) => void;
  } = {};

  constructor(mqttBase?: MqttBase) {
    super();
    this._mqttBase = mqttBase || new MqttBase(ProvisioningDeviceConstants.apiVersion);
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;
    this._config.timeoutInterval = ProvisioningDeviceConstants.defaultTimeoutInterval;

    const responseHandler = (topic: string, payload: any) => {
      let payloadString: string = payload.toString('ascii');
      debug('message received on ' + topic);
      debug(payloadString);

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_010: [ When waiting for responses, `registrationRequest` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_024: [ When waiting for responses, `queryOperationStatus` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
    let match = topic.match(/^\$dps\/registrations\/res\/(.*)\/\?\$rid=(.*)$/);

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_011: [ When waiting for responses, `registrationRequest` shall ignore any messages that don't match the required topic format.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_025: [ When waiting for responses, `queryOperationStatus` shall ignore any messages that don't match the required topic format.] */
    if (!!match && match.length === 3) {
        let status: number = Number(match[1]);
        let rid: string = match[2];
        if (this._operations[rid]) {
          let payloadJson: any = JSON.parse(payloadString);
          let handler = this._operations[rid];
          delete this._operations[rid];
          if (status < 300) {
            handler(null, payloadJson);
          } else {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_012: [ If `registrationRequest` receives a response with status >= 300, it shall consider the request failed and create an error using `translateError`.] */
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_026: [ If `queryOperationStatus` receives a response with status >= 300, it shall consider the query failed and create an error using `translateError`.] */
            handler(translateError('incoming message failure', status, payloadJson, { topic: topic, payload: payloadJson }));
          }
        }
      }
    };

    const errorHandler = (err: Error) => {
      /* tslint:disable:no-empty */
      this._fsm.handle('disconnect', err, () => { });
    };

    this._mqttBase.on('message', responseHandler);
    this._mqttBase.on('error', errorHandler);

    this._fsm = new machina.Fsm({
      namespace: 'provisioning-transport-mqtt',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (err, callback) => {
            if (callback) {
              callback(err);
            } else if (err) {
              this.emit('error', err);
            }
          },
          registrationRequest: (request, callback) => {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_002: [ If the transport is not connected, `registrationRequest` shall connect it and subscribe to the response topic.] */
            this._fsm.handle('connect', request, (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.transition('sendingRegistrationRequest', request, callback);
              }
            });
          },
          queryOperationStatus: (request, operationId, callback) => {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_016: [ If the transport is not connected, `queryOperationStatus` shall connect it and subscribe to the response topic.] */
            this._fsm.handle('connect', request, (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.transition('sendingOperationStatusQuery', request, operationId, callback);
              }
            });
          },
          connect: (request, callback) => this._fsm.transition('connecting', request, callback),
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_030: [ If `cancel` is called while the transport is disconnected, nothing will be done.] */
          disconnect: (err, callback) => callback(err),
          cancel: (callback) => callback()
        },
        connecting: {
          _onEnter: (request, callback) => {
            this._connect(request, (err) => {
              if (err) {
                this._fsm.handle('disconnect', err, callback);
              } else {
                this._fsm.transition('connected', request, null, callback);
              }
            });
          },
          disconnect: (err, callback) => this._fsm.transition('disconnecting', err, callback),
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_031: [ If `cancel` is called while the transport is in the process of connecting, it shall wait until the connection is complete and then disconnect the transport.] */
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (request, result, callback) => {
            if (this._deferredCancelInQueue()) {
              debug('connect operation cancelled');
              callback(new errors.OperationCancelledError());
            } else {
              callback(null, result);
            }
          },
          registrationRequest: (request, callback) => this._fsm.transition('sendingRegistrationRequest', request, callback),
          queryOperationStatus: (request, operationId, callback) => this._fsm.transition('sendingOperationStatusQuery', request, operationId, callback),
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_032: [ If `cancel` is called while the transport is connected and idle, it will disconnect the transport.] */
          cancel: (callback) => this._fsm.handle('disconnect', null, callback),
          disconnect: (err, callback) => this._fsm.transition('disconnecting', err, callback),
          '*': () => this._fsm.deferUntilTransition()
        },
        sendingRegistrationRequest: {
          _onEnter:  (request, callback) => {
            this._sendRegistrationRequest(request, (err, result) => {
              if (err) {
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_005: [ If the publish fails, `registrationRequest` shall disconnect the transport.] */
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_014: [ When `registrationRequest` receives an error from the service, it shall disconnect the transport.] */
                this._fsm.handle('disconnect', err, callback);
              } else {
                this._fsm.transition('connected', request, result, callback);
              }
            });
          },
          cancel: (callback) => this._fsm.handle('disconnect', null, callback),
          disconnect: (err, callback) => this._fsm.transition('disconnecting', err, callback),
          '*': () => this._fsm.deferUntilTransition()
        },
        sendingOperationStatusQuery: {
          _onEnter: (request, operationId, callback) => {
            this._sendOperationStatusQuery(request, operationId, (err, result) => {
              if (err) {
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_028: [ When `queryOperationStatus` receives an error from the service, it shall disconnect the transport.] */
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_019: [ If the publish fails, `queryOperationStatus` shall disconnect the transport.] */
                this._fsm.handle('disconnect', err, callback);
              } else {
                this._fsm.transition('connected', request, result, callback);
              }
            });
          },
          cancel: (callback) => this._fsm.handle('disconnect', null, callback),
          disconnect: (err, callback) => this._fsm.transition('disconnecting', err, callback),
          '*': () => this._fsm.deferUntilTransition()
        },
        disconnecting: {
          _onEnter: (err, callback) => {
            this._disconnect((disconnectErr) => {
              this._fsm.transition('disconnected', err || disconnectErr, callback);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });
    this._fsm.on('transition', (data) => debug('MQTT State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'));
  }

  /**
   * @private
   *
   */
  setTransportOptions(options: ProvisioningTransportOptions): void {

    [
      'pollingInterval',
      'timeoutInterval'
    ].forEach((optionName) => {
      if (options.hasOwnProperty(optionName)) {
        this._config[optionName] = options[optionName];
      }
    });
  }

  /**
   * private
   */
  registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: any, response?: any, pollingInterval?: number) => void): void {

    this._fsm.handle('registrationRequest', request, (err, result) => {
      if (err) {
        callback(err);
      } else {
        callback(null, result, null, this._config.pollingInterval);
      }
    });
  }

  /**
   * private
   */
  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: any, response?: any, pollingInterval?: number) => void): void {

    this._fsm.handle('queryOperationStatus', request, operationId, (err, result) => {
      if (err) {
        callback(err);
      } else {
        callback(null, result, null, this._config.pollingInterval);
      }
    });
  }

  /**
   * @private
   */
  cancel(callback: (err?: Error) => void): void {
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_033: [ If `cancel` is called while the transport is in the middle of a `registrationRequest` operation, it will disconnect the transport and indirectly cause `registrationRequest` call it's `callback` passing an error.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_034: [ If `cancel` is called while the transport is in the middle of a `queryOperationStatus` operation, it will disconnect the transport and indirectly cause `registrationRequest` call it's `callback` passing an error.] */
    this._cancelAllOperations();
    this._fsm.handle('cancel', callback);
  }

  /**
   * @private
   */
  setAuthentication(auth: X509): void {
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_001: [ The certificate and key passed as properties of the `auth` function shall be used to connect to the Device Provisioning Service.] */
    this._auth = auth;
  }

  private _connect(request: RegistrationRequest, callback: (err?: Error) => void): void {

  /* Codes_SRS_NODE_PROVISIONING_MQTT_18_037: [ When connecting, `Mqtt` shall pass in the `X509` certificate that was passed into `setAuthentication` in the base `TransportConfig` object.] */
  /* Codes_SRS_NODE_PROVISIONING_MQTT_18_050: [ When connecting, `Mqtt` shall set `host` in the base `TransportConfig` object to the `provisioningDeviceHost`.] */
  /* Codes_SRS_NODE_PROVISIONING_MQTT_18_035: [ When connecting, `Mqtt` shall set `clientId` in the base `registrationRequest` object to the registrationId.] */
  /* Codes_SRS_NODE_PROVISIONING_MQTT_18_036: [ When connecting, `Mqtt` shall set the `clean` flag in the base `TransportConfig` object to true.] */
  /* Codes_SRS_NODE_PROVISIONING_MQTT_18_038: [ When connecting, `Mqtt` shall set the `username` in the base `TransportConfig` object to '<idScope>/registrations/<registrationId>/api-version=<apiVersion>&clientVersion=<UrlEncode<userAgent>>'.] */
  let baseConfig: MqttBase.TransportConfig = {
      host: request.provisioningHost,
      deviceId: request.registrationId,
      clean: true,
      x509: this._auth,
      username: request.idScope + '/registrations/' + request.registrationId + '/api-version=' + ProvisioningDeviceConstants.apiVersion + '&ClientVersion=' + encodeURIComponent(ProvisioningDeviceConstants.userAgent)
    };

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_039: [ If a uri is specified in the request object, `Mqtt` shall set it in the base `TransportConfig` object.] */
    let uri: string = (<any>request).uri;
    if (uri && uri.indexOf('wss://') === 0) {
      (<any>baseConfig).uri = uri;
    }

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_040: [ When connecting, `Mqtt` shall call `_mqttBase.connect`.] */
    this._mqttBase.connect(baseConfig, (err) => {
      if (err) {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_041: [ If an error is returned from `_mqttBase.connect`, `Mqtt` shell wrap it in a `TransportSpecificError` object and pass it to the caller using `callback`.] */
        debug('connect error: ' + err.toString());
        callback(new errors.TransportSpecificError('connect error', err));
      } else {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_042: [ After connecting the transport, `Mqtt` will subscribe to '$dps/registrations/res/#'  by calling `_mqttBase.subscribe`.] */
        this._mqttBase.subscribe(responseTopic, { qos: 1 }, (err) => {
          if (err) {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_043: [ If an error is returned from _mqttBase.subscribe, `Mqtt` shell wrap it in a `TransportSpecificError` object and pass it to the caller using `callback`.] */
            debug('subscribe error: ' + err.toString());
            callback(new errors.TransportSpecificError('subscribe error',err));
          } else {
            debug('connected and subscribed successfully');
            callback();
          }
        });
      }
    });
  }

  private _disconnect(callback: (err?: Error) => void): void {

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_044: [ When Disconnecting, `Mqtt` shall call _`mqttBase.unsubscribe`.] */
    this._mqttBase.unsubscribe(responseTopic, (unsubscribeError) => {
      if (unsubscribeError) {
        debug('error unsubscribing: ' + unsubscribeError.toString());
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_046: [ If `_mqttBase.unscribe` fails, `Mqtt` shall wrap the error in a `TransportSpecificError` object.] */
        unsubscribeError = new errors.TransportSpecificError('unsubscribe error', unsubscribeError);
      }

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_045: [ When Disconnecting, `Mqtt` shall call `_mqttBase.disconnect`.] */
    this._mqttBase.disconnect((disconnectError) => {
        if (disconnectError) {
          debug('error disconecting: ' + disconnectError.toString());
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_047: [ If `_mqttBase.disconnect` fails, `Mqtt` shall wrap the error in a `TransportSpecificError` object.] */
          disconnectError = new errors.TransportSpecificError('disconnect error', disconnectError);
        }
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_048: [ If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error.] */
        callback(disconnectError || unsubscribeError);
      });

    });
  }

  private _sendRegistrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: any) => void): void {
    let rid: string  = uuid.v4();

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_006: [ `registrationRequest` shall wait for a response with a matching rid.] */
    this._operations[rid] = (err, result) => {
      delete this._operations[rid];
      if (err) {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_015: [ When `registrationRequest` receives an error from the service, it shall call `callback` passing in the error.] */
        callback(err);
      } else {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_013: [ When `registrationRequest` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
        callback(null, result);
      }
    };

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_003: [ `registrationRequest` shall publish to '$dps/registrations/PUT/iotdps-register/?$rid<rid>'.] */
    this._mqttBase.publish('$dps/registrations/PUT/iotdps-register/?$rid=' + rid, ' ', { qos: 1 } , (err) => {
      /* Codes_SRS_NODE_PROVISIONING_MQTT_18_004: [ If the publish fails, `registrationRequest` shall wrap the error in a `TransportSpecificError` and call `callback` passing the wrapped error back.] */
      if (err) {
        delete this._operations[rid];
        callback(new errors.TransportSpecificError('publish error', err));
      }
    });

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_007: [ `registrationRequest` shall wait for a response for `timeoutInterval` milliseconds.  After that shall be considered a timeout.] */
    this._setTimeoutTimer(rid, callback);
  }

  private _sendOperationStatusQuery(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: any) => void): void {
    let rid: string  = uuid.v4();

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_020: [ `queryOperationStatus` shall wait for a response with a matching rid.] */
    this._operations[rid] = (err, result) => {
      delete this._operations[rid];
      if (err) {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_029: [ When `queryOperationStatus` receives an error from the service, it shall call `callback` passing in the error.] */
        callback(err);
      } else {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_027: [ When `queryOperationStatus` receives a successful response from the service, it shall call callback passing in null and the response.] */
        callback(null, result);
      }
    };

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_017: [ `queryOperationStatus` shall publish to $dps/registrations/GET/iotdps-get-operationstatus/?$rid=<rid>&operationId=<operationId>.] */
    this._mqttBase.publish('$dps/registrations/GET/iotdps-get-operationstatus/?$rid=' + rid + '&operationId=' + operationId, ' ', { qos: 1 }, (err) => {
      if (err) {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_018: [ If the publish fails, `queryOperationStatus` shall wrap the error in a `TransportSpecificError` and call callback passing the wrapped error back.] */
        delete this._operations[rid];
        callback(new errors.TransportSpecificError('publish error', err));
      }
    });

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_021: [ `queryOperationStatus` shall wait for a response for `timeoutInterval` milliseconds.  After that shall be considered a timeout.] */
    this._setTimeoutTimer(rid, callback);
  }

  private _setTimeoutTimer(rid: string, cancelledOperationCallback: (err?: Error, result?: any) => void): void {

    setTimeout(() => {
      if (!!this._operations[rid]) {
        debug('timeout on rid ' + rid + ': cancelling');
        delete this._operations[rid];
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_008: [ When `registrationRequest` times out, it shall disconnect the transport.] */
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_022: [ When `queryOperationStatus` times out, it shall disconnect the transport.] */
        this.cancel((err) => {
          debug('cancel complete');
          if (err) {
            debug('error cancelling: ' + err.toString());
          }
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_009: [ When `registrationRequest` times out, it shall call callback passing in a ServiceUnavailableError.] */
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_023: [ When `queryOperationStatus` times out, it shall call callback passing in a ServiceUnavailableError.] */
          cancelledOperationCallback(new errors.ServiceUnavailableError('timeout waiting for response from provisioning service'));
        });
      }
    }, this._config.timeoutInterval);
  }

  private _deferredCancelInQueue(): boolean {
    for (let i = 0; i < this._fsm.inputQueue.length; i++) {
      if (this._fsm.inputQueue[0].args.length > 0 && this._fsm.inputQueue[0].args[0].inputType === 'cancel') {
        return true;
      }
    }
    return false;
  }

  private _cancelAllOperations(): void {
    for (let op in this._operations) {
      debug('cancelling ' + op);
      let callback = this._operations[op];
      delete this._operations[op];
      process.nextTick(callback, new errors.OperationCancelledError());
    }
  }
}



