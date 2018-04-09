// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { X509 } from 'azure-iot-common';
import { Agent } from 'https';

/**
 *
 * Options which are specific to the AMQP transport.
 *
 * This is passed into {@link Client.setOptions} as a property named `http` inside of an {@link DeviceClientOptions} object.
 *
 * @see {Client.setOptions}
 * @see {DeviceClientOptions}
 */
export interface AmqpTransportOptions {
}

/**
 * Options structure used to configure how often the HTTP receiver polls for messages.
 * Each of these options is mutually exclusive, except for the `drain` boolean. Only one `interval`, `at`, `cron` or `manualPolling` shall be present in the options structure.
 *
 * This is configured by calling {@link Client.setOptions} with this as a property named `receivePolicy` inside of an {@link HttpTransportOptions} object which is inside of an {@link DeviceClientOptions} object.
 *
 * @see {Client.setOptions}
 * @see {DeviceClientOptions}
 */
export interface HttpReceiverOptions {
  /**
   * Interval **in seconds** at which the Azure IoT hub is going to be polled.
   */
  interval?: number;
  /**
   * Use this option to configure the receiver to receive only once at a specific time.
   */
  at?: Date;
  /**
   * Use a cron-formatted string
   */
  cron?: string;
  /**
   * Does not poll and instead rely on the user calling the `receive` method.
   */
  manualPolling?: boolean;
  /**
   * Boolean indicating whether only one message should be received all messages should be drained.
   */
  drain?: boolean;
}


/**
 * Options structure for passing optional configuration parameters into the Http Transport.
 *
 * This is passed into {@link Client.setOptions} as a property named `http` inside of an {@link DeviceClientOptions} object.
 *
 * @see {Client.setOptions}
 * @see {DeviceClientOptions}
 */
export interface HttpTransportOptions {
  /**
   * Optional [Agent]{@link https://nodejs.org/api/https.html#https_class_https_agent} object to use with the Http connection
   */
  agent?: Agent;

  /**
   * Optional configuration parameters to use for receive polling.
   */
  receivePolicy?: HttpReceiverOptions;
}

/**
 * Options which are specific to the MQTT transport
 *
 * This is passed into {@link Client.setOptions} as a property named `mqtt` inside of an {@link DeviceClientOptions} object.
 */
export interface MqttTransportOptions {
  /**
   * Optional [Agent]{@link https://nodejs.org/api/https.html#https_class_https_agent} object to use with MQTT-WS connections
   */
  webSocketAgent?: Agent;

}

/**
 * Options for the Client object.  Passed into the {@link Client.setOptions} function.
 *
 * @extends {azure-iot-common.X509}
 * @see {Client.setOptions}
 *
 * @example
 * ``` js
 *  var options = {
 *    cert: myX509Certificate,
 *    key: myX509Key,
 *    http: {
 *      receivePolicy: {
 *        interval: 10
 *      }
 *    }
 *  }
 *  client.setOptions(options, callback);
 * ```
 */
export interface DeviceClientOptions extends X509 {
  /**
   * Public certificate in PEM form for certificate authority being used by the Hub service.  This is the CA that the hub is using
   * to secure TLS connections and the client validates the connection using this public cert in order to validate the identity of
   * the hub.  If you are connecting to an Azure IoT Hub inside of an Azure data center, you do not need to set this.  If you are
   * connecting to some other hub (e.g. an Edge Hub), then you may need to set this to the server cert that the hub uses for TLS.
   */
  ca?: string;

  /**
   * Optional object with options specific to the Mqtt transport
   */
  mqtt?: MqttTransportOptions;

  /**
   * Optional object with options specific to the Mqtt transport
   */
  http?: HttpTransportOptions;

  /**
   * Optional object with options specific to the Mqtt transport
   */
  amqp?: AmqpTransportOptions;
}
