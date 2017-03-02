// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var amqp10 = require('amqp10');
var Promise = require('bluebird');
var AmqpMessage = require('./amqp_message.js');
var AmqpReceiver = require('./amqp_receiver.js');
var errors = require('azure-iot-common').errors;
var results = require('azure-iot-common').results;

var uuid = require('uuid');
var debug = require('debug')('amqp-common');


var _putTokenSendingEndpoint = '$cbs';
var _putTokenReceivingEndpoint = '$cbs';

/**
 * @class module:azure-iot-amqp-base.Amqp
 * @classdesc Basic AMQP functionality used by higher-level IoT Hub libraries.
 *            Usually you'll want to avoid using this class and instead rely on higher-level implementations
 *            of the AMQP transport (see [azure-iot-device-amqp.Amqp]{@link module:azure-iot-device-amqp.Amqp} for example).
 *
 * @param   {Boolean}   autoSettleMessages      Boolean indicating whether messages should be settled automatically or if the calling code will handle it.
 * @param   {String}    sdkVersionString        String identifying the SDK used (device or service).
 */

/*Codes_SRS_NODE_COMMON_AMQP_16_001: [The Amqp constructor shall accept two parameters:
    A Boolean indicating whether the client should automatically settle messages:
        True if the messages should be settled automatically
        False if the caller intends to manually settle messages
        A string containing the version of the SDK used for telemetry purposes] */
function Amqp(autoSettleMessages, sdkVersionString) {
  var autoSettleMode = autoSettleMessages ? amqp10.Constants.receiverSettleMode.autoSettle : amqp10.Constants.receiverSettleMode.settleOnDisposition;
  // node-amqp10 has an automatic reconnection/link re-attach feature that is enabled by default.
  // In our case we want to control the reconnection flow ourselves, so we need to disable it.
  this._amqp = new amqp10.Client(amqp10.Policy.merge({
    senderLink: {
      attach: {
        properties: {
          'com.microsoft:client-version': sdkVersionString
        },
        maxMessageSize: 0,
      },
      encoder: function(body) {
        if(typeof body === 'string') {
          return new Buffer(body, 'utf8');
        } else {
          return body;
        }
      },
      reattach: {
        retries: 0,
        forever: false
      }
    },
    receiverLink: {
      attach: {
        properties: {
          'com.microsoft:client-version': sdkVersionString
        },
        maxMessageSize: 0,
        receiverSettleMode: autoSettleMode,
      },
      decoder: function(body) { return body; },
      reattach: {
        retries: 0,
        forever: false
      }
    },
    // reconnections will be handled at the client level, not the transport level.
    reconnect: {
      retries: 0,
      strategy: 'fibonnaci',
      forever: false
    }
  }, amqp10.Policy.EventHub));

  this._receivers = {};
  this._senders = {};
  this._putToken = {};
  //
  // This array will hold outstanding put token operations.  The array has
  // a monotonically increasing time ordering.  This is effected by the nature
  // of inserting new elements at the end of the array.  Note that elements may
  // be removed from the array at any index.  The elements are the following object
  // {
  //  putTokenCallback - The callback to be invoked on termination of the put token operation.
  //                     This could be because the put token operation response was received
  //                     from the service or because the put token operation times out.
  //
  //  expirationTime -   The number of seconds from the epoch, by which the put token operation will
  //                     be expected to finish.
  //
  //  correlationId -    The put token operation was sent with a message id.  The response
  //                     to the put token operation will contain this message id as the
  //                     correlation id.  This id is a uuid.
  // }
  //
  this._putToken.outstandingPutTokens = [];
  //
  // Currently a fixed value.  Could have a set option if we want to make this configurable.
  //
  this._putToken.numberOfSecondsToTimeout = 120;
  //
  // While there are ANY put token operations outstanding a timer will be invoked every
  // 10 seconds to examine the outstandingPutTokens array for any put tokens that may have
  // expired.
  //
  this._putToken.putTokenTimeOutExaminationInterval = 10000;
  this._connected = false;
}

/*Codes_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
function safeCallback(callback, error, result) {
  if (callback) {
    process.nextTick(function() {
      callback(error, result);
    });
  }
}

/**
 * @method             module:azure-iot-amqp-base.Amqp#connect
 * @description        Establishes a connection with the IoT Hub instance.
 * @param              uri    The uri to connect with.
 * @param {Function}   done   Called when the connection is established or if an error happened.
 */
Amqp.prototype.connect = function connect(uri, sslOptions, done) {
  /*Codes_SRS_NODE_COMMON_AMQP_06_002: [The `connect` method shall throw a ReferenceError if the uri parameter has not been supplied.] */
  if (!uri) throw new ReferenceError('The uri parameter can not be \'' + uri + '\'');
  if (!this._connected) {
    this.uri = uri;
    if (this.uri.substring(0, 3) === 'wss') {
      var wsTransport = require('amqp10-transport-ws');
      wsTransport.register(amqp10.TransportProvider);
    }
    this._amqp.policy.connect.options.sslOptions = sslOptions;
    var connectError = null;
    var connectErrorHander = function (err) {
      connectError = err;
    };
    this._amqp.on('client:errorReceived', connectErrorHander);
    this._amqp.connect(this.uri)
      .then(function (result) {
        debug('AMQP transport connected.');
        this._connected = true;
        /*Codes_SRS_NODE_COMMON_AMQP_16_002: [The `connect` method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
        safeCallback(done, null, new results.Connected(result));
        return null;
      }.bind(this))
      .catch(function (err) {
        this._amqp.removeListener('client:errorReceived', connectErrorHander);
        this._connected = false;
        /*Codes_SRS_NODE_COMMON_AMQP_16_003: [The `connect` method shall call the `done` callback if the connection fails.] */
        safeCallback(done, connectError || err);
      }.bind(this));
  } else {
    debug('connect called when already connected.');
    safeCallback(done, null, new results.Connected());
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#setDisconnectCallback
 * @description        Sets the callback that should be called in case of disconnection.
 * @param {Function}   disconnectCallback   Called when the connection disconnected.
 */
Amqp.prototype.setDisconnectHandler = function (disconnectCallback) {
  this._amqp.on('connection:closed', function () {
    this._connected = false;
    disconnectCallback('amqp10: connection closed');
  }.bind(this));
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#disconnect
 * @description        Disconnects the link to the IoT Hub instance.
 * @param {Function}   done   Called when disconnected of if an error happened.
 */
Amqp.prototype.disconnect = function disconnect(done) {
  var self = this;

  /*Codes_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
  var openLinks = [];
  for (var sender_endpoint in this._senders) {
    if (this._senders.hasOwnProperty(sender_endpoint)) {
      openLinks.push(this._senders[sender_endpoint]);
      delete this._senders[sender_endpoint];
    }
  }
  self._senders = {};

  for (var receiver_endpoint in this._receivers) {
    if (this._receivers.hasOwnProperty(receiver_endpoint)) {
      openLinks.push(this._receivers[receiver_endpoint]._amqpReceiver);
      delete this._receivers[receiver_endpoint];
    }
  }
  self.receivers = {};

  Promise.all(openLinks.map(function (link) { return link.detach(); }))
         .then(this._amqp.disconnect.bind(this._amqp))
         .then(function (result) {
           self._connected = false;
           /*Codes_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the done callback when the application/service has been successfully disconnected from the service] */
           safeCallback(done, null, result);
           return null;
         })
         .catch(function (err) {
           /*SRS_NODE_COMMON_AMQP_16_005: [The disconnect method shall call the done callback and pass the error as a parameter if the disconnection is unsuccessful] */
           safeCallback(done, err);
         });
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#send
 * @description        Sends a message to the IoT Hub instance.
 *
 * @param {Message}   message   The message to send.
 * @param {string}    endpoint  The endpoint to use when sending the message.
 * @param {string}    to        The destination of the message.
 * @param {Function}  done      Called when the message is sent or if an error happened.
 */
Amqp.prototype.send = function send(message, endpoint, to, done) {
  if (!this._connected) {
    safeCallback(done, new errors.NotConnectedError('Cannot send while disconnected.'));
  } else {
    /*Codes_SRS_NODE_COMMON_AMQP_16_006: [The `send` method shall construct an AMQP message using information supplied by the caller, as follows:
    The ‘to’ field of the message should be set to the ‘to’ argument.
    The ‘body’ of the message should be built using the message argument.] */

    var amqpMessage = AmqpMessage.fromMessage(message);
    if (to !== undefined) {
      amqpMessage.properties.to = to;
    }

    var sendAction = function (sender, msg, done) {
      sender.send(msg)
        .then(function (state) {
          safeCallback(done, null, new results.MessageEnqueued(state));
          return null;
        })
        .catch(function (err) {
          /*Codes_SRS_NODE_IOTHUB_AMQPCOMMON_16_007: [If sendEvent encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
          safeCallback(done, err);
        });
    };

    if (!this._senders[endpoint]) {
      this.attachSenderLink(endpoint, null, function (err, sender) {
        if (err) {
          safeCallback(done, err);
        } else {
          sendAction(sender, amqpMessage, done);
        }
      });
    } else {
      sendAction(this._senders[endpoint], amqpMessage, done);
    }
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#getReceiver
 * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
 *
 * @param {string}    endpoint  Endpoint used for the receiving link.
 * @param {Function}  done      Callback used to return the {@linkcode AmqpReceiver} object.
 */
Amqp.prototype.getReceiver = function getReceiver(endpoint, done) {
  /*Codes_SRS_NODE_COMMON_AMQP_16_010: [If a receiver for this endpoint doesn’t exist, the getReceiver method should create a new AmqpReceiver object and then call the done() method with the object that was just created as an argument.] */
  if (!this._receivers[endpoint]) {
    this.attachReceiverLink(endpoint, null, done);
  }
  else {
    /*Codes_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the done() method with the existing instance as an argument.] */
    safeCallback(done, null, this._receivers[endpoint]);
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#attachReceiverLink
 * @description        Creates and attaches an AMQP receiver link for the specified endpoint.
 *
 * @param {string}    endpoint    Endpoint used for the receiver link.
 * @param {Object}    linkOptions Configuration options to be merged with the AMQP10 policies for the link..
 * @param {Function}  done        Callback used to return the link object or an Error.
 */
Amqp.prototype.attachReceiverLink = function attachReceiverLink(endpoint, linkOptions, done) {
  /*Codes_SRS_NODE_COMMON_AMQP_16_017: [The `attachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
  if (!endpoint) {
    throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
  }

  /*Codes_SRS_NODE_COMMON_AMQP_16_033: [The `attachReceiverLink` method shall call the `done` callback with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
  if (!this._connected) {
    safeCallback(done, new errors.NotConnectedError('Cannot send while disconnected.'));
  } else {
    var self = this;
    var connectionError = null;
    var clientErrorHandler = function(err) {
      connectionError = err;
    };
    /*Codes_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    this._amqp.on('client:errorReceived', clientErrorHandler);

    /*Codes_SRS_NODE_COMMON_AMQP_06_004: [The `attachReceiverLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
    /*Codes_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `createReceiver` on the `amqp10` client object.]*/
    self._amqp.createReceiver(endpoint, linkOptions)
      .then(function (receiver) {
        self._amqp.removeListener('client:errorReceived', clientErrorHandler);
        if (!connectionError) {
          self._receivers[endpoint] = new AmqpReceiver(receiver);
          debug('AmqpReceiver object created for endpoint: ' + endpoint);
          /*Codes_SRS_NODE_COMMON_AMQP_16_020: [The `attachReceiverLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
          safeCallback(done, null, self._receivers[endpoint]);
        } else {
          /*Codes_SRS_NODE_COMMON_AMQP_16_021: [The `attachReceiverLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
          safeCallback(done, connectionError);
        }

        return null;
      })
      .catch(function (err) {
        var error = new errors.NotConnectedError('AMQP: Could not create receiver');
        error.amqpError = err;
        /*Codes_SRS_NODE_COMMON_AMQP_16_021: [The `attachReceiverLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        safeCallback(done, error);
      });
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#attachSenderLink
 * @description        Creates and attaches an AMQP sender link for the specified endpoint.
 *
 * @param {string}    endpoint    Endpoint used for the sender link.
 * @param {Object}    linkOptions Configuration options to be merged with the AMQP10 policies for the link..
 * @param {Function}  done        Callback used to return the link object or an Error.
 */
Amqp.prototype.attachSenderLink = function attachSenderLink(endpoint, linkOptions, done) {
  /*Codes_SRS_NODE_COMMON_AMQP_16_012: [The `attachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
  if (!endpoint) {
    throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
  }

  /*Codes_SRS_NODE_COMMON_AMQP_16_032: [The `attachSenderLink` method shall call the `done` callback with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
  if (!this._connected) {
    safeCallback(done, new errors.NotConnectedError('Cannot send while disconnected.'));
  } else {
    var self = this;
    var connectionError = null;
    var clientErrorHandler = function(err) {
      connectionError = err;
    };
    /*Codes_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    this._amqp.on('client:errorReceived', clientErrorHandler);

    /*Codes_SRS_NODE_COMMON_AMQP_06_003: [The `attachSenderLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
    /*Codes_SRS_NODE_COMMON_AMQP_16_013: [The `attachSenderLink` method shall call `createSender` on the `amqp10` client object.]*/
    self._amqp.createSender(endpoint, linkOptions)
      .then(function (sender) {
        self._amqp.removeListener('client:errorReceived', clientErrorHandler);
        if (!connectionError) {
          self._senders[endpoint] = sender;
          debug('Sender object created for endpoint: ' + endpoint);
          /*Codes_SRS_NODE_COMMON_AMQP_16_015: [The `attachSenderLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
          safeCallback(done, null, self._senders[endpoint]);
        } else {
          /*Codes_SRS_NODE_COMMON_AMQP_16_016: [The `attachSenderLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
          safeCallback(done, connectionError);
        }

        return null;
      })
      .catch(function (err) {
        /*Codes_SRS_NODE_IOTHUB_AMQPCOMMON_16_007: [If sendEvent encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
        var error = new errors.NotConnectedError('AMQP: Could not create sender');
        error.amqpError = err;
        safeCallback(done, error);
      });
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#detachReceiverLink
 * @description        Detaches an AMQP receiver link for the specified endpoint if it exists.
 *
 * @param {string}    endpoint  Endpoint used to identify which link should be detached.
 * @param {Function}  done      Callback used to signal success or failure of the detach operation.
 */
Amqp.prototype.detachReceiverLink = function detachReceiverLink(endpoint, detachCallback) {
  /*Codes_SRS_NODE_COMMON_AMQP_16_027: [The `detachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
  if (!endpoint) {
    throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
  }
  var self = this;
  if(!this._receivers[endpoint]) {
    safeCallback(detachCallback);
  } else {
    this._detachLink(this._receivers[endpoint]._amqpReceiver, function(err) {
      delete(self._receivers[endpoint]);
      detachCallback(err);
    });
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#detachSenderLink
 * @description        Detaches an AMQP sender link for the specified endpoint if it exists.
 *
 * @param {string}    endpoint  Endpoint used to identify which link should be detached.
 * @param {Function}  done      Callback used to signal success or failure of the detach operation.
 */
Amqp.prototype.detachSenderLink = function detachSenderLink(endpoint, detachCallback) {
  /*Codes_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
  if (!endpoint) {
    throw new ReferenceError('endpoint cannot be \'' + endpoint + '\'');
  }
  var self = this;
  this._detachLink(this._senders[endpoint], function(err) {
    delete(self._senders[endpoint]);
    detachCallback(err);
  });
};

Amqp.prototype._detachLink = function _detachLink(link, detachCallback) {
  if (!link) {
    /*Codes_SRS_NODE_COMMON_AMQP_16_030: [The `detachReceiverLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
    /*Codes_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
    safeCallback(detachCallback);
  } else {
    /*Codes_SRS_NODE_COMMON_AMQP_16_028: [The `detachReceiverLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
    /*Codes_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
    link.detach().then(function () {
      /*Codes_SRS_NODE_COMMON_AMQP_16_029: [The `detachReceiverLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
      /*Codes_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
      safeCallback(detachCallback);
    }).catch(function (err) {
      /*Codes_SRS_NODE_COMMON_AMQP_16_031: [The `detachReceiverLink` method shall call the `done` callback with an `Error` object if there was an error while detaching the link.]*/
      /*Codes_SRS_NODE_COMMON_AMQP_16_026: [The `detachSenderLink` method shall call the `done` callback with an `Error` object if there was an error while detaching the link.]*/
      safeCallback(detachCallback, err);
    });
  }
};

Amqp.prototype._removeExpiredPutTokens = function removeExpiredPutTokens() {
  var currentTime = Math.round(Date.now() / 1000);
  var expiredPutTokens = [];
  while (this._putToken.outstandingPutTokens.length > 0) {
    //
    // The timeouts in this array by definition are monotonically increasing.  We will be done looking if we
    // hit one that is not yet expired.
    //
    /*Codes_SRS_NODE_COMMON_AMQP_06_007: [ The `putToken` method will time out the put token operation if no response is returned within a configurable number of seconds.]*/
    if (this._putToken.outstandingPutTokens[0].expirationTime < currentTime) {
      expiredPutTokens.push(this._putToken.outstandingPutTokens[0]);
      this._putToken.outstandingPutTokens.splice(0, 1);
    } else {
      break;
    }
  }
  expiredPutTokens.forEach(function(currentExpiredPut) {
    /*Codes_SRS_NODE_COMMON_AMQP_06_008: [ The `putToken` method will invoke the `putTokenCallback` (if supplied) with an error object if the put token operation timed out. .]*/
    safeCallback(currentExpiredPut.putTokenCallback, new errors.TimeoutError('Put Token operation had no response within ' + this._putToken.numberOfSecondsToTimeout));
  }.bind(this));
  //
  // If there are any putTokens left keep trying to time them out.
  //
  if (this._putToken.outstandingPutTokens.length > 0) {
    this._putToken.timeoutTimer = setTimeout(this._removeExpiredPutTokens.bind(this), this._putToken.putTokenTimeOutExaminationInterval);
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#putToken
 * @description        Sends a put token operation to the IoT Hub to provide authentication for a device.
 * @param              audience          The path that describes what is being authenticated.  An example would be
 *                                       hub.azure-devices.net%2Fdevices%2Fmydevice
 * @param              token             The actual sas token being used to authenticate the device.  For the most
 *                                       part the audience is likely to be the sr field of the token.
 * @param {Function}   putTokenCallback  Called when the put token operation terminates.
 */
Amqp.prototype.putToken = function(audience, token, putTokenCallback) {

  /*Codes_SRS_NODE_COMMON_AMQP_06_016: [The `putToken` method shall throw a ReferenceError if the `audience` argument is falsy.]*/
  if (!audience) {
    throw new ReferenceError('audience cannot be \'' + audience + '\'');
  }

  /*Codes_SRS_NODE_COMMON_AMQP_06_017: [The `putToken` method shall throw a ReferenceError if the `token` argument is falsy.]*/
  if (!token) {
    throw new ReferenceError('token cannot be \'' + token + '\'');
  }

  /*Codes_SRS_NODE_COMMON_AMQP_06_018: [The `putToken` method shall call the `putTokenCallback` callback (if provided) with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
  if (!this._connected) {
    safeCallback(putTokenCallback, new errors.NotConnectedError('Cannot putToken while disconnected.'));
  } else if (!this._senders[_putTokenSendingEndpoint] || !this._receivers[_putTokenReceivingEndpoint]) {
    /*Codes_SRS_NODE_COMMON_AMQP_06_022: [ The `putToken` method shall call the `putTokenCallback` callback (if provided) with a `NotConnectedError` object if the `initializeCBS` has NOT been invoked.]*/
    safeCallback(putTokenCallback, new errors.NotConnectedError('Cannot putToken unless initializeCBS invoked.'));
  } else {
    /*Codes_SRS_NODE_COMMON_AMQP_06_005: [The `putToken` method shall construct an amqp message that contains the following application properties:
    'operation': 'put-token'
    'type': 'servicebus.windows.net:sastoken'
    'name': <audience>

    and system properties of

    'to': '$cbs'
    'messageId': <uuid>
    'reply_to': 'cbs']

    and a body containing <sasToken>. */
    var amqpMessage = new AmqpMessage();
    amqpMessage.applicationProperties = {
      operation: 'put-token',
      type: 'servicebus.windows.net:sastoken',
      name: audience
    };
    amqpMessage.body = token;
    amqpMessage.properties = {
      to: '$cbs',
      messageId: uuid.v4(),
      reply_to: 'cbs'
    };
    var outstandingPutToken = {
      putTokenCallback: putTokenCallback,
      expirationTime: Math.round(Date.now() / 1000) + this._putToken.numberOfSecondsToTimeout,
      correlationId: amqpMessage.properties.messageId
    };
    this._putToken.outstandingPutTokens.push(outstandingPutToken);
    //
    // If this is the first put token then start trying to time it out.
    //
    if (this._putToken.outstandingPutTokens.length === 1) {
      this._putToken.timeoutTimer = setTimeout(this._removeExpiredPutTokens.bind(this), this._putToken.putTokenTimeOutExaminationInterval);
    }
    /*Codes_SRS_NODE_COMMON_AMQP_06_015: [The `putToken` method shall send this message over the `$cbs` sender link.]*/
    this._senders[_putTokenSendingEndpoint].send(amqpMessage)
      .then(function () {
        //
        // Only here if the message was queued successfully.  Yay!  We already set up a callback
        // to handle the response message of the put token operation.  That will finish up anything
        // we need to do.
        //
        return null;
      })
      .catch(function (err) {
        //
        // Sadness.  Something went wrong sending the put token.
        //
        // Find the operation in the outstanding array.  Remove it from the array since, well, it's not outstanding anymore.
        // Since we may have arrived here asynchronously, we simply can't assume that it is the end of the array.  But,
        // it's more likely near the end.
        //
        for (var i = this._putToken.outstandingPutTokens.length - 1;i >= 0; i--) {
          if (this._putToken.outstandingPutTokens[i].correlationId === amqpMessage.properties.messageId) {
            var outStandingPutTokenInError = this._putToken.outstandingPutTokens[i];
            this._putToken.outstandingPutTokens.splice(i, 1);
            //
            // This was the last outstanding put token.  No point in having a timer around trying to time nothing out.
            //
            if (this._putToken.outstandingPutTokens.length === 0) {
              clearTimeout(this._putToken.timeoutTimer);
            }
            /*Codes_SRS_NODE_COMMON_AMQP_06_006: [The `putToken` method shall call `putTokenCallback` (if supplied) if the `send` generates an error such that no response from the service will be forthcoming.]*/
            safeCallback(outStandingPutTokenInError.putTokenCallback, err);
            break;
          }
        }
      }.bind(this));
  }
};

/**
 * @method             module:azure-iot-amqp-base.Amqp#initializeCBS
 * @description        If CBS authentication is to be used, set it up.
 * @param {Function}   initializeCBSCallback  Called when the initialization terminates.
 */
Amqp.prototype.initializeCBS = function(initializeCBSCallback) {
  if (!this._connected) {
    /*Codes_SRS_NODE_COMMON_AMQP_06_021: [If given as an argument, the `initializeCBS` method shall call `initializeCBSCallback` with a `NotConnectedError` object if amqp client is not connnected. **]*/
    safeCallback(initializeCBSCallback, new errors.NotConnectedError('Initializing CBS must only be done on a connnected client'));
  } else {
    /*Codes_SRS_NODE_COMMON_AMQP_06_009: [The `initializeCBS` method shall establish a sender link to the `$cbs` endpoint for sending put token operations, utilizing a custom policy `{encoder: function(body) { return body;}}` which forces the amqp layer to send the token as an amqp value in the body.]*/
    this.attachSenderLink(_putTokenSendingEndpoint, {encoder: function(body) { return body;}}, function (err) {
      if (err) {
        this.disconnect(function () {
          /*Codes_SRS_NODE_COMMON_AMQP_06_019: [If given as an argument, the `initializeCBS` method shall call `initializeCBSCallback` with a standard `Error` object if the link/listener establishment fails.]*/
          safeCallback(initializeCBSCallback, err);
          });
      } else {
        /*Codes_SRS_NODE_COMMON_AMQP_06_010: [The `initializeCBS` method shall establish a receiver link to the cbs endpoint.]*/
        this.attachReceiverLink(_putTokenReceivingEndpoint, null, function (err) {
          if (err) {
            this.disconnect( function () {
              /*Codes_SRS_NODE_COMMON_AMQP_06_019: [If given as an argument, the `initializeCBS` method shall call `initializeCBSCallback` with a standard `Error` object if the link/listener establishment fails.]*/
              safeCallback(initializeCBSCallback, err);
              });
          } else {
            /*Codes_SRS_NODE_COMMON_AMQP_06_011: [The `initializeCBS` method shall set up a listener for responses to put tokens.]*/
            this._receivers[_putTokenReceivingEndpoint].on('message', function (msg) {
              for (var i = 0; i < this._putToken.outstandingPutTokens.length; i++) {
                if (msg.correlationId === this._putToken.outstandingPutTokens[i].correlationId) {
                  var completedPutToken = this._putToken.outstandingPutTokens[i];
                  this._putToken.outstandingPutTokens.splice(i, 1);
                  if (completedPutToken.putTokenCallback) {
                    /*Codes_SRS_NODE_COMMON_AMQP_06_013: [A put token response of 200 will invoke `putTokenCallback` with null parameters.]*/
                    var error = null;
                    if (msg.properties.getValue('status-code') !== 200) {
                      /*Codes_SRS_NODE_COMMON_AMQP_06_014: [A put token response not equal to 200 will invoke `putTokenCallback` with an error object of UnauthorizedError.]*/
                      error = new errors.UnauthorizedError(msg.properties.getValue('status-description'));
                    }
                    safeCallback(completedPutToken.putTokenCallback, error);
                  }
                  break;
                }
              }
              //
              // Regardless of whether we found the put token in the list of outstanding
              // operations, accept it.  This could be a put token that we previously
              // timed out.  Be happy.  It made it home, just too late to be useful.
              //
              /*Codes_SRS_NODE_COMMON_AMQP_06_012: [All responses shall be completed.]*/
              this._receivers[_putTokenReceivingEndpoint].complete(msg);
            }.bind(this));
            /*Codes_SRS_NODE_COMMON_AMQP_06_020: [If given as an argument, the `initializeCBS` method shall call `initializeCBSCallback` with a null error object if successful.]*/
            safeCallback(initializeCBSCallback, null);
          }
        }.bind(this));
      }
    }.bind(this));
  }
};


module.exports = Amqp;