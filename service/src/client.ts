// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { Agent } from 'https';
import { anHourFromNow, errors, results, Message, Receiver, SharedAccessSignature } from 'azure-iot-common';
import { RetryOperation, RetryPolicy, ExponentialBackOffWithJitter } from 'azure-iot-common';
import * as ConnectionString from './connection_string';
import { Amqp } from './amqp';
import { DeviceMethod } from './device_method';
import { RestApiClient } from 'azure-iot-http-base';
import { DeviceMethodParams, IncomingMessageCallback, createResultWithIncomingMessage, ResultWithIncomingMessage } from './interfaces';
import { Callback, tripleValueCallbackToPromise } from 'azure-iot-common';
import { IncomingMessage } from 'http';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const MAX_RETRY_TIMEOUT = 240000; // 4 minutes

/**
 * The IoT Hub service client is used to communicate with devices through an Azure IoT hub.
 * It lets the SDK user:
 *   - send cloud-to-device (also known as commands) to devices: commands are queued on IoT Hub and delivered asynchronously only when the device is connected. Only 50 commands can be queued per device.
 *   - invoke direct methods on devices (which will work only if the device is currently connected: it's a synchronous way of communicating with the device)
 *   - listen for feedback messages sent by devices for previous commands.
 *   - listen for file upload notifications from devices.
 *
 * Users should create new {@link azure-iothub.Client} instances by calling one of the factory methods,
 * {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or
 * {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature},
 * to create an IoT Hub service Client.
 */
export class Client extends EventEmitter {
  private _transport: Client.Transport;
  private _restApiClient: RestApiClient;
  private _retryPolicy: RetryPolicy;

  /**
   * @private
   */
  constructor(transport: Client.Transport, restApiClient?: RestApiClient) {
    super();
    /*Codes_SRS_NODE_IOTHUB_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
    if (!transport) throw new ReferenceError('transport is \'' + transport + '\'');
    this._transport = transport;

    this._restApiClient = restApiClient;
    if (this._restApiClient && this._restApiClient.setOptions) {
      this._restApiClient.setOptions({ http: { agent: new Agent({ keepAlive: true }) } });
    }

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_021: [The `Client` constructor shall initialize the default retry policy to `ExponentialBackoffWithJitter` with a maximum timeout of 4 minutes.]*/
    this._retryPolicy = new ExponentialBackOffWithJitter();
  }

  /**
   * @method            module:azure-iothub.Client#open
   * @description       Opens the connection to an IoT hub.
   * @param {Function}  [done]  The optional function to call when the operation is
   *                            complete. `done` will be passed an Error object
   *                            argument, which will be null if the operation
   *                            completed successfully.
   * @returns {Promise<ResultWithIncomingMessage<results.Connected>> | void} Promise if no callback function was passed, void otherwise.
   */
  open(done: IncomingMessageCallback<results.Connected>): void;
  open(): Promise<ResultWithIncomingMessage<results.Connected>>;
  open(done?: IncomingMessageCallback<results.Connected>): Promise<ResultWithIncomingMessage<results.Connected>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_008: [The open method shall open a connection to the IoT Hub that was identified when the Client object was created (e.g., in Client.fromConnectionString).]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_009: [When the open method completes, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - standard JavaScript Error object (or subclass)]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_010: [The argument err passed to the callback done shall be null if the protocol operation was successful.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_011: [Otherwise the argument err shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_012: [If the connection is already open when open is called, it shall have no effect—that is, the done callback shall be invoked immediately with a null argument.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_16_006: [The `open` method should not throw if the `done` callback is not specified.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_16_022: [The `open` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to connect the transport.]*/
      const retryOp = new RetryOperation(this._retryPolicy, MAX_RETRY_TIMEOUT);
      retryOp.retry((retryCallback) => {
        this._transport.connect(retryCallback);
      },
        (err, result) => {
          if (err) {
            if (_callback) _callback(err);
          } else {
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_002: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
            this._transport.on('disconnect', this._disconnectHandler.bind(this));
            if (_callback) _callback(null, result);
          }
        });
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  /**
   * @method            module:azure-iothub.Client#close
   * @description       Closes the connection to an IoT hub.
   * @param {Function}  [done]  The optional function to call when the operation is
   *                            complete. `done` will be passed an Error object
   *                            argument, which will be null if the operation
   *                            completed successfully.
   * @returns {Promise<ResultWithIncomingMessage<results.Disconnected>> | void} Promise if no callback function was passed, void otherwise.
   */
  close(done: IncomingMessageCallback<results.Disconnected>): void;
  close(): Promise<ResultWithIncomingMessage<results.Disconnected>>;
  close(done?: IncomingMessageCallback<results.Disconnected>): Promise<ResultWithIncomingMessage<results.Disconnected>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_021: [The close method shall close the connection.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_022: [When the close method completes, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - standard JavaScript Error object (or subclass)]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_023: [The argument err passed to the callback _callback shall be null if the protocol operation was successful.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_024: [Otherwise the argument err shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_025: [If the connection is not open when close is called, it shall have no effect— that is, the _callback callback shall be invoked immediately with null arguments.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_16_005: [The `close` method should not throw if the `_callback` callback is not specified.]*/
      this._transport.disconnect((err, result) => {
        if (err) {
          if (_callback) _callback(err);
        } else {
          /*Codes_SRS_NODE_IOTHUB_CLIENT_16_003: [The `close` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
          this._transport.removeAllListeners('disconnect');
          if (_callback) _callback(null, result);
        }
      });
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  /**
   * @method            module:azure-iothub.Client#send
   * @description       Sends a message to a device.
   * @param {String}    deviceId  The identifier of an existing device identity.
   * @param {Object}    message   The body of the message to send to the device.
   *                              If `message` is not of type
   *                              {@link module:azure-iot-common.Message|Message},
   *                              it will be converted.
   * @param {Function}  [done]    The optional function to call when the operation is
   *                              complete. `done` will be called with two
   *                              arguments: an Error object (can be null) and a
   *                              transport-specific response object useful for
   *                              logging or debugging.
   * @returns {Promise<ResultWithIncomingMessage<results.MessageEnqueued>> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}     If `deviceId` or `message` is null, undefined or empty.
   */
  send(deviceId: string, message: Message | Message.BufferConvertible, done: IncomingMessageCallback<results.MessageEnqueued>): void;
  send(deviceId: string, message: Message | Message.BufferConvertible): Promise<ResultWithIncomingMessage<results.MessageEnqueued>>;
  send(deviceId: string, message: Message | Message.BufferConvertible, done?: IncomingMessageCallback<results.MessageEnqueued>): Promise<ResultWithIncomingMessage<results.MessageEnqueued>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_013: [The send method shall throw ReferenceError if the deviceId or message arguments are falsy.]*/
      if (!deviceId) {
        throw new ReferenceError('deviceId is \'' + deviceId + '\'');
      }
      if (!message) {
        throw new ReferenceError('message is \'' + message + '\'');
      }

      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_014: [The `send` method shall convert the `message` object to type `azure-iot-common.Message` if it is not already of type `azure-iot-common.Message`.]*/
      if ((<any>message.constructor).name !== 'Message') {
        /*Codes_SRS_NODE_IOTHUB_CLIENT_18_016: [The `send` method shall throw an `ArgumentError` if the `message` argument is not of type `azure-iot-common.Message` or `azure-iot-common.Message.BufferConvertible`.]*/
        if (!Message.isBufferConvertible(message)) {
          throw new errors.ArgumentError('message is not of type Message or Message.BufferConvertible');
        }
        message = new Message(message as Message.BufferConvertible);
      }

      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_015: [If the connection has not already been opened (e.g., by a call to open), the send method shall open the connection before attempting to send the message.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_016: [When the send method completes, the callback function (indicated by the _callback argument) shall be invoked with the following arguments:
      err - standard JavaScript Error object (or subclass)
      response - an implementation-specific response object returned by the underlying protocol, useful for logging and troubleshooting]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_017: [The argument err passed to the callback _callback shall be null if the protocol operation was successful.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_018: [Otherwise the argument err shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_019: [If the deviceId has not been registered with the IoT Hub, send shall return an instance of DeviceNotFoundError.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_020: [If the queue which receives messages on behalf of the device is full, send shall return and instance of DeviceMaximumQueueDepthExceededError.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_16_023: [The `send` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the message.]*/
      const retryOp = new RetryOperation(this._retryPolicy, MAX_RETRY_TIMEOUT);
      retryOp.retry((retryCallback) => {
        this._transport.send(deviceId, message as Message, retryCallback);
      }, (err, result) => {
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_030: [The `send` method shall not throw if the `_callback` callback is falsy.]*/
        if (_callback) {
          if (err) {
            _callback(err);
          } else {
            _callback(null, result);
          }
        }
      });
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  _invokeDeviceMethod(deviceId: string, moduleIdOrMethodParams: string | DeviceMethodParams, methodParamsOrDone?: DeviceMethodParams | IncomingMessageCallback<any>, done?: IncomingMessageCallback<any>): void {
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_014: [The `invokeDeviceMethod` method shall throw a `ReferenceError` if `deviceId` is `null`, `undefined` or an empty string.]*/
    if (deviceId === undefined || deviceId === null || deviceId === '') throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');

    let actualModuleId: string = undefined;
    let actualMethodParams: DeviceMethodParams = undefined;
    let actualCallback: IncomingMessageCallback<any> | undefined = undefined;

    if (typeof moduleIdOrMethodParams === 'string') {
      actualModuleId = moduleIdOrMethodParams;
      actualMethodParams = methodParamsOrDone as DeviceMethodParams;
      actualCallback = done;
    } else {
      // actualModuleId stays undefined
      actualMethodParams = moduleIdOrMethodParams;
      actualCallback = methodParamsOrDone as IncomingMessageCallback<any>;
    }

    // Validation of the validity of actualMethodParams is handled in the DeviceMethod constructor.
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_009: [The `invokeDeviceMethod` method shall initialize a new `DeviceMethod` instance with the `methodName`, `payload` and `timeout` values passed in the arguments.]*/
    const method = new DeviceMethod(actualMethodParams, this._restApiClient);

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_010: [The `invokeDeviceMethod` method shall use the newly created instance of `DeviceMethod` to invoke the method on the device specified with the `deviceid` argument .]*/
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_012: [The `invokeDeviceMethod` method shall call the `done` callback with a standard javascript `Error` object if the request failed.]*/
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_013: [The `invokeDeviceMethod` method shall call the `done` callback with a `null` first argument, the result of the method execution in the second argument, and the transport-specific response object as a third argument.]*/
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_026: [The `invokeDeviceMethod` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the method request.]*/
    const retryOp = new RetryOperation(this._retryPolicy, MAX_RETRY_TIMEOUT);
    retryOp.retry((retryCallback) => {
      /*Codes_SRS_NODE_IOTHUB_CLIENT_18_003: [If `moduleIdOrMethodParams` is a string the `invokeDeviceMethod` method shall call `invokeOnModule` on the new `DeviceMethod` instance. ]*/
      if (actualModuleId) {
        method.invokeOnModule(deviceId, actualModuleId, retryCallback);
      } else {
        method.invokeOn(deviceId, retryCallback);
      }
    }, (err, result, response) => {
      if (actualCallback) {
        if (err) {
          actualCallback(err);
        } else {
          actualCallback(null, result, response);
        }
      }
    });
  }

  /**
   * @method            module:azure-iothub.Client#invokeDeviceMethod
   * @description       Invokes a method on a particular device or module.
   * @param {String}    deviceId            The identifier of an existing device identity.
   * @param {String}    moduleId            The identifier of an existing module identity (optional)
   * @param {Object}    params              An object describing the method and shall have the following properties:
   *                                        - methodName                  The name of the method that shall be invoked.
   *                                        - payload                     [optional] The payload to use for the method call.
   *                                        - responseTimeoutInSeconds    [optional] The number of seconds IoT Hub shall wait for the device
   *                                                                      to send a response before deeming the method execution a failure.
   *                                        - connectTimeoutInSeconds     [optional] The number of seconds IoT Hub shall wait for the service
   *                                                                      to connect to the device before declaring the device is unreachable.
   * @param {Function}  [done]              The optional callback to call with the result of the method execution.
   * @returns {ResultWithIncomingMessage<any> | void} Promise if no callback function was passed, void otherwise.
   *
   * @throws {ReferenceError}  If one of the required parameters is null, undefined or empty.
   * @throws {TypeError}       If one of the parameters is of the wrong type.
   */
  invokeDeviceMethod(deviceId: string, methodParams: DeviceMethodParams, done: IncomingMessageCallback<any>): void;
  invokeDeviceMethod(deviceId: string, moduleId: string, methodParams: DeviceMethodParams, done: IncomingMessageCallback<any>): void;
  invokeDeviceMethod(deviceId: string, methodParams: DeviceMethodParams): Promise<ResultWithIncomingMessage<any>>;
  invokeDeviceMethod(deviceId: string, moduleId: string, methodParams: DeviceMethodParams): Promise<ResultWithIncomingMessage<any>>;
  invokeDeviceMethod(deviceId: string, moduleIdOrMethodParams: string | DeviceMethodParams, methodParamsOrDone?: DeviceMethodParams | IncomingMessageCallback<any>, done?: IncomingMessageCallback<any>): Promise<ResultWithIncomingMessage<any>> | void {
    const callback = done || ((typeof methodParamsOrDone === 'function') ? methodParamsOrDone as IncomingMessageCallback<any> : undefined);
    let moduleId: string;
    let methodParams: DeviceMethodParams;
    if (callback) {
      return this._invokeDeviceMethod(deviceId, moduleIdOrMethodParams, methodParamsOrDone, done);
    } else {
      if (typeof moduleIdOrMethodParams === 'string') {
        moduleId = moduleIdOrMethodParams;
        if (methodParamsOrDone) {
          methodParams = methodParamsOrDone as DeviceMethodParams;
        }
      } else {
        moduleId = undefined;
        methodParams = moduleIdOrMethodParams as DeviceMethodParams;
      }
    }

    if (moduleId) {
      return tripleValueCallbackToPromise((_callback) => {
        this._invokeDeviceMethod(deviceId, moduleId, methodParams, _callback);
      }, (r: any, m: IncomingMessage) => { return createResultWithIncomingMessage(r, m); }, callback);
    } else {
      return tripleValueCallbackToPromise((_callback) => {
        this._invokeDeviceMethod(deviceId, methodParams, _callback);
      }, (r: any, m: IncomingMessage) => { return createResultWithIncomingMessage(r, m); }, callback);
    }
  }

  /**
   * @method            module:azure-iothub.Client#getFeedbackReceiver
   * @description       Returns a AmqpReceiver object which emits events when new feedback messages are received by the client.
   * @param {Function}  [done]    The optional function to call when the operation is
   *                              complete. `done` will be called with two
   *                              arguments: an Error object (can be null) and a
   *                              AmqpReceiver object.
   * @returns {ResultWithIncomingMessage<Client.ServiceReceiver> | void} Promise if no callback function was passed, void otherwise.
   */
  getFeedbackReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
  getFeedbackReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
  getFeedbackReceiver(done?: IncomingMessageCallback<Client.ServiceReceiver>): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_027: [When the `getFeedbackReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
          - `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
          - `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_030: [The FeedbackReceiver class shall inherit EventEmitter to provide consumers the ability to listen for (and stop listening for) events.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_031: [FeedbackReceiver shall expose the 'errorReceived' event, whose handler shall be called with the following arguments:
      err – standard JavaScript Error object (or subclass)]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_032: [FeedbackReceiver shall expose the 'message' event, whose handler shall be called with the following arguments when a new feedback message is received from the IoT Hub:
      message – a JavaScript object containing a batch of one or more feedback records]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_05_033: [getFeedbackReceiver shall return the same instance of Client.FeedbackReceiver every time it is called with a given instance of Client.]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_16_024: [The `getFeedbackReceiver` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to get a feedback receiver object.]*/
      const retryOp = new RetryOperation(this._retryPolicy, MAX_RETRY_TIMEOUT);
      retryOp.retry((retryCallback) => {
        this._transport.getFeedbackReceiver(retryCallback);
      }, (err, result) => {
        if (_callback) {
          if (err) {
            _callback(err);
          } else {
            _callback(null, result);
          }
        }
      });
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  /**
   * @method            module:azure-iothub.Client#getFileNotificationReceiver
   * @description       Returns a AmqpReceiver object which emits events when new file upload notifications are received by the client.
   * @param {Function}  [done]    The optional function to call when the operation is
   *                              complete. `done` will be called with two
   *                              arguments: an Error object (can be null) and a
   *                              AmqpReceiver object.
   * @returns {ResultWithIncomingMessage<Client.ServiceReceiver> | void} Promise if no callback function was passed, void otherwise.
   */
  getFileNotificationReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
  getFileNotificationReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
  getFileNotificationReceiver(done?: IncomingMessageCallback<Client.ServiceReceiver>): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>> | void {
    return tripleValueCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_IOTHUB_CLIENT_16_001: [When the `getFileNotificationReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
       - `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
       - `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed]*/
      /*Codes_SRS_NODE_IOTHUB_CLIENT_16_025: [The `getFileNotificationReceiver` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the get a feedback receiver object.]*/
      const retryOp = new RetryOperation(this._retryPolicy, MAX_RETRY_TIMEOUT);
      retryOp.retry((retryCallback) => {
        this._transport.getFileNotificationReceiver(retryCallback);
      }, (err, result) => {
        if (_callback) {
          if (err) {
            _callback(err);
          } else {
            _callback(null, result);
          }
        }
      });
    }, (r, m) => { return createResultWithIncomingMessage(r, m); }, done);
  }

  /**
   * Set the policy used by the client to retry network operations.
   *
   * @param policy policy used to retry operations (eg. open, send, etc.).
   *               The SDK comes with 2 "built-in" policies: ExponentialBackoffWithJitter (default)
   *               and NoRetry (to cancel any form of retry). The user can also pass its own object as
   *               long as it implements 2 methods:
   *               - shouldRetry(err: Error): boolean : indicates whether an operation should be retried based on the error type
   *               - nextRetryTimeout(retryCount: number, throttled: boolean): number : returns the time to wait (in milliseconds)
   *               before retrying based on the past number of attempts (retryCount) and the fact that the error is a throttling error or not.
   */
  setRetryPolicy(policy: RetryPolicy): void {
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_027: [The `setRetryPolicy` method shall throw a `ReferenceError` if the `policy` argument is falsy.]*/
    if (!policy) {
      throw new ReferenceError('policy cannot be \'' + policy + '\'');
    }

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_028: [The `setRetryPolicy` method shall throw an `ArgumentError` if the `policy` object does not have a `shouldRetry` method and a `nextRetryTimeout` method.]*/
    if (!(typeof policy.shouldRetry === 'function') || !(typeof policy.nextRetryTimeout === 'function')) {
      throw new errors.ArgumentError('policy should have a shouldRetry method and a nextRetryTimeout method');
    }

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_029: [Any operation (e.g. `send`, `getFeedbackReceiver`, etc) initiated after a call to `setRetryPolicy` shall use the policy passed as argument to retry.]*/
    this._retryPolicy = policy;
  }

  private _disconnectHandler(reason: string): void {
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_004: [** The `disconnect` event shall be emitted when the client is disconnected from the server.]*/
    let evt = new results.Disconnected();
    evt.reason = reason;
    this.emit('disconnect', evt);
  }

  /**
   * @method            module:azure-iothub.Client.fromConnectionString
   * @static
   * @description       Creates an IoT Hub service client from the given
   *                    connection string using the default transport
   *                    (Amqp) or the one specified in the second argument.
   *
   * @param {String}    connStr       A connection string which encapsulates "device
   *                                  connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @returns {module:azure-iothub.Client}
   */
  static fromConnectionString(connStr: string, transportCtor?: Client.TransportCtor): Client {
    /*Codes_SRS_NODE_IOTHUB_CLIENT_05_002: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
    if (!connStr) throw new ReferenceError('connStr is \'' + connStr + '\'');

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_016: [The `fromConnectionString` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy.]*/
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_017: [The `fromConnectionString` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy.]*/
    if (!transportCtor) {
      transportCtor = Amqp;
    }

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_015: [The `fromConnectionString` method shall create a new transport instance and pass it a config object formed from the connection string given as argument.]*/
    const cn = ConnectionString.parse(connStr);

    const config: Client.TransportConfigOptions = {
      host: cn.HostName,
      keyName: cn.SharedAccessKeyName,
      sharedAccessSignature: SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, anHourFromNow())
    };

    /*Codes_SRS_NODE_IOTHUB_CLIENT_05_004: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(transport).]*/
    return new Client(new transportCtor(config), new RestApiClient(config, packageJson.name + '/' + packageJson.version));
  }

  /**
   * @method            module:azure-iothub.Client.fromSharedAccessSignature
   * @static
   * @description       Creates an IoT Hub service client from the given
   *                    shared access signature using the default transport
   *                    (Amqp) or the one specified in the second argument.
   *
   * @param {String}    sharedAccessSignature   A shared access signature which encapsulates
   *                            "service connect" permissions on an IoT hub.
   * @param {Function}  Transport     A transport constructor.
   *
   * @returns {module:azure-iothub.Client}
   */
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor?: Client.TransportCtor): Client {
    /*Codes_SRS_NODE_IOTHUB_CLIENT_05_005: [The fromSharedAccessSignature method shall throw ReferenceError if the sharedAccessSignature argument is falsy.]*/
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature is \'' + sharedAccessSignature + '\'');

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_019: [The `fromSharedAccessSignature` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy.]*/
    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_020: [The `fromSharedAccessSignature` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy.]*/
    if (!transportCtor) {
      transportCtor = Amqp;
    }

    const sas = SharedAccessSignature.parse(sharedAccessSignature);
    const decodedUri = decodeURIComponent(sas.sr);

    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_018: [The `fromSharedAccessSignature` method shall create a new transport instance and pass it a config object formed from the connection string given as argument.]*/
    const config: Client.TransportConfigOptions = {
      host: decodedUri,
      keyName: sas.skn,
      sharedAccessSignature: sas.toString()
    };

    /*Codes_SRS_NODE_IOTHUB_CLIENT_05_007: [The fromSharedAccessSignature method shall return a new instance of the Client object, as by a call to new Client(transport).]*/
    return new Client(new transportCtor(config), new RestApiClient(config, packageJson.name + '/' + packageJson.version));
  }
}

export namespace Client {
  export interface TransportConfigOptions {
    /**
     * Hostname of the Azure IoT hub. (<IoT hub name>.azure-devices.net).
     */
    host: string;
    /**
     * @deprecated This is not used anywhere anymore.
     * Name of the Azure IoT hub. (The first section of the Azure IoT hub hostname)
     */
    hubName?: string;
    /**
     * The name of the policy used to connect to the Azure IoT Hub service.
     */
    keyName: string;
    /**
     * The shared access signature token used to authenticate the connection with the Azure IoT hub.
     */
    sharedAccessSignature: string | SharedAccessSignature;
  }

  export interface ServiceReceiver extends Receiver {
    complete(message: Message, done?: Callback<results.MessageCompleted>): void;
    abandon(message: Message, done?: Callback<results.MessageAbandoned>): void;
    reject(message: Message, done?: Callback<results.MessageRejected>): void;
  }

  export interface Transport extends EventEmitter {
    connect(done?: Callback<results.Connected>): void;
    disconnect(done: Callback<results.Disconnected>): void;
    send(deviceId: string, message: Message, done?: Callback<results.MessageEnqueued>): void;
    getFeedbackReceiver(done: Callback<ServiceReceiver>): void;
    getFileNotificationReceiver(done: Callback<ServiceReceiver>): void;
  }

  export type TransportCtor = new (config: Client.TransportConfigOptions) => Client.Transport;
}
