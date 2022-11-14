/* eslint-disable no-invalid-this */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const EventEmitter = require('events').EventEmitter;
const util = require('util');

const sinon = require('sinon');

const FakeMqtt = function () {
  EventEmitter.call(this);

  this.publishShouldSucceed = function (shouldSucceed) {
    this._publishSucceeds = shouldSucceed;
  };

  this.publish = sinon.stub().callsFake(function (topic, message, options, callback) {
    this.publishoptions = options;
    this.topicString = topic;
    if (this._publishSucceeds) {
      callback(null, { puback: 'success' });
    } else {
      callback(new Error('Invalid topic'));
    }
  });

  this.connect = sinon.stub().callsFake(function () {
    return this;
  });

  this.subscribe = sinon.stub().callsFake(function (topicName, param, done) {
    if (this.subscribeShouldFail) {
      done (new Error('Not authorized'));
    } else {
      done(null, 'fake_object');
    }
  });

  this.unsubscribe = sinon.stub().callsFake(function (topicName, done) {
    done();
  });

  this.fakeMessageFromService = function (topic, message) {
    this.emit('message', topic, message);
  };

  this.end = sinon.stub().callsFake(function (force, callback) {
    callback();
  });
};

const PubFakeMqtt = function () {
  EventEmitter.call(this);
  this.callbackArray = []
  this.publish = sinon.stub().callsFake((topic, message, options, callback) => {
    this.callbackArray.push(callback);
    if (this.callbackArray.length === 4) {
      process.nextTick(() => {
        this.callbackArray[3]();
        this.callbackArray[0]();
        this.callbackArray[2]();
        this.callbackArray[1]();
      });
    }
  });

  this.connect = sinon.stub().callsFake(function () {
    return this;
  });

  this.end = sinon.stub().callsFake(function (force, callback) {
    callback();
  });
};

const PubACKTwiceFakeMqtt = function () {
  EventEmitter.call(this);
  this.publish = sinon.stub().callsFake((topic, message, options, callback) => {
    callback();
    callback();
  });

  this.connect = sinon.stub().callsFake(function () {
    return this;
  });

  this.end = sinon.stub().callsFake(function (force, callback) {
    callback();
  });
};

const ErrorFakeMqtt = function () {
  EventEmitter.call(this);
  this.callbackArray = [];
  this.publish = sinon.stub().callsFake((topic, message, options, callback) => {
    this.callbackArray.push(callback);
  });

  this.connect = sinon.stub().callsFake(function () {
    return this;
  });

  this.end = sinon.stub().callsFake(function (force, callback) {
    callback();
  });
};

util.inherits(FakeMqtt, EventEmitter);
util.inherits(PubFakeMqtt, EventEmitter);
util.inherits(PubACKTwiceFakeMqtt, EventEmitter);
util.inherits(ErrorFakeMqtt, EventEmitter);

module.exports = { FakeMqtt, PubFakeMqtt, PubACKTwiceFakeMqtt, ErrorFakeMqtt };
