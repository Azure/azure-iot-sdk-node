// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var amqp10 = require('amqp10');
var AmqpMessage = require('./amqp_message.js');
var AmqpReceiver = require('./amqp_receiver.js');
var errors = require('azure-iot-common').errors;
var results = require('azure-iot-common').results;
var debug = require('debug')('amqp-common');

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
 * @param {Function}   done   Called when the connection is established of if an error happened.
 */
Amqp.prototype.connect = function connect(uri, sslOptions, done) {
  /*Codes_SRS_NODE_COMMON_AMQP_06_002: [The connect method shall throw a ReferenceError if the uri parameter has not been supplied.] */
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
        /*Codes_SRS_NODE_COMMON_AMQP_16_002: [The connect method shall establish a connection with the IoT hub instance and call the done() callback if given as argument] */
        safeCallback(done, null, new results.Connected(result));
        return null;
      }.bind(this))
      .catch(function (err) {
        this._amqp.removeListener('client:errorReceived', connectErrorHander);
        this._connected = false;
        /*Codes_SRS_NODE_COMMON_AMQP_16_003: [The connect method shall call the done callback if the connection fails.] */
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
  this._amqp.disconnect()
    .then(function (result) {
      this._connected = false;
      this._senders = {};
      /*Codes_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the done callback when the application/service has been successfully disconnected from the service] */
      safeCallback(done, null, result);
      return null;
    }.bind(this))
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
    /*Codes_SRS_NODE_COMMON_AMQP_16_006: [The send method shall construct an AMQP message using information supplied by the caller, as follows:
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
          /*Codes_SRS_NODE_IOTHUB_AMQPCOMMON_16_007: [If sendEvent encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
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
 * @param {string}    endpoint  Endpoint used for the receiver link.
 * @param {Object}    linkProperties    Dictionnary of key/value pairs that are going to be inserted as properties in the 'attach' AMQP frame.
 * @param {Function}  done      Callback used to return the link object or an Error.
 */
Amqp.prototype.attachReceiverLink = function attachReceiverLink(endpoint, linkProperties, done) {
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
    /*Codes_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    this._amqp.on('client:errorReceived', clientErrorHandler);

    /*Codes_SRS_NODE_COMMON_AMQP_16_019: [The `attachReceiverLink` method shall create a policy object that contain link properties to be merged is the properties argument is not falsy.]*/
    var attachProps = linkProperties ? { attach: { properties: linkProperties } }: undefined;
    /*Codes_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `createReceiver` on the `amqp10` client object.]*/
    self._amqp.createReceiver(endpoint, attachProps)
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
 * @param {string}    endpoint          Endpoint used for the sender link.
 * @param {Object}    linkProperties    Dictionnary of key/value pairs that are going to be inserted as properties in the 'attach' AMQP frame.
 * @param {Function}  done              Callback used to return the link object or an Error.
 */
Amqp.prototype.attachSenderLink = function attachSenderLink(endpoint, linkProperties, done) {
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
    /*Codes_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    this._amqp.on('client:errorReceived', clientErrorHandler);

    /*Codes_SRS_NODE_COMMON_AMQP_16_014: [The `attachSenderLink` method shall create a policy object that contain link properties to be merged is the properties argument is not falsy.]*/
    var attachProps = linkProperties ? { attach: { properties: linkProperties } }: undefined;
    /*Codes_SRS_NODE_COMMON_AMQP_16_013: [The `attachSenderLink` method shall call `createSender` on the `amqp10` client object.]*/
    self._amqp.createSender(endpoint, attachProps)
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
        /*Codes_SRS_NODE_IOTHUB_AMQPCOMMON_16_007: [If sendEvent encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
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
  this._detachLink(this._receivers[endpoint], function(err) {
    delete(self._receivers[endpoint]);
    detachCallback(err);
  });
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

module.exports = Amqp;