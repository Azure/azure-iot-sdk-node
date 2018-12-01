// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as dbg from 'debug';
const debug = dbg('azure-iot-device:ModuleClient');

import * as fs from 'fs';
import { results, Message, RetryOperation, ConnectionString, AuthenticationProvider, Callback, callbackToPromise, DoubleValueCallback } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { errors } from 'azure-iot-common';
import { SharedAccessKeyAuthenticationProvider } from './sak_authentication_provider';
import { SharedAccessSignatureAuthenticationProvider } from './sas_authentication_provider';
import { IotEdgeAuthenticationProvider } from './iotedge_authentication_provider';
import { MethodParams, MethodCallback, MethodClient, DeviceMethodRequest, DeviceMethodResponse, MethodResult } from './device_method';
import { DeviceClientOptions } from './interfaces';

function safeCallback(callback?: (err?: Error, result?: any) => void, error?: Error, result?: any): void {
  if (callback) callback(error, result);
}

/**
 * IoT Hub device client used to connect a device with an Azure IoT hub.
 *
 * Users of the SDK should call one of the factory methods,
 * {@link azure-iot-device.Client.fromConnectionString|fromConnectionString}
 * or {@link azure-iot-device.Client.fromSharedAccessSignature|fromSharedAccessSignature}
 * to create an IoT Hub device client.
 */
export class ModuleClient extends InternalClient {
  private _inputMessagesEnabled: boolean;
  private _moduleDisconnectHandler: (err?: Error, result?: any) => void;
  private _methodClient: MethodClient;

  /**
   * @private
   * @constructor
   * @param {Object}  transport         An object that implements the interface
   *                                    expected of a transport object, e.g.,
   *                                    {@link azure-iot-device-mqtt.Mqtt|Mqtt}.
   * @param {Object}  restApiClient     the RestApiClient object to use for HTTP calls
   */
  constructor(transport: DeviceTransport, methodClient: MethodClient) {
    super(transport, undefined);
    this._inputMessagesEnabled = false;
    this._methodClient = methodClient;

    /* Codes_SRS_NODE_MODULE_CLIENT_18_012: [ The `inputMessage` event shall be emitted when an inputMessage is received from the IoT Hub service. ]*/
    /* Codes_SRS_NODE_MODULE_CLIENT_18_013: [ The `inputMessage` event parameters shall be the inputName for the message and a `Message` object. ]*/
    this._transport.on('inputMessage', (inputName, msg) => {
      this.emit('inputMessage', inputName, msg);
    });

    this.on('removeListener', (eventName) => {
      if (eventName === 'inputMessage' && this.listeners('inputMessage').length === 0) {
        /* Codes_SRS_NODE_MODULE_CLIENT_18_015: [ The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `inputMessage` event. ]*/
        this._disableInputMessages((err) => {
          if (err) {
            this.emit('error', err);
          }
        });
      }
    });

    this.on('newListener', (eventName) => {
      if (eventName === 'inputMessage') {
        /* Codes_SRS_NODE_MODULE_CLIENT_18_014: [ The client shall start listening for messages from the service whenever there is a listener subscribed to the `inputMessage` event. ]*/
        this._enableInputMessages((err) => {
          if (err) {
            /*Codes_SRS_NODE_MODULE_CLIENT_18_017: [The client shall emit an `error` if connecting the transport fails while subscribing to `inputMessage` events.]*/
            this.emit('error', err);
          }
        });
      }
    });

    this._moduleDisconnectHandler = (err) => {
      debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
      if (err && this._retryPolicy.shouldRetry(err)) {
        if (this._inputMessagesEnabled) {
          this._inputMessagesEnabled = false;
          debug('re-enabling input message link');
          this._enableInputMessages((err) => {
            if (err) {
              /*Codes_SRS_NODE_MODULE_CLIENT_16_102: [If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
              this.emit('disconnect', new results.Disconnected(err));
            }
          });
        }
      }
    };

    /*Codes_SRS_NODE_MODULE_CLIENT_16_045: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
    this._transport.on('disconnect', this._moduleDisconnectHandler);
  }

  /**
   * Sends an event to the given module output
   * @param outputName Name of the output to send the event to
   * @param message Message to send to the given output
   * @param [callback] Optional function to call when the operation has been queued.
   * @returns {Promise<results.MessageEnqueued> | void} Promise if no callback function was passed, void otherwise.
   */
  sendOutputEvent(outputName: string, message: Message, callback: Callback<results.MessageEnqueued>): void;
  sendOutputEvent(outputName: string, message: Message): Promise<results.MessageEnqueued>;
  sendOutputEvent(outputName: string, message: Message, callback?: Callback<results.MessageEnqueued>): Promise<results.MessageEnqueued> | void {
    return callbackToPromise((_callback) => {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /* Codes_SRS_NODE_MODULE_CLIENT_18_010: [ The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. ]*/
        this._transport.sendOutputEvent(outputName, message, opCallback);
      }, (err, result) => {
        /*Codes_SRS_NODE_MODULE_CLIENT_18_018: [ When the `sendOutputEvent` method completes, the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. ]*/
        /*Codes_SRS_NODE_MODULE_CLIENT_18_019: [ The `sendOutputEvent` method shall not throw if the `callback` is not passed. ]*/
        safeCallback(_callback, err, result);
      });
    }, callback);
  }

  /**
   * Sends an array of events to the given module output
   * @param outputName Name of the output to send the events to
   * @param message Messages to send to the given output
   * @param [callback] Function to call when the operations have been queued.
   * @returns {Promise<results.MessageEnqueued> | void} Optional promise if no callback function was passed, void otherwise.
   */
  sendOutputEventBatch(outputName: string, messages: Message[], callback: Callback<results.MessageEnqueued>): void;
  sendOutputEventBatch(outputName: string, messages: Message[]): Promise<results.MessageEnqueued>;
  sendOutputEventBatch(outputName: string, messages: Message[], callback?: Callback<results.MessageEnqueued>): Promise<results.MessageEnqueued> | void {
    return callbackToPromise((_callback) => {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /* Codes_SRS_NODE_MODULE_CLIENT_18_011: [ The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. ]*/
        this._transport.sendOutputEventBatch(outputName, messages, opCallback);
      }, (err, result) => {
        /*Codes_SRS_NODE_MODULE_CLIENT_18_021: [ When the `sendOutputEventBatch` method completes the `_callback` function shall be invoked with the same arguments as the underlying transport method's callback. ]*/
        /*Codes_SRS_NODE_MODULE_CLIENT_18_022: [ The `sendOutputEventBatch` method shall not throw if the `_callback` is not passed. ]*/
        safeCallback(_callback, err, result);
      });
    }, callback);
  }

  /**
   * Closes the transport connection and destroys the client resources.
   *
   * *Note: After calling this method the ModuleClient object cannot be reused.*
   *
   * @param [closeCallback] Optional function to call once the transport is disconnected and the client closed.
   * @returns {Promise<results.Disconnected> | void} Promise if no callback function was passed, void otherwise.
   */
  close(closeCallback: Callback<results.Disconnected>): void;
  close(): Promise<results.Disconnected>;
  close(closeCallback?: Callback<results.Disconnected>): Promise<results.Disconnected> | void {
    return callbackToPromise((_callback) => {
      this._transport.removeListener('disconnect', this._moduleDisconnectHandler);
      super.close(_callback);
    }, closeCallback);
  }

  _invokeMethod(deviceId: string, methodParams: MethodParams, callback: MethodCallback): void;
  _invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams, callback: MethodCallback): void;
  _invokeMethod(deviceId: string, moduleIdOrMethodParams: string | MethodParams, methodParamsOrCallback: MethodParams | MethodCallback, callback?: MethodCallback): void {
    /*Codes_SRS_NODE_MODULE_CLIENT_16_093: [`invokeMethod` shall throw a `ReferenceError` if the `deviceId` argument is falsy.]*/
    if (!deviceId) {
      throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
    }

    /*Codes_SRS_NODE_MODULE_CLIENT_16_094: [`invokeMethod` shall throw a `ReferenceError` if the `moduleIdOrMethodParams` argument is falsy.]*/
    if (!moduleIdOrMethodParams) {
      throw new ReferenceError('The second parameter cannot be \'' + moduleIdOrMethodParams + '\'');
    }

    const actualModuleId = typeof moduleIdOrMethodParams === 'string' ? moduleIdOrMethodParams : null;
    const actualMethodParams = typeof moduleIdOrMethodParams === 'object' ? moduleIdOrMethodParams : methodParamsOrCallback;
    const actualCallback = typeof methodParamsOrCallback === 'function' ? methodParamsOrCallback : callback;

    /*Codes_SRS_NODE_MODULE_CLIENT_16_095: [`invokeMethod` shall throw a `ReferenceError` if the `deviceId` and `moduleIdOrMethodParams` are strings and the `methodParamsOrCallback` argument is falsy.]*/
    if (!actualMethodParams || typeof actualMethodParams !== 'object') {
      throw new ReferenceError('methodParams cannot be \'' + actualMethodParams + '\'');
    }

    /*Codes_SRS_NODE_MODULE_CLIENT_16_096: [`invokeMethod` shall throw a `ArgumentError` if the `methodName` property of the `MethodParams` argument is falsy.]*/
    if (!(actualMethodParams as MethodParams).methodName) {
      throw new errors.ArgumentError('the name property of the methodParams argument cannot be \'' + (actualMethodParams as MethodParams).methodName + '\'');
    }

    /*Codes_SRS_NODE_MODULE_CLIENT_16_097: [`invokeMethod` shall call the `invokeMethod` API of the `MethodClient` API that was created for the `ModuleClient` instance.]*/
    this._methodClient.invokeMethod(deviceId, actualModuleId, actualMethodParams as MethodParams, actualCallback);
  }

  /**
   * Invokes a method on a downstream device or on another module on the same Edge device. Please note that this feature only works when
   * the module is being run as part of an Edge device.
   *
   * @param deviceId      target device identifier
   * @param moduleId      target module identifier on the device identified with the `deviceId` argument
   * @param methodParams  parameters of the direct method call
   * @param [callback]    optional callback that will be invoked either with an Error object or the result of the method call.
   * @returns {Promise<MethodResult> | void} Promise if no callback function was passed, void otherwise.
   */
  invokeMethod(deviceId: string, methodParams: MethodParams, callback: Callback<MethodResult>): void;
  invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams, callback: Callback<MethodResult>): void;
  invokeMethod(deviceId: string, methodParams: MethodParams): Promise<MethodResult>;
  invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams): Promise<MethodResult>;
  invokeMethod(deviceId: string, moduleIdOrMethodParams: string | MethodParams, methodParamsOrCallback?: MethodParams | Callback<MethodResult>, callback?: Callback<MethodResult>): Promise<MethodResult> | void {
    if (callback) {
      return this._invokeMethod(deviceId, moduleIdOrMethodParams as string, methodParamsOrCallback as MethodParams, callback);
    } else if (typeof methodParamsOrCallback === 'function') {
      return this._invokeMethod(deviceId, moduleIdOrMethodParams as MethodParams, methodParamsOrCallback as Callback<MethodResult>);
    }

    return callbackToPromise((_callback) => this._invokeMethod(deviceId, moduleIdOrMethodParams as any, methodParamsOrCallback as MethodParams, _callback));
  }

  /**
   * Registers a callback for a method named `methodName`.
   *
   * @param methodName Name of the method that will be handled by the callback
   * @param callback Function that shall be called whenever a method request for the method called `methodName` is received.
   */
  onMethod(methodName: string, callback: DoubleValueCallback<DeviceMethodRequest, DeviceMethodResponse>): void {
      this._onDeviceMethod(methodName, callback);
  }

  /**
   * Passes options to the `ModuleClient` object that can be used to configure the transport.
   * @param options   A {@link DeviceClientOptions} object.
   * @param [done]    Optional callback to call once the options have been set.
   * @returns {Promise<results.TransportConfigured> | void} Promise if no callback function was passed, void otherwise.
   */
  setOptions(options: DeviceClientOptions, done: Callback<results.TransportConfigured>): void;
  setOptions(options: DeviceClientOptions): Promise<results.TransportConfigured>;
  setOptions(options: DeviceClientOptions, done?: Callback<results.TransportConfigured>): Promise<results.TransportConfigured> | void {
    return callbackToPromise((_callback) => {
      /*Codes_SRS_NODE_MODULE_CLIENT_16_098: [The `setOptions` method shall call the `setOptions` method with the `options` argument on the `MethodClient` object of the `ModuleClient`.]*/
      this._methodClient.setOptions(options);
      /*Codes_SRS_NODE_MODULE_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
      /*Codes_SRS_NODE_MODULE_CLIENT_16_043: [The `_callback` callback shall be invoked with no parameters when it has successfully finished setting the client and/or transport options.]*/
      /*Codes_SRS_NODE_MODULE_CLIENT_16_044: [The `_callback` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested.]*/
      super.setOptions(options, _callback);
    }, done);
  }

  private _disableInputMessages(callback: (err?: Error) => void): void {
    if (this._inputMessagesEnabled) {
      this._transport.disableInputMessages((err) => {
        if (!err) {
          this._inputMessagesEnabled = false;
        }
        callback(err);
      });
    } else {
      callback();
    }
  }

  private _enableInputMessages(callback: (err?: Error) => void): void {
    if (!this._inputMessagesEnabled) {
      const retryOp = new RetryOperation(this._retryPolicy, this._maxOperationTimeout);
      retryOp.retry((opCallback) => {
        /* Codes_SRS_NODE_MODULE_CLIENT_18_016: [ The client shall connect the transport if needed in order to receive inputMessages. ]*/
        this._transport.enableInputMessages(opCallback);
      }, (err) => {
        if (!err) {
          this._inputMessagesEnabled = true;
        }
        callback(err);
      });
    } else {
      callback();
    }
  }

  /**
   * Creates an IoT Hub device client from the given connection string using the given transport type.
   *
   * @param {String}    connStr        A connection string which encapsulates "device connect" permissions on an IoT hub.
   * @param {Function}  transportCtor  A transport constructor.
   *
   * @throws {ReferenceError}          If the connStr parameter is falsy.
   *
   * @returns {module:azure-iot-device.ModuleClient}
   */
  static fromConnectionString(connStr: string, transportCtor: any): ModuleClient {
    /*Codes_SRS_NODE_MODULE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
    if (!connStr) throw new ReferenceError('connStr is \'' + connStr + '\'');

    const cn = ConnectionString.parse(connStr);

    /*Codes_SRS_NODE_MODULE_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor.]*/
    let authenticationProvider: AuthenticationProvider;

    if (cn.SharedAccessKey) {
      authenticationProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
    } else {
      /*Codes_SRS_NODE_MODULE_CLIENT_16_001: [The `fromConnectionString` method shall throw a `NotImplementedError` if the connection string does not contain a `SharedAccessKey` field because x509 authentication is not supported yet for modules.]*/
      throw new errors.NotImplementedError('ModuleClient only supports SAS Token authentication');
    }

    /*Codes_SRS_NODE_MODULE_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(new transportCtor(...)).]*/
    return new ModuleClient(new transportCtor(authenticationProvider), new MethodClient(authenticationProvider));
  }

  /**
   * Creates an IoT Hub module client from the given shared access signature using the given transport type.
   *
   * @param {String}    sharedAccessSignature      A shared access signature which encapsulates "device
   *                                  connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @throws {ReferenceError}         If the connStr parameter is falsy.
   *
   * @returns {module:azure-iothub.Client}
   */
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): ModuleClient {
    /*Codes_SRS_NODE_MODULE_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature is \'' + sharedAccessSignature + '\'');

    /*Codes_SRS_NODE_MODULE_CLIENT_16_088: [The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor.]*/
    const authenticationProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(sharedAccessSignature);

    /*Codes_SRS_NODE_MODULE_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the Client object] */
    return new ModuleClient(new transportCtor(authenticationProvider), new MethodClient(authenticationProvider));
  }

  /**
   * Creates an IoT Hub module client from the given authentication method and using the given transport type.
   * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
   * @param transportCtor           Transport protocol used to connect to IoT hub.
   */
  static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any): ModuleClient {
    /*Codes_SRS_NODE_MODULE_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
    if (!authenticationProvider) {
      throw new ReferenceError('authenticationMethod cannot be \'' + authenticationProvider + '\'');
    }

    /*Codes_SRS_NODE_MODULE_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
    if (!transportCtor) {
      throw new ReferenceError('transportCtor cannot be \'' + transportCtor + '\'');
    }

    /*Codes_SRS_NODE_MODULE_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
    /*Codes_SRS_NODE_MODULE_CLIENT_16_091: [The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument.]*/
    return new ModuleClient(new transportCtor(authenticationProvider), new MethodClient(authenticationProvider));
  }

  /**
   * Creates an IoT Hub module client by using configuration information from the environment.
   *
   * If an environment variable called `EdgeHubConnectionString` or `IotHubConnectionString` exists, then that value is used and behavior is identical
   * to calling `fromConnectionString` passing that in. If those environment variables do not exist then the following variables MUST be defined:
   *
   *     - IOTEDGE_WORKLOADURI          URI for iotedged's workload API
   *     - IOTEDGE_DEVICEID             Device identifier
   *     - IOTEDGE_MODULEID             Module identifier
   *     - IOTEDGE_MODULEGENERATIONID   Module generation identifier
   *     - IOTEDGE_IOTHUBHOSTNAME       IoT Hub host name
   *     - IOTEDGE_AUTHSCHEME           Authentication scheme to use; must be "sasToken"
   *
   * @param transportCtor Transport protocol used to connect to IoT hub.
   * @param [callback]    Optional callback to invoke when the ModuleClient has been constructured or if an
   *                      error occurs while creating the client.
   * @returns {Promise<ModuleClient> | void} Promise if no callback function was passed, void otherwise.
   */
  static fromEnvironment(transportCtor: any, callback: Callback<ModuleClient>): void;
  static fromEnvironment(transportCtor: any): Promise<ModuleClient>;
  static fromEnvironment(transportCtor: any, callback?: Callback<ModuleClient>): Promise<ModuleClient> | void {
    return callbackToPromise((_callback) => {
      // Codes_SRS_NODE_MODULE_CLIENT_13_033: [ The fromEnvironment method shall throw a ReferenceError if the callback argument is falsy or is not a function. ]
      if (!_callback || typeof (_callback) !== 'function') {
        throw new ReferenceError('callback cannot be \'' + _callback + '\'');
      }

      // Codes_SRS_NODE_MODULE_CLIENT_13_026: [ The fromEnvironment method shall invoke callback with a ReferenceError if the transportCtor argument is falsy. ]
      if (!transportCtor) {
        _callback(new ReferenceError('transportCtor cannot be \'' + transportCtor + '\''));
        return;
      }

      // Codes_SRS_NODE_MODULE_CLIENT_13_028: [ The fromEnvironment method shall delegate to ModuleClient.fromConnectionString if an environment variable called EdgeHubConnectionString or IotHubConnectionString exists. ]

      // if the environment has a value for EdgeHubConnectionString then we use that
      const connectionString = process.env.EdgeHubConnectionString || process.env.IotHubConnectionString;
      if (connectionString) {
        ModuleClient._fromEnvironmentNormal(connectionString, transportCtor, _callback);
      } else {
        ModuleClient._fromEnvironmentEdge(transportCtor, _callback);
      }
    }, callback);
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

        const methodClient = new MethodClient(authenticationProvider);
        methodClient.setOptions({ ca });

        // Codes_SRS_NODE_MODULE_CLIENT_13_031: [ The fromEnvironment method shall invoke the callback with a new instance of the ModuleClient object. ]
        callback(null, new ModuleClient(transport, methodClient));
      }
    });
  }

  private static _fromEnvironmentNormal(connectionString: string, transportCtor: any, callback: (err?: Error, client?: ModuleClient) => void): void {
    let ca = '';
    if (process.env.EdgeModuleCACertificateFile) {
      fs.readFile(process.env.EdgeModuleCACertificateFile, 'utf8', (err, data) => {
        if (err) {
          callback(err);
        } else {
          // Codes_SRS_NODE_MODULE_CLIENT_13_034: [ If the client is running in a non-edge mode and an environment variable named EdgeModuleCACertificateFile exists then its file contents shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA as the value for the ca property in the options object. ]
          ca = data;
          const moduleClient = ModuleClient.fromConnectionString(connectionString, transportCtor);
          moduleClient.setOptions({ ca }, (err) => {
            if (err) {
              callback(err);
            } else {
              callback(null, moduleClient);
            }
          });
        }
      });
    } else {
      callback(null, ModuleClient.fromConnectionString(connectionString, transportCtor));
    }
  }

  private static validateEnvironment(): ReferenceError {
    // Codes_SRS_NODE_MODULE_CLIENT_13_029: [ If environment variables EdgeHubConnectionString and IotHubConnectionString do not exist then the following environment variables must be defined: IOTEDGE_WORKLOADURI, IOTEDGE_DEVICEID, IOTEDGE_MODULEID, IOTEDGE_IOTHUBHOSTNAME, IOTEDGE_AUTHSCHEME and IOTEDGE_MODULEGENERATIONID. ]
    const keys = [
      'IOTEDGE_WORKLOADURI',
      'IOTEDGE_DEVICEID',
      'IOTEDGE_MODULEID',
      'IOTEDGE_IOTHUBHOSTNAME',
      'IOTEDGE_AUTHSCHEME',
      'IOTEDGE_MODULEGENERATIONID'
    ];

    for (const key of keys) {
      if (!process.env[key]) {
        return new ReferenceError(
          `Environment variable ${key} was not provided.`
        );
      }
    }

    // Codes_SRS_NODE_MODULE_CLIENT_13_030: [ The value for the environment variable IOTEDGE_AUTHSCHEME must be sasToken. ]

    // we only support sas token auth scheme at this time
    if (process.env.IOTEDGE_AUTHSCHEME.toLowerCase() !== 'sastoken') {
      return new ReferenceError(
        `Authentication scheme ${
        process.env.IOTEDGE_AUTHSCHEME
        } is not a supported scheme.`
      );
    }
  }
}
