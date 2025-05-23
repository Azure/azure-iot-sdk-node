// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';
import * as machina from 'machina';
import * as dbg from 'debug';
import * as queryString from 'querystring';
const debug = dbg('azure-iot-provisioning-device-mqtt:Mqtt');
const debugErrors = dbg('azure-iot-provisioning-device-mqtt:Mqtt:Errors');

import { MqttBase, MqttBaseTransportConfig } from 'azure-iot-mqtt-base';
import { errors, X509 } from 'azure-iot-common';
import { X509ProvisioningTransport, SymmetricKeyProvisioningTransport } from 'azure-iot-provisioning-device';
import { ProvisioningDeviceConstants, ProvisioningTransportOptions } from 'azure-iot-provisioning-device';
import { DeviceRegistration, RegistrationRequest, DeviceRegistrationResult } from 'azure-iot-provisioning-device';
import { translateError } from 'azure-iot-provisioning-device';


/**
 * Topic to subscribe to for responses
 */
const responseTopic: string = '$dps/registrations/res/#';

/**
 * Transport used to provision a device over MQTT.
 */
export class Mqtt extends EventEmitter implements X509ProvisioningTransport, SymmetricKeyProvisioningTransport {
  private _mqttBase: MqttBase;
  private _config: ProvisioningTransportOptions = {};
  private _fsm: machina.Fsm;
  private _auth: X509;
  private _sas: string;
  private _subscribed: boolean;

  private _operations: {
    [key: string]: {
      handler: (err?: Error, payload?: any, pollingInterval?: number) => void,
      statusString: string,
      operationId?: string
    };
  } = {};

  /**
   * @private
   */
  constructor(mqttBase?: MqttBase) {
    super();
    this._mqttBase = mqttBase || new MqttBase();
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;

    const responseHandler = (topic: string, payload: any) => {
      let payloadString: string = payload.toString('ascii');
      debug('message received on ' + topic);
      debug('request payload is: ' + payloadString);

      /* Codes_SRS_NODE_PROVISIONING_MQTT_18_010: [ When waiting for responses, `registrationRequest` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
      /* Codes_SRS_NODE_PROVISIONING_MQTT_18_024: [ When waiting for responses, `queryOperationStatus` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
      let match = topic.match(/^\$dps\/registrations\/res\/(.*)\/\?(.*)$/);

      if (!!match && match.length === 3) {
        let queryParameters = queryString.parse(match[2]);
        if (queryParameters.$rid) {
          let rid: string = queryParameters.$rid as string;
          if (this._operations[rid]) {
            let status: number = Number(match[1]);
            let payloadJson: any = JSON.parse(payloadString);
            let handler = this._operations[rid].handler;
            let statusString = this._operations[rid].statusString;
            let operationId = this._operations[rid].operationId;
            let retryAfterInMilliseconds: number = this._config.pollingInterval;
            const retryParameter = 'retry-after';
            /* Codes_SRS_NODE_PROVISIONING_MQTT_06_005: [ If the response to the `queryOperationStatus` contains a query parameter of `retry-after` that value * 1000 shall be the value of `callback` `pollingInterval` argument, otherwise default.] */
            /* Codes_SRS_NODE_PROVISIONING_MQTT_06_006: [ If the response to the `registrationRequest` contains a query parameter of `retry-after` that value * 1000 shall be the value of `callback` `pollingInterval` argument, otherwise default.] */
            if (queryParameters[retryParameter]) {
              retryAfterInMilliseconds = Number(queryParameters[retryParameter]) * 1000;
            }
            delete this._operations[rid];
            if (status < 300) {
              /* Codes_SRS_NODE_PROVISIONING_MQTT_18_013: [ When `registrationRequest` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
              /* Codes_SRS_NODE_PROVISIONING_MQTT_18_027: [ When `queryOperationStatus` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
              handler(null, payloadJson, retryAfterInMilliseconds);
            } else if (status >= 429) {
              /*Codes_SRS_NODE_PROVISIONING_MQTT_06_003: [ When `registrationRequest` receives a response with status >429, it shall invoke `callback` with a result object containing property `status` with a value `registering` and no `operationId` property.] */
              /*Codes_SRS_NODE_PROVISIONING_MQTT_06_004: [ When `queryOperationStatus` receives a response with status >429, it shall invoke `callback` with a result object containing property `status` with a value `assigning` and `operationId` property with value of the passed to the request.] */
              handler(null, {status: statusString, operationId: operationId}, retryAfterInMilliseconds);
            } else {
              /* Codes_SRS_NODE_PROVISIONING_MQTT_18_012: [ If `registrationRequest` receives a response with status >= 300 and <429, it shall consider the request failed and create an error using `translateError`.] */
              /* Codes_SRS_NODE_PROVISIONING_MQTT_18_015: [ When `registrationRequest` receives an error from the service, it shall call `callback` passing in the error.] */
              /* Codes_SRS_NODE_PROVISIONING_MQTT_18_026: [ If `queryOperationStatus` receives a response with status >= 300 and <429, it shall consider the query failed and create an error using `translateError`.] */
              /* Codes_SRS_NODE_PROVISIONING_MQTT_18_029: [ When `queryOperationStatus` receives an error from the service, it shall call `callback` passing in the error.] */
              handler(translateError('incoming message failure', status, payloadJson, { topic: topic, payload: payloadJson }));
            }
          } else {
            debug('received an unknown request id: ' + rid + ' topic: ' + topic);
          }
        } else {
          debug('received message with no request id. Topic is: ' + topic);
        }
      } else {
        debug('received a topic string with insufficient content: ' + topic);
      }
    };

    const errorHandler = (err: Error) => {
      this._fsm.handle('disconnect', err);
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
          registrationRequest: (request, rid, callback) => {
            this._operations[rid] = {handler: callback, statusString: 'registering'};
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_002: [ If the transport is not connected, `registrationRequest` shall connect it and subscribe to the response topic.] */
            this._fsm.handle('connect', request, (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('registrationRequest', request, rid, callback);
              }
            });
          },
          queryOperationStatus: (request, rid, operationId, callback) => {
            this._operations[rid] = {handler: callback, statusString: 'assigning', operationId: operationId};
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_016: [ If the transport is not connected, `queryOperationStatus` shall connect it and subscribe to the response topic.] */
            this._fsm.handle('connect', request, (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('queryOperationStatus', request, rid, operationId, callback);
              }
            });
          },
          connect: (request, callback) => this._fsm.transition('connecting', request, callback),
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_052: [ If `disconnect` is called while the transport is disconnected, it will call `callback` immediately. ] */
          disconnect: (err, callback) => callback(err),
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_030: [ If `cancel` is called while the transport is disconnected, it will call `callback` immediately.] */
          cancel: (callback) => callback()
        },
        connecting: {
          _onEnter: (request, callback) => {
            this._connect(request, (err) => {
              if (err) {
                /* Codes_SRS_NODE_PROVISIONING_MQTT_18_051: [ If either `_mqttBase.connect` or `_mqttBase.subscribe` fails, `mqtt` will disconnect the transport. ] */
                this._fsm.transition('disconnecting', err, callback);
              } else {
                this._fsm.transition('connected', null, request, null, callback);
              }
            });
          },
          cancel: (callback) => {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_062: [ If `cancel` is called while the transport is in the process of connecting, it shell disconnect transport and cancel the operation that initiated the connection. ] */
            this._cancelAllOperations();
            this._fsm.transition('disconnecting', null, callback);
          },
          disconnect: (err, callback) => {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_061: [ If `disconnect` is called while the transport is in the process of connecting, it shell disconnect connection and cancel the operation that initiated the connection. ] */
            this._cancelAllOperations();
            this._fsm.transition('disconnecting', err, callback);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (err, request, result, callback) => callback(err, result, request),
          registrationRequest: (request, rid, callback) => {
            this._operations[rid] = {handler: callback, statusString: 'registering'};
            this._sendRegistrationRequest(request, rid, (err, result) => {
              callback(err, result, request);
            });
          },
          queryOperationStatus: (request, rid, operationId, callback) => {
            this._operations[rid] = {handler: callback, statusString: 'assigning', operationId: operationId};
            this._sendOperationStatusQuery(request, rid, operationId, (err, result) => {
              callback(err, result, request);
            });
          },
          cancel: (callback) => {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_032: [ If `cancel` is called while the transport is connected and idle, it will call `callback` immediately.] */
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_033: [ If `cancel` is called while the transport is in the middle of a `registrationRequest` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error.] */
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_034: [ If `cancel` is called while the transport is in the middle of a `queryOperationStatus` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error.] */
            this._cancelAllOperations();
            callback();
          },
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_054: [ If `disconnect` is called while the transport is connected and idle, it shall disconnect. ] */
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_055: [ If `disconnect` is called while the transport is in the middle of a `registrationRequest` operation, it shall cancel the `registrationRequest` operation and disconnect the transport. ] */
          /* Codes_SRS_NODE_PROVISIONING_MQTT_18_056: [ If `disconnect` is called while the transport is in the middle of a `queryOperationStatus` operation, it shall cancel the `queryOperationStatus` operation and disconnect the transport. ] */
          disconnect: (err, callback) => {
            this._cancelAllOperations();
            this._fsm.transition('disconnecting', err, callback);
          }
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
    ].forEach((optionName) => {
      if (options.hasOwnProperty(optionName)) {
        this._config[optionName] = options[optionName];
      }
    });
  }

  /**
   * @private
   */
  registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void {
    let rid = randomUUID();
    debug('registration request given id of: ' + rid);
    this._fsm.handle('registrationRequest', request, rid, (err, result, pollingInterval) => {
      if (err) {
        callback(err);
      } else {
        callback(null, result, null, pollingInterval);
      }
    });
  }

  /**
   * @private
   */
  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void {
    let rid = randomUUID();
    debug('query operation request given id of: ' + rid);
    this._fsm.handle('queryOperationStatus', request, rid, operationId, (err, result, pollingInterval) => {
      if (err) {
        callback(err);
      } else {
        callback(null, result, null, pollingInterval);
      }
    });
  }

  /**
   * @private
   */
  cancel(callback: (err?: Error) => void): void {
    this._fsm.handle('cancel', callback);
  }

  /**
   * @private
   */
  disconnect(callback: (err?: Error) => void): void {
    this._fsm.handle('disconnect', null, callback);
  }

  /**
   * @private
   */
  setAuthentication(auth: X509): void {
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_001: [ The certificate and key passed as properties of the `auth` function shall be used to connect to the Device Provisioning Service.] */
    this._auth = auth;
  }

  /**
   * @private
   */
  setSharedAccessSignature(sas: string): void {
    this._sas = sas;
  }

  protected _getConnectionUri(request: RegistrationRequest): string {
    return 'mqtts://' + request.provisioningHost;
  }

  private _connect(request: RegistrationRequest, callback: (err?: Error) => void): void {

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_037: [ When connecting, `Mqtt` shall pass in the `X509` certificate that was passed into `setAuthentication` in the base `TransportConfig` object.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_050: [ When connecting, `Mqtt` shall set `uri` in the base `TransportConfig` object to the 'mqtts://' + `provisioningDeviceHost`.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_035: [ When connecting, `Mqtt` shall set `clientId` in the base `registrationRequest` object to the registrationId.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_036: [ When connecting, `Mqtt` shall set the `clean` flag in the base `TransportConfig` object to true.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_038: [ When connecting, `Mqtt` shall set the `username` in the base `TransportConfig` object to '<idScope>/registrations/<registrationId>/api-version=<apiVersion>&clientVersion=<UrlEncode<userAgent>>'.] */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_039: [ If a uri is specified in the request object, `Mqtt` shall set it in the base `TransportConfig` object.] */
    let baseConfig: MqttBaseTransportConfig = {
      clientId: request.registrationId,
      clean: true,
      x509: this._auth,
      sharedAccessSignature: this._sas,
      username: request.idScope + '/registrations/' + request.registrationId + '/api-version=' + ProvisioningDeviceConstants.apiVersion + '&ClientVersion=' + encodeURIComponent(ProvisioningDeviceConstants.userAgent),
      uri: this._getConnectionUri(request)
    };

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_040: [ When connecting, `Mqtt` shall call `_mqttBase.connect`.] */
    this._mqttBase.connect(baseConfig, (err) => {
      if (err) {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_041: [ If an error is returned from `_mqttBase.connect`, `Mqtt` shall call `callback` passing in the error.] */
        debugErrors('connect error: ' + err);
        callback(err);
      } else {
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_042: [ After connecting the transport, `Mqtt` will subscribe to '$dps/registrations/res/#'  by calling `_mqttBase.subscribe`.] */
        this._mqttBase.subscribe(responseTopic, { qos: 1 }, (err) => {
          if (err) {
            /* Codes_SRS_NODE_PROVISIONING_MQTT_18_043: [ If an error is returned from _mqttBase.subscribe, `Mqtt` shall call `callback` passing in the error.] */
            debugErrors('subscribe error: ' + err);
            callback(err);
          } else {
            this._subscribed = true;
            debug('connected and subscribed successfully');
            callback();
          }
        });
      }
    });
  }

  private _disconnect(callback: (err?: Error) => void): void {

    let disconnect = (unsubscribeError?) => {
      debug('call disconnect on _mqttBase');
      /* Codes_SRS_NODE_PROVISIONING_MQTT_18_045: [ When Disconnecting, `Mqtt` shall call `_mqttBase.disconnect`.] */
      this._mqttBase.disconnect((disconnectError) => {
        if (disconnectError) {
          debugErrors('error disconnecting: ' + disconnectError);
        }
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_048: [ If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error.] */
        callback(disconnectError || unsubscribeError);
      });
    };

    if (this._subscribed) {
      debug('unsubscribing on _disconnect');
      /* Codes_SRS_NODE_PROVISIONING_MQTT_18_044: [ When Disconnecting, `Mqtt` shall call _`mqttBase.unsubscribe`.] */
      this._mqttBase.unsubscribe(responseTopic, (unsubscribeError) => {
        debug('unsubscribed');
        this._subscribed = false;
        if (unsubscribeError) {
          debugErrors('error unsubscribing: ' + unsubscribeError);
        }
        disconnect(unsubscribeError);
      });
    } else {
      disconnect();
    }
  }

  private _sendRegistrationRequest(request: RegistrationRequest, rid: string, callback: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_PROVISIONING_MQTT_06_001: [The `registrationRequest` will send a body in the message which contains a stringified JSON object with a `registrationId` property.] */
    let requestBody: DeviceRegistration = { registrationId : request.registrationId };

    /*Codes_SRS_NODE_PROVISIONING_MQTT_06_002: [The `registrationRequest` will, if utilizing custom allocation data, send a `payload` property in the JSON body.] */
    if (request.payload) {
      requestBody.payload = request.payload;
    }
    debug('registration publish: ' + '$dps/registrations/PUT/iotdps-register/?$rid=' + rid + ' body: ' + JSON.stringify(requestBody));
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_003: [ `registrationRequest` shall publish to '$dps/registrations/PUT/iotdps-register/?$rid<rid>'.] */
    this._mqttBase.publish('$dps/registrations/PUT/iotdps-register/?$rid=' + rid, JSON.stringify(requestBody), { qos: 1 } , (err) => {
      /* Codes_SRS_NODE_PROVISIONING_MQTT_18_004: [ If the publish fails, `registrationRequest` shall call `callback` passing in the error.] */
      if (err) {
        debugErrors('received an error from the registration publish: ' + err);
        delete this._operations[rid];
        callback(err);
      }
    });
 }

  private _sendOperationStatusQuery(_request: RegistrationRequest, rid: string, operationId: string, callback: (err?: Error, result?: any) => void): void {
    debug('operationStatus publish ' + '$dps/registrations/GET/iotdps-get-operationstatus/?$rid=' + rid + '&operationId=' + operationId);
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_017: [ `queryOperationStatus` shall publish to $dps/registrations/GET/iotdps-get-operationstatus/?$rid=<rid>&operationId=<operationId>.] */
    this._mqttBase.publish('$dps/registrations/GET/iotdps-get-operationstatus/?$rid=' + rid + '&operationId=' + operationId, ' ', { qos: 1 }, (err) => {
      if (err) {
        debugErrors('received an error from the operationStatus publish: ' + err);
        /* Codes_SRS_NODE_PROVISIONING_MQTT_18_018: [ If the publish fails, `queryOperationStatus` shall call `callback` passing in the error */
        delete this._operations[rid];
        callback(err);
      }
    });
  }

  /**
   * @private
   */
  private _cancelAllOperations(): void {
    for (let op in this._operations) {
      debug('cancelling ' + op);
      let callback = this._operations[op].handler;
      delete this._operations[op];
      process.nextTick(() => {
        callback(new errors.OperationCancelledError());
      });
    }
  }
}
