// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var Message = require('azure-iot-common').Message;
var Amqp = require('../lib/amqp.js').Amqp;

describe('Amqp', function () {
  describe('X509', function () {
    describe('registerX509', function () {
      var fakeSenderLink, fakeReceiverLink, fakeAmqpBase;

      beforeEach(function () {
        fakeReceiverLink = new EventEmitter();
        fakeReceiverLink.forceDetach = sinon.stub();
        fakeReceiverLink.detach = sinon.stub().callsArg(0);

        fakeSenderLink = new EventEmitter();
        fakeSenderLink.forceDetach = sinon.stub();
        fakeSenderLink.detach = sinon.stub().callsArg(0);
        fakeSenderLink.send = sinon.stub().callsFake((message, callback) => {
          var fakeResponse;
          if (message.applicationProperties['iotdps-operation-type'] === 'iotdps-register') {
            fakeResponse = new Message(JSON.stringify({
              operationId: 'fakeOpId',
              status: 'assigning'
            }));
            fakeResponse.correlationId = message.properties.correlationId;
          } else {
            fakeResponse = new Message(JSON.stringify({
              operationId: message.applicationProperties['iotdps-operation-id'],
              status: 'assigned',
              registrationState: {}
            }));
            fakeResponse.correlationId = message.properties.correlationId;
          }

          process.nextTick(() => {
            fakeReceiverLink.emit('message', fakeResponse);
          })
          callback();
        });

        fakeAmqpBase = {
          connect: sinon.stub().callsArg(2),
          disconnect: sinon.stub().callsArg(0),
          attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSenderLink),
          attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink),
        };
      });

      it('connects the AMQP connection using the X509 certificate', function (testCallback) {
        var amqp = new Amqp(fakeAmqpBase);
        var fakeX509Auth = {
          cert: 'fakeCert',
          key: 'fakeKey'
        };

        amqp.registerX509({ registrationId: 'fakeRegistrationId' }, fakeX509Auth, function () {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          testCallback();
        });
      });

      it('calls its callback with an error if it fails to connect', function (testCallback) {
        var fakeError = new Error('fake error');
        fakeAmqpBase.connect = sinon.stub().callsArgWith(2, fakeError);
        var amqp = new Amqp(fakeAmqpBase);
        var fakeX509Auth = {
          cert: 'fakeCert',
          key: 'fakeKey'
        };

        amqp.registerX509({ registrationId: 'fakeRegistrationId' }, fakeX509Auth, function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      it('attaches the sender link', function (testCallback) {
        var amqp = new Amqp(fakeAmqpBase);
        var fakeX509Auth = {
          cert: 'fakeCert',
          key: 'fakeKey'
        };

        amqp.registerX509({ registrationId: 'fakeRegistrationId' }, fakeX509Auth, function () {
          assert.isTrue(fakeAmqpBase.attachSenderLink.calledOnce);
          testCallback();
        });
      });

      it('calls its callback with an error if it fails to attach the sender link', function (testCallback) {
        var fakeError = new Error('fake error');
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, fakeError);
        var amqp = new Amqp(fakeAmqpBase);
        var fakeX509Auth = {
          cert: 'fakeCert',
          key: 'fakeKey'
        };

        amqp.registerX509({ registrationId: 'fakeRegistrationId' }, fakeX509Auth, function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      it('attaches the receiver link', function (testCallback) {
        var amqp = new Amqp(fakeAmqpBase);
        var fakeX509Auth = {
          cert: 'fakeCert',
          key: 'fakeKey'
        };

        amqp.registerX509({ registrationId: 'fakeRegistrationId' }, fakeX509Auth, function () {
          assert.isTrue(fakeAmqpBase.attachReceiverLink.calledOnce);
          testCallback();
        });
      });
    });
    // describe('registrationRequest', function () {
    //   it('sends an properly constructed AMQP message', function (testCallback) {

    //   });
    // });

    // describe('operationStatusRequest', function () {
    //   it('sends an properly constructed AMQP message', function (testCallback) {

    //   });
    // });
  });

  // describe('TPM', function () {

  // });
});
