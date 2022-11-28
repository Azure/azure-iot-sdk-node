// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let EventEmitter = require('events').EventEmitter;
let util = require('util');
let Message = require('azure-iot-common').Message;
let ArgumentError = require('azure-iot-common').errors.ArgumentError;
let SharedAccessSignature = require('../dist/shared_access_signature.js');
let results = require('azure-iot-common').results;

function Response(statusCode) {
  this.statusCode = statusCode;
}

function makeError(statusCode) {
  let err = new Error();
  err.response = new Response(statusCode);
  return err;
}

function SimulatedHttp(authProvider) {
  EventEmitter.call(this);
  this._receiver = null;
  this.handleRequest = function (done) {
    let self = this;
    authProvider.getDeviceCredentials(function (err, config) {
      if (self._x509) {
        done(null, new results.MessageEnqueued(new Response(204)));
      } else {
        let sig = SharedAccessSignature.parse(config.sharedAccessSignature);

        if (config.host.indexOf('bad') >= 0) {                      // bad host
          authProvider.stop();
          done(new Error('getaddrinfo ENOTFOUND bad'));
        } else if (config.deviceId.indexOf('bad') >= 0) {             // bad policy
          authProvider.stop();
          done(makeError(404));
        } else {
          let cmpSig = (SharedAccessSignature.create(config.host, config.deviceId, 'bad', sig.se)).toString();
          if (config.sharedAccessSignature === cmpSig) {  // bad key
            authProvider.stop();
            done(makeError(401));
          } else {
            authProvider.stop();
            done(null, new results.MessageEnqueued(new Response(204)));
          }
        }
      }
    });
  };
}

util.inherits(SimulatedHttp, EventEmitter);

SimulatedHttp.prototype.connect = function (callback) {
  callback(null, new results.Connected());
};

SimulatedHttp.prototype.disconnect = function (callback) {
  callback(null, new results.Disconnected());
};

SimulatedHttp.prototype.setOptions = function () {
  this._x509 = true;
};

SimulatedHttp.prototype.sendEvent = function (message, done) {
  this.handleRequest(function (err, response) {
    done(err, response);
  });
};

SimulatedHttp.prototype.sendEventBatch = function (message, done) {
  this.handleRequest(function (err, response) {
    done(err, response);
  });
};

SimulatedHttp.prototype.sendOutputEvent = function (outputName, message, done) {
  this.handleRequest(function (err, response) {
    done(err, response);
  });
};

SimulatedHttp.prototype.sendOutputEventBatch = function (outputName, message, done) {
  this.handleRequest(function (err, response) {
    done(err, response);
  });
};

SimulatedHttp.prototype.receive = function (done) {
  this.handleRequest(function (err, response) {
    done(err, err ? null : new Message(''), response);
  });
};

SimulatedHttp.prototype.sendFeedback = function (feedbackAction, message, done) {
  if (!message.lockToken) {
    done(new ArgumentError('invalid lockToken'));
  } else if (message.lockToken === 'FFA945D3-9808-4648-8DD7-D250DDE66EA9') {
    done(makeError(412));
  } else {
    this.handleRequest(function (err, res) {
      done(err, res);
    });
  }
};

module.exports = SimulatedHttp;
