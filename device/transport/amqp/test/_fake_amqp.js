// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const results = require('azure-iot-common').results;

const buildAmqpError = function () {
  const linkError = new Error();
  linkError.condition = 'amqp:unauthorized-access';
  return linkError;
}

const FakeSenderLink = function (containingClient) {
  EventEmitter.call(this);
  const owningClient = containingClient;
  this.send = function (message, callback) {
    owningClient.lastSendMessage = message;
    if (owningClient.sendMessageShouldSucceed) {
      callback(null, {});
    } else {
      callback(buildAmqpError());
    }
  };
  util.inherits(FakeSenderLink, EventEmitter);
};

const FakeReceiverLink = function () {
  EventEmitter.call(this);
  util.inherits(FakeReceiverLink, EventEmitter);
};

const FakeAmqp = function () {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();
  this.setDisconnectHandler = function () {};

  this.attachSenderLink = function (endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function (endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function (endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function (endpoint, detachCallback) {
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

const FakeAmqpAttachSenderFails = function () {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function (endpoint, linkOptions, attachCallback) {
    attachCallback(buildAmqpError());
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function (endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function (endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function (endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpAttachSenderFails, EventEmitter);
};

const FakeAmqpAttachReceiverFails = function () {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function (endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function (endpoint, linkOptions, attachCallback) {
    attachCallback(buildAmqpError());
  }

  this.detachSenderLink = function (endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function (endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpAttachReceiverFails, EventEmitter);
};

const FakeAmqpDetachReceiverFails = function () {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function (endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function (endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function (endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function (endpoint, detachCallback) {
    detachCallback(buildAmqpError());
  }
  util.inherits(FakeAmqpDetachReceiverFails, EventEmitter);
};

const FakeAmqpDetachSenderFails = function () {
  EventEmitter.call(this);
  this.attachSenderEndpoint = null;
  this.attachReceiverEndpoint = null;
  this.attachSenderLinkOptions = null;
  this.attachReceiverLinkOptions = null;
  this.lastSendMessage = null;
  this.sendMessageShouldSucceed = true;
  this.fakeSenderLink = new FakeSenderLink(this);
  this.fakeReceiverLink = new FakeReceiverLink();

  this.attachSenderLink = function (endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.attachReceiverLink = function (endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function (endpoint, detachCallback) {
    detachCallback(buildAmqpError());
  }

  this.detachReceiverLink = function (endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpDetachSenderFails, EventEmitter);
};

const FakeAmqpAttachReceiverDelayCallback = function () {
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

  this.attachSenderLink = function (endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.invokeDelayCallback = function () {
    this.fakeAttachCallback(null, this.fakeReceiverLink);
  };

  this.attachReceiverLink = function (endpoint, linkOptions, attachCallback) {
    this.fakeAttachCallback = attachCallback;
  }

  this.detachSenderLink = function (endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function (endpoint, detachCallback) {
    detachCallback();
  }
  util.inherits(FakeAmqpAttachReceiverDelayCallback, EventEmitter);
};

const FakeAmqpDetachReceiverDelayCallback = function () {
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

  this.attachSenderLink = function (endpoint, linkOptions, attachCallback) {
    this.attachSenderEndpoint = endpoint;
    this.attachSenderLinkOptions = linkOptions;
    attachCallback(null, this.fakeSenderLink);
  }
  this.sendShouldSucceed = function (shouldSucceed) {
    this.sendMessageShouldSucceed = shouldSucceed;
  };

  this.invokeDelayCallback = function () {
    this.fakeDetachCallback(null, this.fakeReceiverLink);
  };

  this.attachReceiverLink = function (endpoint, linkOptions, attachCallback) {
    this.attachReceiverEndpoint = endpoint;
    this.attachReceiverLinkOptions = linkOptions;
    attachCallback(null, this.fakeReceiverLink);
  }

  this.detachSenderLink = function (endpoint, detachCallback) {
    detachCallback();
  }

  this.detachReceiverLink = function (endpoint, detachCallback) {
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
