// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import * as dbg from 'debug';
const debug = dbg('azure-iot-mqtt-base:translateError');
import { errors } from 'azure-iot-common';

/**
 * @method          module:azure-iot-mqtt-base.translateError
 * @description     Convert an error returned by MQTT.js into a transport-agnistic error.
 *
 * @param {Object}        mqttError the error returned by the MQTT.js library
 * @return {Object}   transport-agnostic error object
 */

/* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_001: [** Any error object returned by `translateError` shall inherit from the generic `Error` Javascript object and have 2 properties:
- `message` shall contain a human-readable error message
- `transportError` shall contain the MQTT error object **]** */
/**
 * @private
 */
export class MqttTransportError extends Error {
  transportError?: Error;
}

/**
 * @private
 */
export function translateError(mqttError: Error): MqttTransportError {
  let err: MqttTransportError;

  debug('translating: ' + mqttError.toString());
  if ((<any>mqttError).code) {
    // the 'code' property denotes a socket-level error (ENOTFOUND, EAI_AGAIN, etc)
    /*Codes_SRS_NODE_DEVICE_MQTT_ERRORS_16_001: [`translateError` shall return a `NotConnectedError` if the error object has a truthy `code` property (node socket errors)]*/
    err = new errors.NotConnectedError(mqttError.message);
  } else if (mqttError.message) {
    if (mqttError.message.indexOf('premature close') > -1) {
      // comes from end-of-stream which is a dependency of mqtt.js
      /*Codes_SRS_NODE_DEVICE_MQTT_ERRORS_16_002: [`translateError` shall return a `NotConnectedError` if the error message contains 'premature close' (from `end-of-stream`)]*/
      err = new errors.NotConnectedError(mqttError.message);
    } else if (mqttError.message.indexOf('client disconnecting') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_002: [** `translateError` shall return a `NotConnectedError` if the MQTT error message contains the string 'client disconnecting' **]** */
      err = new errors.NotConnectedError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('Invalid topic') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_003: [** `translateError` shall return a `FormatError` if the MQTT error message contains the string 'Invalid topic' **]** */
      err = new errors.FormatError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('No connection to broker') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_004: [** `translateError` shall return a `NotConnectedError` if the MQTT error message contains the string 'No connection to broker' **]** */
      err = new errors.NotConnectedError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('Unacceptable protocol version') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_005: [** `translateError` shall return a `NotImplementedError` if the MQTT error message contains the string 'Unacceptable protocol version' **]** */
      err = new errors.NotImplementedError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('Identifier rejected') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_006: [** `translateError` shall return a `UnauthorizedError` if the MQTT error message contains the string 'Identifier rejected' **]** */
      err = new errors.UnauthorizedError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('Server unavailable' ) > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_007: [** `translateError` shall return a `ServiceUnavailableError` if the MQTT error message contains the string 'Server unavailable' **]** */
      err = new errors.ServiceUnavailableError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('Bad username or password') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_008: [** `translateError` shall return a `UnauthorizedError` if the MQTT error message contains the string 'Bad username or password' **]** */
      err = new errors.UnauthorizedError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('Not authorized') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_009: [** `translateError` shall return a `UnauthorizedError` if the MQTT error message contains the string 'Not authorized' **]** */
      err = new errors.UnauthorizedError('mqtt.js returned ' + mqttError.message + ' error');
    } else if (mqttError.message.indexOf('unrecognized packet type') > -1) {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_010: [** `translateError` shall return a `InternalServerError` if the MQTT error message contains the string 'unrecognized packet type' **]** */
      err = new errors.InternalServerError('mqtt.js returned ' + mqttError.message + ' error');
    } else {
      /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_011: [** `translateError` shall return an `Error` if none of the other string rules match **]** */
      err = mqttError;
    }
  } else {
    /* Codes_SRS_NODE_DEVICE_MQTT_ERRORS_18_011: [** `translateError` shall return an `Error` if none of the other string rules match **]** */
    err = mqttError;
  }

  err.transportError = mqttError;
  return err;
}
