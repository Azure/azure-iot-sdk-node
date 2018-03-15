// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var fs = require('fs');
var pem = require('pem');
var chalk = require('chalk');

var argv = require('yargs')
           .usage('Usage: $0  --ca <root cert pem file name> --key <root cert key pem file name> --nonce <nonce>')
           .demand(['ca', 'key', 'nonce'])
           .describe('ca', 'pem file name of the root')
           .describe('key', 'pem file name of the key')
           .describe('nonce', 'common name will be used as the file name')
           .argv;


var CARootCert = fs.readFileSync(argv.ca, 'utf-8').toString();
var CARootCertKey = fs.readFileSync(argv.key, 'utf-8').toString();

function createCACertDevice(nonce, done) {

  pem.createCSR( { commonName: nonce }, function (err, csrResult) {
    if (err) {
      done(err);
    } else {
      pem.createCertificate(
        {
          csr: csrResult.csr,
          clientKey: csrResult.clientKey,
          serviceKey: CARootCertKey,
          serviceCertificate: CARootCert,
          serial: Math.floor(Math.random() * 1000000000),
          days: 1
        }, function (err, certConstructionResult) {
          if (err) {
            done(err);
          } else {
            fs.writeFileSync(nonce + '-key.pem', certConstructionResult.certificate);
            done();
          }
      })
    }
  })
}

createCACertDevice(argv.nonce, (err) => {
  if (err) {
    console.log('Error in generation: ' + err);
  }
});

