// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';

import { results, Message, AuthenticationProvider, RetryPolicy, errors } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { DeviceClientOptions } from './interfaces';
import { Twin  } from './twin';
import { IotEdgeAuthenticationProvider } from './iotedge_authentication_provider';

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

  static validateEnvironment(): ReferenceError {
    // Codes_SRS_NODE_MODULE_CLIENT_13_029: [ If environment variables EdgeHubConnectionString and IotHubConnectionString do not exist then the following environment variables must be defined: IOTEDGE_WORKLOADURI, IOTEDGE_DEVICEID, IOTEDGE_MODULEID, IOTEDGE_IOTHUBHOSTNAME, IOTEDGE_AUTHSCHEME and IOTEDGE_MODULEGENERATIONID. ]

    const keys = [
      'IOTEDGE_WORKLOADURI',
      'IOTEDGE_DEVICEID',
      'IOTEDGE_MODULEID',
      'IOTEDGE_IOTHUBHOSTNAME',
      'IOTEDGE_AUTHSCHEME',
      'IOTEDGE_MODULEGENERATIONID'
    ];

    keys.forEach((key) => {
      if (!process.env[key]) {
        return new ReferenceError(
          `Environment variable ${key} was not provided.`
        );
      }
    });

    // Codes_SRS_NODE_MODULE_CLIENT_13_030: [ The value for the environment variable IOTEDGE_AUTHSCHEME must be SasToken. ]

    // we only support sas token auth scheme at this time
    if (process.env.IOTEDGE_AUTHSCHEME.toLowerCase() !== 'sastoken') {
      return new ReferenceError(
        `Authentication scheme ${
          process.env.IOTEDGE_AUTHSCHEME
        } is not a supported scheme.`
      );
    }
  }

  /**
   * @description         Creates an IoT Hub module client by using configuration
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
   * @param callback      Callback to invoke when the ModuleClient has been constructured or if an
   *                      error occurs while creating the client.
   */
  static fromEnvironment(transportCtor: any, callback: (err?: Error, client?: ModuleClient) => void): void {
    // Codes_SRS_NODE_MODULE_CLIENT_13_033: [ The fromEnvironment method shall throw a ReferenceError if the callback argument is falsy or is not a function. ]
    if (!callback || typeof(callback) !== 'function') {
      throw new ReferenceError('callback cannot be \'' + callback + '\'');
    }

    // Codes_SRS_NODE_MODULE_CLIENT_13_026: [ The fromEnvironment method shall invoke callback with a ReferenceError if the transportCtor argument is falsy. ]
    if (!transportCtor) {
      callback(new ReferenceError('transportCtor cannot be \'' + transportCtor + '\''));
      return;
    }

    // Codes_SRS_NODE_MODULE_CLIENT_13_028: [ The fromEnvironment method shall delegate to ModuleClient.fromConnectionString if an environment variable called EdgeHubConnectionString or IotHubConnectionString exists. ]

    // if the environment has a value for EdgeHubConnectionString then we use that
    const connectionString = process.env.EdgeHubConnectionString || process.env.IotHubConnectionString;
    if (connectionString) {
      ModuleClient._fromEnvironmentNormal(connectionString, transportCtor, callback);
    } else {
      ModuleClient._fromEnvironmentEdge(transportCtor, callback);
    }
  }

  private static _fromEnvironmentEdge(transportCtor: any, callback: (err?: Error, client?: ModuleClient) => void): void {
    // make sure all the environment variables we need have been provided
    const validationError = ModuleClient.validateEnvironment();
    if (validationError) {
      callback(validationError);
      return;
    }

    const authConfig = {
      workloadUri: process.env.IOTEDGE_WORKLOADURI,
      deviceId: process.env.IOTEDGE_DEVICEID,
      moduleId: process.env.IOTEDGE_MODULEID,
      iothubHostName: process.env.IOTEDGE_IOTHUBHOSTNAME,
      authScheme: process.env.IOTEDGE_AUTHSCHEME,
      gatewayHostName: process.env.IOTEDGE_GATEWAYHOSTNAME,
      generationId: process.env.IOTEDGE_MODULEGENERATIONID
    };

    // Codes_SRS_NODE_MODULE_CLIENT_13_032: [ The fromEnvironment method shall create a new IotEdgeAuthenticationProvider object and pass this to the transport constructor. ]
    const authenticationProvider = new IotEdgeAuthenticationProvider(authConfig);

    // get trust bundle
    authenticationProvider.getTrustBundle((err, ca) => {
      if (err) {
        callback(err);
      } else {
        const transport = new transportCtor(authenticationProvider);

        // Codes_SRS_NODE_MODULE_CLIENT_13_035: [ If the client is running in edge mode then the IotEdgeAuthenticationProvider.getTrustBundle method shall be invoked to retrieve the CA cert and the returned value shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA value for the ca property in the options object. ]
        transport.setOptions({ ca });

        // Codes_SRS_NODE_MODULE_CLIENT_13_031: [ The fromEnvironment method shall invoke the callback with a new instance of the ModuleClient object. ]
        callback(null, new ModuleClient(transport));
      }
    });
  }

  private static _fromEnvironmentNormal(connectionString: string, transportCtor: any, callback: (err?: Error, client?: ModuleClient) => void): void {
    // this is a transport decorator that provides the CA certificate to the underlying
    // transport if a CA cert is provided in the environment
    function CertTransport(authenticationProvider: AuthenticationProvider): any {
      const transport = new transportCtor(authenticationProvider);
      // Codes_SRS_NODE_MODULE_CLIENT_13_034: [ If the client is running in a non-edge mode and an environment variable named EdgeModuleCACertificateFile exists then its value shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA as the value for the ca property in the options object. ]
      transport.setOptions({ ca: process.env.EdgeModuleCACertificateFile });
      return transport;
    }

    let wrappedTransportCtor = transportCtor;
    if (process.env.EdgeModuleCACertificateFile) {
      wrappedTransportCtor = CertTransport;
    }

    callback(null, ModuleClient.fromConnectionString(
      connectionString,
      wrappedTransportCtor
    ));
  }
}
