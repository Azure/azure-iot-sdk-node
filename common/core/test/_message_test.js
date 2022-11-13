// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const Message = require('../dist/message.js').Message;

const stringTestMsg = 'message';

describe('message', function () {

  describe('#getData', function () {

    /*Tests_SRS_NODE_IOTHUB_MESSAGE_07_003: [The getData function shall return a representation of the body of the message as the type that was presented during construction.]*/
    it('returns the underlying data', function () {
      const message = new Message(stringTestMsg);
      assert.equal(message.getData(), stringTestMsg);
    });

  });

  describe('#setAsSecurityMessage', function () {
    it('sets message as a security message', function () {
      const message = new Message(stringTestMsg);
      assert.isUndefined(message.interfaceId);
      message.setAsSecurityMessage();
      assert.equal(message.interfaceId, 'urn:azureiot:Security:SecurityAgent:1');
    });
  });

  describe('#getBytes', function () {

    /*Tests_SRS_NODE_IOTHUB_MESSAGE_07_001: [If the data message that is store is of type Buffer then the data object will get returned unaltered.]*/
    it('returns a Buffer when the underlying data is a Buffer', function () {
      const original = Buffer.from(stringTestMsg);
      const message = new Message(original);
      const buffer = message.getBytes();
      assert.instanceOf(buffer, Buffer);
      assert.equal(buffer, original);
    });

    /*Tests_SRS_NODE_IOTHUB_MESSAGE_07_002: [If the data message is of any other type then the data will be converted to a Buffer object and returned.]*/
    it('returns a Buffer when the underlying data is NOT a Buffer', function () {
      const message = new Message(stringTestMsg);
      const buffer = message.getBytes();
      assert.instanceOf(buffer, Buffer);
      assert.equal(buffer.toString('ascii'), stringTestMsg);
    });

  });

  describe('#isBufferConvertible', function () {

    /*Tests_SRS_NODE_IOTHUB_MESSAGE_18_001: [`isBufferConvertible` shall return `true` if `obj` is a `Buffer`, a `string`, an `Array`, or an `ArrayBuffer`.]*/
    [
      { obj: Buffer.from('foo'), name: 'Buffer' },
      { obj: 'foo', name: 'string' },
      { obj: [], name: 'Array' },
      { obj: new ArrayBuffer(), name: 'ArrayBuffer' }
    ].forEach(function (testConfig) {
      it('returns true if object is of type ' + testConfig.name, function () {
        assert.isTrue(Message.isBufferConvertible(testConfig.obj));
      });
    });

    /*Tests_SRS_NODE_IOTHUB_MESSAGE_18_002: [`isBufferConvertible` shall return `false` if `obj` is any other type.]*/
    [
      { obj: 1, name: 'number' },
      { obj: true, name: 'boolean' },
      { obj: {}, name: 'object' },
      { obj: new Message(), name: 'Message' }
    ].forEach(function (testConfig) {
      it('returns false if object is of type ' + testConfig.name, function () {
        assert.isFalse(Message.isBufferConvertible(testConfig.obj));
      });
    });


  });

});
