// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var sinon = require('sinon');

var FakeMqtt = function() {
  EventEmitter.call(this);

  this.publishShouldSucceed = function (shouldSucceed) {
    this._publishSucceeds = shouldSucceed;
  };

  this.publish = sinon.stub().callsFake(function(topic, message, options, callback) {
    this.publishoptions = options;
    this.topicString = topic;
    if (this._publishSucceeds) {
      callback(null, {puback: 'success'});
    } else {
      callback(new Error('Invalid topic'));
    }
  });

  this.connect = sinon.stub().callsFake(function() {
    return this;
  });

  this.subscribe = sinon.stub().callsFake(function(topicName, param, done) {
    if (this.subscribeShouldFail) {
      done (new Error('Not authorized'));
    } else {
      done(null, 'fake_object');
    }
  });

  this.unsubscribe = sinon.stub().callsFake(function(topicName, done) {
    done();
  });

  this.fakeMessageFromService = function(topic, message) {
    this.emit('message', topic, message);
  };

  this.end = sinon.stub().callsFake(function (force, callback) {
    callback();
  });
};

util.inherits(FakeMqtt, EventEmitter);

module.exports = FakeMqtt;
