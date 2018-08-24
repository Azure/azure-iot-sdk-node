// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var results = require('azure-iot-common').results;

var buildAmqpError = function () {
  var linkError = new Error();
  linkError.condition = 'amqp:unauthorized-access';
  return linkError;
};
var FakeSenderLink = function(containingClient) {
  EventEmitter.call(this);
  var owningClient = containingClient;
  this.send = function(message, callback) {
    owningClient.lastSendMessage = message;
    if (owningClient.sendMessageShouldSucceed) {
      callback(null, {});
    } else {
      callback(buildAmqpError());
    }
  };
  util.inherits(FakeSenderLink, EventEmitter);
};

var FakeReceiverLink = function() {
  EventEmitter.call(this);
  util.inherits(FakeReceiverLink, EventEmitter);
};

var FakeAmqp = function() {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();
  this.setDisconnectHandler = function() {};

  this.attachSenderLink = function(endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function(endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function(endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function(endpoint, detachCallback) {
    detachCallback();
  }

  this.connect = function (config, callback) {
    callback(null, new results.Connected());
  }

  this.initializeCBS = function (callback) {
    callback();
  }

  this.putToken = function (token, audience, callback) {
    callback();
  }

  util.inherits(FakeAmqp, EventEmitter);
};

var FakeAmqpAttachSenderFails = function() {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function(endpoint, linkOptions, attachCallback) {
    attachCallback(buildAmqpError());
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function(endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function(endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function(endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpAttachSenderFails, EventEmitter);
};

var FakeAmqpAttachReceiverFails = function() {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function(endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function(endpoint, linkOptions, attachCallback) {
    attachCallback(buildAmqpError());
  }

  this.detachSenderLink = function(endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function(endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpAttachReceiverFails, EventEmitter);
};

var FakeAmqpDetachReceiverFails = function() {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function(endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function(endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function(endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function(endpoint, detachCallback) {
    detachCallback(buildAmqpError());
  }
  util.inherits(FakeAmqpDetachReceiverFails, EventEmitter);
};

var FakeAmqpDetachSenderFails = function() {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function(endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function(endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function(endpoint, detachCallback) {
    detachCallback(buildAmqpError());
  }

  this.detachReceiverLink = function(endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpDetachSenderFails, EventEmitter);
};

var FakeAmqpAttachReceiverDelayCallback = function() {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();
  this.fakeAttachCallback = null;

  this.attachSenderLink = function(endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.invokeDelayCallback = function() {
    this.fakeAttachCallback(null, this.fakeReceiverLink);
  };

  this.attachReceiverLink = function(endpoint, linkOptions, attachCallback) {
    this.fakeAttachCallback = attachCallback;
  }

  this.detachSenderLink = function(endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function(endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpAttachReceiverDelayCallback, EventEmitter);
};

var FakeAmqpDetachReceiverDelayCallback = function() {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();
  this.fakeDetachCallback = null;

  this.attachSenderLink = function(endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.invokeDelayCallback = function() {
    this.fakeDetachCallback(null, this.fakeReceiverLink);
  };

  this.attachReceiverLink = function(endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function(endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function(endpoint, detachCallback) {
    this.fakeDetachCallback = detachCallback;
  }
  util.inherits(FakeAmqpDetachReceiverDelayCallback, EventEmitter);
};


module.exports = {
  FakeAmqp: FakeAmqp,
  FakeAmqpAttachSenderFails: FakeAmqpAttachSenderFails,
  FakeAmqpAttachReceiverFails: FakeAmqpAttachReceiverFails,
  FakeAmqpDetachReceiverFails: FakeAmqpDetachReceiverFails,
  FakeAmqpDetachSenderFails: FakeAmqpDetachSenderFails,
  FakeAmqpAttachReceiverDelayCallback: FakeAmqpAttachReceiverDelayCallback,
  FakeAmqpDetachReceiverDelayCallback: FakeAmqpDetachReceiverDelayCallback
};
