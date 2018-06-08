// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';

import { results, Message, AuthenticationProvider, RetryPolicy, errors } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { DeviceClientOptions } from './interfaces';
import { Twin  } from './twin';

/**
 * IoT Hub device client used to connect a device with an Azure IoT hub.
 *
 * Users of the SDK should call one of the factory methods,
 * {@link azure-iot-device.Client.fromConnectionString|fromConnectionString}
 * or {@link azure-iot-device.Client.fromSharedAccessSignature|fromSharedAccessSignature}
 * to create an IoT Hub device client.
 */
export class ModuleClient extends EventEmitter {
  private _internalClient: InternalClient;

  /**
   * @constructor
   * @param {Object}  transport         An object that implements the interface
   *                                    expected of a transport object, e.g.,
   *                                    {@link azure-iot-device-http.Http|Http}.
   * @param {string}  connStr           A connection string (optional: when not provided, updateSharedAccessSignature must be called to set the SharedAccessSignature token directly).
   */
  constructor(transport: DeviceTransport, connStr?: string) {
    super();
    this._internalClient = new InternalClient(transport, connStr);

    this.on('newListener', (event, listener) => {
      if (event === 'message') {
        throw new errors.ArgumentError('The ModuleClient object does not support \'message\' events.  You need to use a Client object for that');
      }
      this._internalClient.on(event, listener);
    });

    this.on('removeListener', (event, listener) => {
      this._internalClient.removeListener(event, listener);
    });
  }

  /**
   * @description       Registers the `callback` to be invoked when a
   *                    cloud-to-device method call is received by the client
   *                    for the given `methodName`.
   *
   * @param {String}   methodName   The name of the method for which the callback
   *                                is to be registered.
   * @param {Function} callback     The callback to be invoked when the C2D method
   *                                call is received.
   *
   * @throws {ReferenceError}       If the `methodName` or `callback` parameter
   *                                is falsy.
   * @throws {TypeError}            If the `methodName` parameter is not a string
   *                                or if the `callback` is not a function.
   */
  onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void {
    this._internalClient.onDeviceMethod(methodName, callback);
  }

  /**
   * @description       Updates the Shared Access Signature token used by the transport to authenticate with the IoT Hub service.
   *
   * @param {String}   sharedAccessSignature   The new SAS token to use.
   * @param {Function} done       The callback to be invoked when `updateSharedAccessSignature`
   *                              completes execution.
   *
   * @throws {ReferenceError}     If the sharedAccessSignature parameter is falsy.
   * @throws {ReferenceError}     If the client uses x509 authentication.
   */
  updateSharedAccessSignature(sharedAccessSignature: string, updateSasCallback?: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void {
    this._internalClient.updateSharedAccessSignature(sharedAccessSignature, updateSasCallback);
  }

  /**
   * @description       Call the transport layer CONNECT function if the
   *                    transport layer implements it
   *
   * @param {Function} openCallback  The callback to be invoked when `open`
   *                                 completes execution.
   */
  open(openCallback: (err?: Error, result?: results.Connected) => void): void {
    this._internalClient.open(openCallback);
  }

  /**
   * @description      The `close` method directs the transport to close the current connection to the IoT Hub instance
   *
   * @param {Function} closeCallback    The callback to be invoked when the connection has been closed.
   */
  close(closeCallback?: (err?: Error, result?: results.Disconnected) => void): void {
    this._internalClient.close(closeCallback);
  }

  /**
   * @description     The `setOptions` method let the user configure the client.
   *
   * @param  {Object}    options  The options structure
   * @param  {Function}  done     The callback that shall be called when setOptions is finished.
   *
   * @throws {ReferenceError}     If the options structure is falsy
   */
  setOptions(options: DeviceClientOptions, done?: (err?: Error, result?: results.TransportConfigured) => void): void {
    this._internalClient.setOptions(options, done);
  }

  /**
   * @description      The `complete` method directs the transport to settle the message passed as argument as 'completed'.
   *
   * @param {Message}  message           The message to settle.
   * @param {Function} completeCallback  The callback to call when the message is completed.
   *
   * @throws {ReferenceError} If the message is falsy.
   */
  complete(message: Message, completeCallback: (err?: Error, result?: results.MessageCompleted) => void): void {
    this._internalClient.complete(message, completeCallback);
  }

  /**
   * @description      The `reject` method directs the transport to settle the message passed as argument as 'rejected'.
   *
   * @param {Message}  message         The message to settle.
   * @param {Function} rejectCallback  The callback to call when the message is rejected.
   *
   * @throws {ReferenceException} If the message is falsy.
   */
  reject(message: Message, rejectCallback: (err?: Error, result?: results.MessageRejected) => void): void {
    this._internalClient.reject(message, rejectCallback);
  }

  /**
   * @description      The `abandon` method directs the transport to settle the message passed as argument as 'abandoned'.
   *
   * @param {Message}  message          The message to settle.
   * @param {Function} abandonCallback  The callback to call when the message is abandoned.
   *
   * @throws {ReferenceException} If the message is falsy.
   */
  abandon(message: Message, abandonCallback: (err?: Error, result?: results.MessageAbandoned) => void): void {
    this._internalClient.abandon(message, abandonCallback);
  }

  /**
   * @description      The `getTwin` method creates a Twin object and establishes a connection with the Twin service.
   *
   * @param {Function} done             The callback to call when the connection is established.
   *
   */
  getTwin(done: (err?: Error, twin?: Twin) => void): void {
    this._internalClient.getTwin(done);
  }

  /**
   * Sets the retry policy used by the client on all operations. The default is {@link azure-iot-common.ExponentialBackoffWithJitter|ExponentialBackoffWithJitter}.
   * @param policy {RetryPolicy}  The retry policy that should be used for all future operations.
   */
  setRetryPolicy(policy: RetryPolicy): void {
    this._internalClient.setRetryPolicy(policy);
  }

  /**
   * Sends an event to the given module output
   * @param outputName Name of the output to send the event to
   * @param message Message to send to the given output
   * @param callback Function to call when the operation has been queued.
   */
  sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void {
    this._internalClient.sendOutputEvent(outputName, message, callback);
  }

  /**
   * Sends an array of events to the given module output
   * @param outputName Name of the output to send the events to
   * @param message Messages to send to the given output
   * @param callback Function to call when the operations have been queued.
   */
  sendOutputEventBatch(outputName: string, messages: Message[], callback: (err?: Error, result?: results.MessageEnqueued) => void): void {
    this._internalClient.sendOutputEventBatch(outputName, messages, callback);
  }

  /**
   * @description       Creates an IoT Hub device client from the given
   *                    connection string using the given transport type.
   *
   * @param {String}    connStr       A connection string which encapsulates "device
   *                                  connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @throws {ReferenceError}         If the connStr parameter is falsy.
   *
   */
  static fromConnectionString(connStr: string, transportCtor: any): ModuleClient {
    return InternalClient.fromConnectionString(connStr, transportCtor, ModuleClient) as ModuleClient;
  }

  /**
   * @description       Creates an IoT Hub device client from the given
   *                    shared access signature using the given transport type.
   *
   * @param {String}    sharedAccessSignature      A shared access signature which encapsulates "device
   *                                  connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @throws {ReferenceError}         If the connStr parameter is falsy.
   *
   */
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): ModuleClient {
    return InternalClient.fromSharedAccessSignature(sharedAccessSignature, transportCtor, ModuleClient) as ModuleClient;
  }

  /**
   * @description                   Creates an IoT Hub device client from the given authentication method and using the given transport type.
   * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
   * @param transportCtor           Transport protocol used to connect to IoT hub.
   */
  static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any): ModuleClient {
    return InternalClient.fromAuthenticationProvider(authenticationProvider, transportCtor, ModuleClient) as ModuleClient;
  }

  /**
   * @description         Creates an IoT Hub device client by using configuration
   *                      information from the environment. If an environment
   *                      variable called `EdgeHubConnectionString` or `IotHubConnectionString`
   *                      exists, then that value is used and behavior is identical
   *                      to calling `fromConnectionString` passing that in. If
   *                      those environment variables do not exist then the following
   *                      variables MUST be defined:
   *                          IOTEDGE_WORKLOADURI        - URI for iotedged's workload API
   *                          IOTEDGE_DEVICEID           - Device identifier
   *                          IOTEDGE_MODULEID           - Module identifier
   *                          IOTEDGE_MODULEGENERATIONID - Module generation identifier
   *                          IOTEDGE_IOTHUBHOSTNAME     - IoT Hub host name
   *                          IOTEDGE_AUTHSCHEME         - Authentication scheme to use;
   *                                                       must be "SasToken"
   * @param transportCtor Transport protocol used to connect to IoT hub.
   */
  static fromEnvironment(transportCtor: any): ModuleClient {
    return InternalClient.fromEnvironment(transportCtor, ModuleClient) as ModuleClient;
  }
}
