// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let serviceSdk = require('azure-iothub');
let serviceSas = require('azure-iothub').SharedAccessSignature;
let anHourFromNow = require('azure-iot-common').anHourFromNow;
let Amqp = require('azure-iothub').Amqp;
let AmqpWs = require('azure-iothub').AmqpWs;

let assert = require('chai').assert;

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

describe('Service Client', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);
    [Amqp, AmqpWs].forEach(function (Transport) {
    it('Service client can connect over ' + Transport.name + ' using a shared access signature', function (done) {
      let connStr = serviceSdk.ConnectionString.parse(hubConnectionString);
      let sas = serviceSas.create(connStr.HostName, connStr.SharedAccessKeyName, connStr.SharedAccessKey, anHourFromNow()).toString();
      let serviceClient = serviceSdk.Client.fromSharedAccessSignature(sas, Transport);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      serviceClient.open(function (err, result) {
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

    it('Service client can connect over ' + Transport.name + ' using a connection string', function (done) {
      let serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString, Transport);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      serviceClient.open(function (err, result) {
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
