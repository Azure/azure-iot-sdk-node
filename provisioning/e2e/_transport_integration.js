// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var fs = require('fs');
var assert = require('chai').assert;
var Http = require('../transport/http').Http;
// var Mqtt = require('../transport/mqtt').Mqtt;

var transportConfig = {
  idScope: 'scope',
  userAgent: 'agent'
};
var registrationId = '__';
var x509 = {};
var registrationBody = {

};

var idScope = process.env.IOTHUB_PROVISIONING_INTEGRATION_IDSCOPE;
var registrationId = process.env.IOTHUB_PROVISIONING_INTEGRATION_REGISTRATION_ID;
var x509Key = fs.readFileSync(process.env.IOTHUB_PROVISIONING_INTEGRATION_X509_KEY, 'utf-8');
var x509Cert = fs.readFileSync(process.env.IOTHUB_PROVISIONING_INTEGRATION_X509_CERT, 'utf-8');

var x509 = {
  cert: x509Cert,
  key: x509Key
};
var transportConfig = {
  'idScope': idScope,
  'userAgent': 'iothub-node-provisioning-integration-tests'
};
var registrationBody = {
  'registrationId': registrationId,
};

var provisioningProtocols = [ Http ];

provisioningProtocols.forEach(function (Protocol) {

  describe(Protocol.name, function() {
    this.timeout(10000);

    it ('can roundtrip x509', function(callback) {
      var transport = new Protocol(transportConfig);
      transport.on('operationStatus', function(response) {
        console.dir(response);
      });
      transport.register(registrationId, x509, registrationBody, false, function(err, response) {
        if (err) return callback(err);
        assert.equal(response.status, 'assigned');
        assert.equal(response.registrationStatus.registrationId, registrationId);
        callback();
      });
    });
  });
});