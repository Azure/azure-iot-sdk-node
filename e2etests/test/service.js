// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var serviceSdk = require('azure-iothub');
var serviceSas = require('azure-iothub').SharedAccessSignature;
var anHourFromNow = require('azure-iot-common').anHourFromNow;
var Amqp = require('azure-iothub').Amqp;
var AmqpWs = require('azure-iothub').AmqpWs;

var assert = require('chai').assert;

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

describe('Service Client', function () {
    this.timeout(60000);
    [Amqp, AmqpWs].forEach(function (Transport) {
    it('Service client can connect over ' + Transport.name + ' using a shared access signature', function(done) {
      var connStr = serviceSdk.ConnectionString.parse(hubConnectionString);
      var sas = serviceSas.create(connStr.HostName, connStr.SharedAccessKeyName, connStr.SharedAccessKey, anHourFromNow()).toString();
      var serviceClient = serviceSdk.Client.fromSharedAccessSignature(sas, Transport);
      serviceClient.open(function(err, result) {
        if(err) {
          done(err);
        } else {
          assert.equal(result.constructor.name, 'Connected');
          serviceClient.close(function (err) {
            done(err);
          });
        }
      });
    });

    it('Service client can connect over ' + Transport.name + ' using a connection string', function(done) {
      var serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString, Transport);
      serviceClient.open(function(err, result) {
        if(err) {
          done(err);
        } else {
          assert.equal(result.constructor.name, 'Connected');
          serviceClient.close(function (err) {
            done(err);
          });
        }
      });
    });
  });
});