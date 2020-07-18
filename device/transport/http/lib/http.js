// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var cron = require("node-crontab");
var dbg = require("debug");
var debug = dbg('azure-iot-device-http:Http');
var events_1 = require("events");
var azure_iot_http_base_1 = require("azure-iot-http-base");
var azure_iot_common_1 = require("azure-iot-common");
var http_errors_js_1 = require("./http_errors.js");
var azure_iot_device_1 = require("azure-iot-device");
var MESSAGE_PROP_HEADER_PREFIX = 'iothub-app-';
/*Codes_SRS_NODE_DEVICE_HTTP_05_009: [When any Http method receives an HTTP response with a status code >= 300, it shall invoke the done callback function with the following arguments:
err - the standard JavaScript Error object, with the Node.js http.ServerResponse object attached as the property response]*/
/*Codes_SRS_NODE_DEVICE_HTTP_05_010: [When any Http method receives an HTTP response with a status code < 300, it shall invoke the done callback function with the following arguments:
err - null
body - the body of the HTTP response
response - the Node.js http.ServerResponse object returned by the transport]*/
function handleResponse(done) {
    return function (err, body, response) {
        if (!err) {
            done(null, new azure_iot_common_1.results.MessageEnqueued(response));
        }
        else {
            var error = response ? http_errors_js_1.translateError('Could not send message: ' + err.message, body, response) : err;
            done(error);
        }
    };
}
var defaultOptions = {
    // 'interval' is a number, expressed in seconds. Default will poll for messages once per second.
    interval: 1,
    // 'at' is a Date object. Message(s) will be received at this time.
    at: null,
    // 'cron' is a cron string. Message(s) will be received according to the interval defined by the cron string.
    cron: null,
    // 'manualPolling' is a boolean indicating whether to receive only when the receive method is called.
    manualPolling: false,
    // 'drain' is a boolean indicating whether all messages should be received at the same time (as opposed to one at a time, if set to 'false')
    drain: true
};
/**
 * Provides the transport layer over HTTP for the {@link azure-iot-device.Client} object.
 *
 * This class is not meant to be used directly, instead passed to the {@link azure-iot-device.Client} class to be used as
 * a transport.
 */
/*Codes_SRS_NODE_DEVICE_HTTP_05_001: [The Http constructor shall accept an object with the following properties:
- `host` - (string) the fully-qualified DNS hostname of an IoT hub
- `deviceId` - (string) the name of the IoT hub, which is the first segment of hostname
and either:
- `sharedAccessSignature` - (string) a shared access signature generated from the credentials of a policy with the "device connect" permissions.
or:
- `x509` (object) an object with 3 properties: `cert`, `key` and `passphrase`, all strings, containing the necessary information to connect to the service.
]*/
var Http = /** @class */ (function (_super) {
    __extends(Http, _super);
    /**
     * @private
     * @constructor
     * @param config The configuration object.
     */
    function Http(authenticationProvider, http) {
        var _this = _super.call(this) || this;
        _this._authenticationProvider = authenticationProvider;
        _this._http = http || new azure_iot_http_base_1.Http();
        _this._opts = defaultOptions;
        _this._receiverStarted = false;
        return _this;
    }
    /**
     * @private
     */
    Http.prototype.connect = function (callback) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_028: [The `connect` method shall call its callback immediately with a `null` first argument and a `results.Connected` second argument.]*/
        callback(null, new azure_iot_common_1.results.Connected());
    };
    /**
     * @private
     */
    Http.prototype.disconnect = function (callback) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_039: [The `disconnect` method shall call the `stop` method on the `AuthenticationProvider` object if the type of authentication used is "token".]*/
        if (this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.Token) {
            this._authenticationProvider.stop();
        }
        if (this._receiverStarted) {
            /*Codes_SRS_NODE_DEVICE_HTTP_16_029: [The `disconnect` method shall disable the C2D message receiver if it is running. ]*/
            this.disableC2D(function (err) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_16_030: [The `disconnect` method shall call its callback with an `Error` if disabling the C2D message receiver generates an error. ]*/
                    callback(err);
                }
                else {
                    /*Codes_SRS_NODE_DEVICE_HTTP_16_031: [The `disconnect` method shall call its callback with a `null` first argument and a `results.Disconnected` second argument after successfully disabling the C2D receiver (if necessary). ]*/
                    callback(null, new azure_iot_common_1.results.Disconnected());
                }
            });
        }
        else {
            /*Codes_SRS_NODE_DEVICE_HTTP_16_031: [The `disconnect` method shall call its callback with a `null` first argument and a `results.Disconnected` second argument after successfully disabling the C2D receiver (if necessary). ]*/
            callback(null, new azure_iot_common_1.results.Disconnected());
        }
    };
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#sendEvent
     * @description     This method sends an event to the IoT Hub as the device indicated in the
     *                  `config` parameter.
     *
     * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
     *                              to be sent.
     * @param {Object}  config      This is a dictionary containing the following keys
     *                              and values:
     *
     * | Key     | Value                                                   |
     * |---------|---------------------------------------------------------|
     * | host    | The host URL of the Azure IoT Hub                       |
     * | keyName | The identifier of the device that is being connected to |
     * | key     | The shared access key auth                              |
     *
     * @param {Function} done       The callback to be invoked when `sendEvent`
     *                              completes execution.
     */
    Http.prototype.sendEvent = function (message, done) {
        var _this = this;
        /*Codes_SRS_NODE_DEVICE_HTTP_05_002: [The `sendEvent` method shall construct an HTTP request using information supplied by the caller, as follows:
        ```
        POST <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/events?api-version=<version> HTTP/1.1
        iothub-to: /devices/URI_ENCODED(<config.deviceId>)/messages/events
        User-Agent: <version string>
        Host: <config.host>
    
        <message>
        ```]*/
        this._ensureAgentString(function () {
            /*Codes_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
            _this._authenticationProvider.getDeviceCredentials(function (err, config) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
                    done(err);
                }
                else {
                    var path = azure_iot_common_1.endpoint.deviceEventPath(azure_iot_common_1.encodeUriComponentStrict(config.deviceId));
                    /*Codes_SRS_NODE_DEVICE_HTTP_41_002: [ `productInfo` should be set in the HTTP User-Agent Header if set using `setOptions` ]*/
                    var httpHeaders = {
                        'iothub-to': path,
                        'User-Agent': _this._userAgentString
                    };
                    _this._insertAuthHeaderIfNecessary(httpHeaders, config);
                    for (var i = 0; i < message.properties.count(); i++) {
                        var propItem = message.properties.getItem(i);
                        /*Codes_SRS_NODE_DEVICE_HTTP_13_001: [ sendEvent shall add message properties as HTTP headers and prefix the key name with the string iothub-app. ]*/
                        httpHeaders[MESSAGE_PROP_HEADER_PREFIX + propItem.key] = propItem.value;
                    }
                    if (message.messageId) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_014: [If the `message` object has a `messageId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-MessageId`.]*/
                        httpHeaders['IoTHub-MessageId'] = message.messageId;
                    }
                    if (message.correlationId) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_015: [If the `message` object has a `correlationId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-CorrelationId`.]*/
                        httpHeaders['IoTHub-CorrelationId'] = message.correlationId;
                    }
                    if (message.userId) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_016: [If the `message` object has a `userId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-UserId`.]*/
                        httpHeaders['IoTHub-UserId'] = message.userId;
                    }
                    if (message.to) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_017: [If the `message` object has a `to` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-To`.]*/
                        httpHeaders['IoTHub-To'] = message.to;
                    }
                    if (message.expiryTimeUtc) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_018: [If the `message` object has a `expiryTimeUtc` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Expiry`.]*/
                        httpHeaders['IoTHub-Expiry'] = message.expiryTimeUtc;
                    }
                    if (message.ack) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_019: [If the `message` object has a `ack` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Ack`.]*/
                        httpHeaders['IoTHub-Ack'] = message.ack;
                    }
                    if (message.contentType) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_037: [If the `message` object has a `contentType` property, the value of the property shall be inserted in the headers of the HTTP request with the key `iothub-contenttype`.]*/
                        httpHeaders['iothub-contenttype'] = message.contentType;
                    }
                    if (message.contentEncoding) {
                        /*Codes_SRS_NODE_DEVICE_HTTP_16_038: [If the `message` object has a `contentEncoding` property, the value of the property shall be inserted in the headers of the HTTP request with the key `iothub-contentencoding`.]*/
                        httpHeaders['iothub-contentencoding'] = message.contentEncoding;
                    }
                    if (message.interfaceId) {
                        httpHeaders['iothub-interface-id'] = message.interfaceId;
                    }
                    /*Codes_SRS_NODE_DEVICE_HTTP_16_013: [If using x509 authentication the `Authorization` header shall not be set and the x509 parameters shall instead be passed to the underlying transpoort.]*/
                    var request = _this._http.buildRequest('POST', path + azure_iot_common_1.endpoint.versionQueryString(), httpHeaders, config.host, config.x509, handleResponse(done));
                    request.write(message.getBytes());
                    request.end();
                }
            });
        });
    };
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#sendEventBatch
     * @description     The `sendEventBatch` method sends a list of event messages to the IoT Hub
     *                  as the device indicated in the `config` parameter.
     * @param {array<Message>} messages   Array of [Message]{@linkcode module:common/message.Message}
     *                                    objects to be sent as a batch.
     * @param {Object}  config            This is a dictionary containing the
     *                                    following keys and values:
     *
     * | Key     | Value                                                   |
     * |---------|---------------------------------------------------------|
     * | host    | The host URL of the Azure IoT Hub                       |
     * | keyName | The identifier of the device that is being connected to |
     * | key     | The shared access key auth                              |
     *
     * @param {Function}      done      The callback to be invoked when
     *                                  `sendEventBatch` completes execution.
     */
    Http.prototype.sendEventBatch = function (messages, done) {
        var _this = this;
        this._ensureAgentString(function () {
            /*Codes_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
            _this._authenticationProvider.getDeviceCredentials(function (err, config) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
                    done(err);
                }
                else {
                    var constructBatchBody = function (messages) {
                        var body = '[';
                        messages.forEach(function (message, index) {
                            var buffMsg = Buffer.from(message.getData());
                            if (index > 0)
                                body += ',';
                            body += '{\"body\":\"' + buffMsg.toString('base64') + '\"';
                            // Get the properties
                            var propertyIdx = 0;
                            var property = ',\"properties\":{';
                            for (propertyIdx = 0; propertyIdx < message.properties.count(); propertyIdx++) {
                                if (propertyIdx > 0)
                                    property += ',';
                                var propItem = message.properties.getItem(propertyIdx);
                                /*Codes_SRS_NODE_DEVICE_HTTP_13_002: [ sendEventBatch shall prefix the key name for all message properties with the string iothub-app. ]*/
                                property += '\"' + MESSAGE_PROP_HEADER_PREFIX + propItem.key + '\":\"' + propItem.value + '\"';
                            }
                            if (propertyIdx > 0) {
                                property += '}';
                                body += property;
                            }
                            body += '}';
                        });
                        body += ']';
                        return body;
                    };
                    /*Codes_SRS_NODE_DEVICE_HTTP_05_003: [The `sendEventBatch` method shall construct an HTTP request using information supplied by the caller, as follows:
                    ```
                    POST <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/events?api-version=<version> HTTP/1.1
                    iothub-to: /devices/URI_ENCODED(<config.deviceId>)/messages/events
                    User-Agent: <version string>
                    Content-Type: application/vnd.microsoft.iothub.json
                    Host: <config.host>
          
                    {"body":"<Base64 Message1>","properties":{"<key>":"<value>"}},
                    {"body":"<Base64 Message1>"}...
                    ```]*/
                    var path = azure_iot_common_1.endpoint.deviceEventPath(azure_iot_common_1.encodeUriComponentStrict(config.deviceId));
                    var httpHeaders = {
                        'iothub-to': path,
                        'Content-Type': 'application/vnd.microsoft.iothub.json',
                        'User-Agent': _this._userAgentString
                    };
                    _this._insertAuthHeaderIfNecessary(httpHeaders, config);
                    /*Codes_SRS_NODE_DEVICE_HTTP_16_013: [If using x509 authentication the `Authorization` header shall not be set and the x509 parameters shall instead be passed to the underlying transpoort.]*/
                    var request = _this._http.buildRequest('POST', path + azure_iot_common_1.endpoint.versionQueryString(), httpHeaders, config.host, config.x509, handleResponse(done));
                    var body = constructBatchBody(messages);
                    request.write(body);
                    request.end();
                }
            });
        });
    };
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#setOptions
     * @description     This methods sets the HTTP specific options of the transport.
     *
     * @param {Function}      done      The callback to be invoked when `setOptions` completes.
     */
    Http.prototype.setOptions = function (options, done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_011: [The HTTP transport should use the x509 settings passed in the `options` object to connect to the service if present.]*/
        if (options.hasOwnProperty('cert')) {
            this._authenticationProvider.setX509Options({
                cert: options.cert,
                key: options.key,
                passphrase: options.passphrase
            });
        }
        /*Codes_SRS_NODE_DEVICE_HTTP_41_001: [ The HTTP transport should use the productInfo string in the `options` object if present ]*/
        if (options.productInfo) {
            // To enforce proper use of the productInfo option, if the setOption is called after HTTP calls have already been made (therefore _userAgentString already set) an error is thrown.
            if (this._userAgentString) {
                /*Codes_SRS_NODE_DEVICE_HTTP_41_003: [ `productInfo` must be set before `http._ensureAgentString` is invoked for the first time ]*/
                throw Error('Ensure you call setOption for productInfo before initiating any connection to IoT Hub');
            }
            else {
                this._productInfo = options.productInfo;
            }
        }
        /* Codes_SRS_NODE_DEVICE_HTTP_06_001: [The `setOptions` method shall throw an `InvalidOperationError` if the method is called with token renewal options while using using cert or non renewal authentication.] */
        if (options.tokenRenewal) {
            if (this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.X509) {
                throw new azure_iot_common_1.errors.InvalidOperationError('cannot set token renewal options when using X509 authentication');
            }
            else if (!this._authenticationProvider.setTokenRenewalValues) {
                throw new azure_iot_common_1.errors.InvalidOperationError('can only set token renewal options when using pre-shared key authentication');
            }
            else {
                /* Codes_SRS_NODE_DEVICE_HTTP_06_002: [The authentication providers `setTokenRenewalValues` method shall be invoked with the values provided in the tokenRenewal option.] */
                this._authenticationProvider.setTokenRenewalValues(options.tokenRenewal.tokenValidTimeInSeconds, options.tokenRenewal.tokenRenewalMarginInSeconds);
            }
        }
        /*Codes_SRS_NODE_DEVICE_HTTP_16_010: [`setOptions` should not throw if `done` has not been specified.]*/
        /*Codes_SRS_NODE_DEVICE_HTTP_16_005: [If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments when successful.]*/
        /*Codes_SRS_NODE_DEVICE_HTTP_16_009: [If `done` has been specified the `setOptions` method shall call the `done` callback with a standard javascript `Error` object when unsuccessful.]*/
        this._http.setOptions(options);
        // setOptions used to exist both on Http and HttpReceiver with different options class. In order not to break backward compatibility we have
        // to check what properties this options object has to figure out what to do with it.
        if (options.hasOwnProperty('http') && options.http.hasOwnProperty('receivePolicy')) {
            /*Codes_SRS_NODE_DEVICE_HTTP_16_004: [The `setOptions` method shall call the `setOptions` method of the HTTP Receiver with the content of the `http.receivePolicy` property of the `options` parameter.]*/
            this._setReceiverOptions(options.http.receivePolicy);
            if (done)
                done();
        }
        else if (options.hasOwnProperty('interval')
            || options.hasOwnProperty('at')
            || options.hasOwnProperty('cron')
            || options.hasOwnProperty('manualPolling')
            || options.hasOwnProperty('drain')) {
            this._setReceiverOptions(options);
            if (done)
                done();
        }
    };
    /**
     * @private
     * @method          module:azure-iot-device-http.HttpReceiver#receive
     * @description     The receive method queries the IoT Hub immediately (as the device indicated in the
     *                  `config` constructor parameter) for the next message in the queue.
     */
    /*Codes_SRS_NODE_DEVICE_HTTP_05_004: [The receive method shall construct an HTTP request using information supplied by the caller, as follows:
    GET <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    iothub-to: /devices/URI_ENCODED(<config.deviceId>)/messages/devicebound
    User-Agent: <version string>
    Host: <config.host>
    ]*/
    Http.prototype.receive = function () {
        var _this = this;
        this._ensureAgentString(function () {
            /*Codes_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
            _this._authenticationProvider.getDeviceCredentials(function (err, config) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
                    debug('Error while receiving: ' + err.toString());
                    _this.emit('error', err);
                }
                else {
                    var path_1 = azure_iot_common_1.endpoint.deviceMessagePath(azure_iot_common_1.encodeUriComponentStrict(config.deviceId));
                    var httpHeaders_1 = {
                        'iothub-to': path_1,
                        'User-Agent': _this._userAgentString
                    };
                    _this._insertAuthHeaderIfNecessary(httpHeaders_1, config);
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_017: [If opts.drain is true all messages in the queue should be pulled at once.]*/
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_018: [If opts.drain is false, only one message shall be received at a time]*/
                    var drainRequester_1 = new events_1.EventEmitter();
                    drainRequester_1.on('nextRequest', function () {
                        var request = _this._http.buildRequest('GET', path_1 + azure_iot_common_1.endpoint.versionQueryString(), httpHeaders_1, config.host, config.x509, function (err, body, res) {
                            if (!err) {
                                //
                                // A status code of 200 indicates an actual message returned.
                                // A status code of 204 indicates that there actually wasn't a message in the c2d queue.
                                //
                                if (res.statusCode === 200) {
                                    var msg = _this._http.toMessage(res, body);
                                    if (_this._opts.drain) {
                                        drainRequester_1.emit('nextRequest');
                                    }
                                    _this.emit('message', msg);
                                }
                            }
                            else {
                                err.response = res;
                                err.responseBody = body;
                                _this.emit('error', err);
                            }
                        });
                        request.end();
                    });
                    drainRequester_1.emit('nextRequest');
                }
            });
        });
    };
    /**
     * @private
     * @method              module:azure-iot-device-http.Http#complete
     * @description         Settles the message as complete and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as complete.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    Http.prototype.complete = function (message, done) {
        if (!message)
            throw new ReferenceError('Invalid message object.');
        this._sendFeedback('complete', message, done);
    };
    /**
     * @private
     * @method              module:azure-iot-device-http.Http#reject
     * @description         Settles the message as rejected and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as rejected.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    Http.prototype.reject = function (message, done) {
        if (!message)
            throw new ReferenceError('Invalid message object.');
        this._sendFeedback('reject', message, done);
    };
    /**
     * @private
     * @method              module:azure-iot-device-http.Http#abandon
     * @description         Settles the message as abandoned and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as abandoned.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    Http.prototype.abandon = function (message, done) {
        if (!message)
            throw new ReferenceError('Invalid message object.');
        this._sendFeedback('abandon', message, done);
    };
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#updateSharedAccessSignature
     * @description     This methods sets the SAS token used to authenticate with the IoT Hub service.
     *
     * @param {String}        sharedAccessSignature  The new SAS token.
     * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
     */
    Http.prototype.updateSharedAccessSignature = function (sharedAccessSignature, done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_006: [The updateSharedAccessSignature method shall save the new shared access signature given as a parameter to its configuration.] */
        this._authenticationProvider.updateSharedAccessSignature(sharedAccessSignature);
        /*Codes_SRS_NODE_DEVICE_HTTP_16_007: [The updateSharedAccessSignature method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating that the client does not need to reestablish the transport connection.] */
        done(null, new azure_iot_common_1.results.SharedAccessSignatureUpdated(false));
    };
    /**
     * @private
     */
    Http.prototype.enableC2D = function (callback) {
        var _this = this;
        this._ensureAgentString(function () {
            if (!_this._cronObj && !_this._intervalObj && !_this._timeoutObj) {
                if (_this._opts.interval) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_021: [If opts.interval is set, messages should be received repeatedly at that interval]*/
                    _this._intervalObj = setInterval(_this.receive.bind(_this), _this._opts.interval * 1000); // this._opts.interval is in seconds but setInterval takes milliseconds.
                    _this._receiverStarted = true;
                }
                else if (_this._opts.at) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_003: [if opts.at is set, messages shall be received at the Date and time specified.]*/
                    var at = _this._opts.at.getTime();
                    var diff = Math.max(at - Date.now(), 0);
                    _this._timeoutObj = setTimeout(_this.receive.bind(_this), diff);
                    _this._receiverStarted = true;
                }
                else if (_this._opts.cron) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_020: [If opts.cron is set messages shall be received according to the schedule described by the expression.]*/
                    _this._cronObj = cron.scheduleJob(_this._opts.cron, _this.receive.bind(_this));
                    _this._receiverStarted = true;
                }
                else if (_this._opts.manualPolling) {
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_023: [If opts.manualPolling is true, messages shall be received only when receive() is called] */
                    _this._receiverStarted = true;
                }
            }
            callback();
        });
    };
    /**
     * @private
     */
    Http.prototype.disableC2D = function (callback) {
        if (this._cronObj) {
            cron.cancelJob(this._cronObj);
            this._cronObj = null;
            this._receiverStarted = false;
        }
        if (this._intervalObj) {
            clearInterval(this._intervalObj);
            this._intervalObj = null;
            this._receiverStarted = false;
        }
        if (this._timeoutObj) {
            clearTimeout(this._timeoutObj);
            this._timeoutObj = null;
            this._receiverStarted = false;
        }
        if (this._opts.manualPolling) {
            this._receiverStarted = false;
        }
        callback();
    };
    /**
     * @private
     */
    Http.prototype.getTwin = function (done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_020: [`getTwin` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Twin is not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.updateTwinReportedProperties = function (done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_034: [`updateTwinReportedProperties` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Twin is not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.enableTwinDesiredPropertiesUpdates = function (done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_035: [`enableTwinDesiredPropertiesUpdates` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Twin is not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.disableTwinDesiredPropertiesUpdates = function (done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_036: [`disableTwinDesiredPropertiesUpdates` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Twin is not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.sendMethodResponse = function (response, done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_024: [`sendMethodResponse` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Direct methods are not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.onDeviceMethod = function (methodName, methodCallback) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_025: [`onDeviceMethod` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Direct methods are not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.enableMethods = function (callback) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_026: [`enableMethods` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Direct methods are not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.disableMethods = function (callback) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_027: [`disableMethods` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Direct methods are not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.enableInputMessages = function (callback) {
        /*Codes_SRS_NODE_DEVICE_HTTP_18_001: [`enableInputMessages` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Input messages are not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.disableInputMessages = function (callback) {
        /*Codes_SRS_NODE_DEVICE_HTTP_18_002: [`disableInputMessages` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Input messages are not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.sendOutputEvent = function (outputName, message, done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_18_003: [`sendOutputEvent` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Output events are not implemented over HTTP.');
    };
    /**
     * @private
     */
    Http.prototype.sendOutputEventBatch = function (outputName, messages, done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_18_004: [`sendOutputEventBatch` shall throw a `NotImplementedError`.]*/
        throw new azure_iot_common_1.errors.NotImplementedError('Output events are not implemented over HTTP.');
    };
    Http.prototype._insertAuthHeaderIfNecessary = function (headers, credentials) {
        if (this._authenticationProvider.type === azure_iot_common_1.AuthenticationType.Token) {
            /*Codes_SRS_NODE_DEVICE_HTTP_16_012: [If using a shared access signature for authentication, the following additional header should be used in the HTTP request:
            ```
            Authorization: <config.sharedAccessSignature>
            ```]*/
            /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_030: [If using x509 authentication the `Authorization` header shall not be set and the x509 parameters shall instead be passed to the underlying transpoort.]*/
            headers.Authorization = credentials.sharedAccessSignature.toString();
        }
    };
    /**
     * @private
     * This method sends the feedback action to the IoT Hub.
     *
     * @param {String}  action    This parameter must be equal to one of the
     *                            following possible values:
     *
     * | Value    | Action                                                                                  |
     * |----------|-----------------------------------------------------------------------------------------|
     * | abandon  | Directs the IoT Hub to re-enqueue a message so it may be received again later.          |
     * | reject   | Directs the IoT Hub to delete a message from the queue and record that it was rejected. |
     * | complete | Directs the IoT Hub to delete a message from the queue and record that it was accepted. |
     *
     * @param {String}        message   The message for which feedback is being sent.
     * @param {Function}      done      The callback to be invoked when
     *                                  `sendFeedback` completes execution.
     */
    Http.prototype._sendFeedback = function (action, message, done) {
        var _this = this;
        /*Codes_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
        this._authenticationProvider.getDeviceCredentials(function (err, config) {
            if (err) {
                /*Codes_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
                done(err);
            }
            else {
                var method = void 0;
                var resultConstructor_1 = null;
                var path = azure_iot_common_1.endpoint.deviceFeedbackPath(azure_iot_common_1.encodeUriComponentStrict(config.deviceId), message.lockToken);
                var httpHeaders = {
                    'If-Match': message.lockToken,
                    'User-Agent': _this._userAgentString
                };
                _this._insertAuthHeaderIfNecessary(httpHeaders, config);
                /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_009: [abandon shall construct an HTTP request using information supplied by the caller, as follows:
                POST <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound/<lockToken>/abandon?api-version=<version> HTTP/1.1
                Authorization: <config.sharedAccessSignature>
                If-Match: <lockToken>
                Host: <config.host>]
                */
                if (action === 'abandon') {
                    path += '/abandon' + azure_iot_common_1.endpoint.versionQueryString();
                    method = 'POST';
                    resultConstructor_1 = azure_iot_common_1.results.MessageAbandoned;
                }
                else if (action === 'reject') {
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_010: [reject shall construct an HTTP request using information supplied by the caller, as follows:
                    DELETE <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound/<lockToken>?api-version=<version>&reject HTTP/1.1
                    Authorization: <config.sharedAccessSignature>
                    If-Match: <lockToken>
                    Host: <config.host>]*/
                    path += azure_iot_common_1.endpoint.versionQueryString() + '&reject';
                    method = 'DELETE';
                    resultConstructor_1 = azure_iot_common_1.results.MessageRejected;
                }
                else {
                    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_011: [complete shall construct an HTTP request using information supplied by the caller, as follows:
                    DELETE <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound/<lockToken>?api-version=<version> HTTP/1.1
                    Authorization: <config.sharedAccessSignature>
                    If-Match: <lockToken>
                    Host: <config.host>]*/
                    path += azure_iot_common_1.endpoint.versionQueryString();
                    method = 'DELETE';
                    resultConstructor_1 = azure_iot_common_1.results.MessageCompleted;
                }
                /*Codes_SRS_NODE_DEVICE_HTTP_05_008: [If any Http method encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
                var request = _this._http.buildRequest(method, path, httpHeaders, config.host, config.x509, function (err, body, response) {
                    if (done) {
                        if (!err && response.statusCode < 300) {
                            var result = new resultConstructor_1(response);
                            done(null, result);
                        }
                        else {
                            err.response = response;
                            err.responseBody = body;
                            done(err);
                        }
                    }
                });
                request.end();
            }
        });
    };
    /** @private
     * @method          module:azure-iot-device-http.HttpReceiver#setOptions
     * @description     This method sets the options defining how the receiver object should poll the IoT Hub service to get messages.
     *                  There is only one instance of the receiver object. If the receiver has already been created, calling setOptions will
     *                  change the options of the existing instance and restart it.
     *
     * @param {Object} opts Receiver options formatted as: { interval: (Number), at: (Date), cron: (string), drain: (Boolean) }
     */
    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_001: [The setOptions method shall accept an argument formatted as such:
    {
        interval: (Number),
        at: (Date)
        cron: (string)
        drain: (Boolean)
    }]*/
    Http.prototype._setReceiverOptions = function (opts) {
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_019: [If the receiver is already running with a previous configuration, the existing receiver should be restarted with the new configuration]*/
        var restartReceiver = this._receiverStarted;
        if (this._receiverStarted) {
            this.disableC2D(function () {
                debug('Http c2d message polling disabled');
            });
        }
        if (!opts) {
            this._opts = defaultOptions;
        }
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_008: [Only one of the interval, at, and cron fields should be populated: if more than one is populated, an ArgumentError shall be thrown.]*/
        if ((opts.interval && opts.cron) ||
            (opts.interval && opts.at) ||
            (opts.interval && opts.manualPolling) ||
            (opts.at && opts.cron) ||
            (opts.at && opts.manualPolling) ||
            (opts.cron && opts.manualPolling)) {
            throw new azure_iot_common_1.errors.ArgumentError('Only one of the (interval|at|cron) fields should be set.');
        }
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_002: [opts.interval is not a number, an ArgumentError should be thrown.]*/
        if (opts.interval && typeof (opts.interval) !== 'number') {
            throw new azure_iot_common_1.errors.ArgumentError('The \'interval\' parameter must be a number');
        }
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_005: [If opts.interval is a negative number, an ArgumentError should be thrown.]*/
        if (opts.interval && opts.interval <= 0) {
            throw new azure_iot_common_1.errors.ArgumentError('the \'interval\' parameter must be strictly greater than 0 (zero)');
        }
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_022: [If opts.at is not a Date object, an ArgumentError should be thrown]*/
        if (opts.at && !(opts.at instanceof Date)) {
            throw new azure_iot_common_1.errors.ArgumentError('The \'at\' parameter must be a Date');
        }
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_004: [if opts.cron is set it shall be a string that can be interpreted as a cron expression]*/
        if (opts.cron && typeof (opts.cron) !== 'string') {
            throw new azure_iot_common_1.errors.ArgumentError('The \'at\' parameter must be a String and use the cron syntax (see https://www.npmjs.com/package/node-crontab)');
        }
        this._opts = opts;
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_019: [If the receiver is already running with a previous configuration, the existing receiver should be restarted with the new configuration]*/
        if (restartReceiver) {
            this.enableC2D(function () {
                debug('Http c2d message polling enabled');
            });
        }
    };
    Http.prototype._ensureAgentString = function (done) {
        var _this = this;
        if (this._userAgentString) {
            done();
        }
        else {
            azure_iot_device_1.getUserAgentString(this._productInfo, function (agent) {
                _this._userAgentString = agent;
                done();
            });
        }
    };
    return Http;
}(events_1.EventEmitter));
exports.Http = Http;
//# sourceMappingURL=http.js.map