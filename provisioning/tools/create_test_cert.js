// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var fs = require('fs');
var pem = require('pem');
var chalk = require('chalk');
var camelcase = require('camelcase');
var argv = require('yargs')
          .command('root [commonName]', 'create a root certificate', (yargs) => {
            yargs.positional('commonName', { describe: 'name to use for cert', default: 'Test Root Cert' })
          })
          .command('intermediate <commonName> <parentCommonName>', 'create an intermediate cert', (yargs) => {
            yargs.positional('commonName', { describe: 'name to use for cert' })
            yargs.positional('parentCommonName', { describe: 'common name of parent cert' })
          })
          .command('device <commonName> [parentCommonName]', 'create a device cert', (yargs) => {
            yargs.positional('commonName', { describe: 'name to use for cert' })
            yargs.positional('parentCommonName', { describe: 'common name of parent cert' })
          })
          .command('verification <certToVerify> <verificationCode>', 'provide proof of possession for a cert using a verification code', (yargs) => {
            yargs.positional('certToVerify', { describe: 'common name for certificate to verify' })
            yargs.positional('verificationCode', { describe: 'verification code from portal' })
          })
          .demandCommand()
          .help()
          .argv;

var command = argv._[0];

var commonName = null;
var parentCommonName = null;
var parentFilenameRoot = null;
var certFilenameRoot = null;

if (command === 'verification') {
  commonName = argv.verificationCode;
  certFilenameRoot = 'verification';

  parentCommonName = argv.certToVerify;
  parentFilenameRoot = camelcase(parentCommonName);
} else {
  commonName = argv.commonName;
  certFilenameRoot = camelcase(commonName);

  if (argv.parentCommonName) {
    parentCommonName = argv.parentCommonName;
    parentFilenameRoot = camelcase(parentCommonName);
  }
}

var parentCert = null;
var parentKey = null;
var parentChain = null;
if (parentCommonName) {
  console.log(chalk.green('reading parent cert from ' + parentFilenameRoot + '_*.pem'));
  parentCert = fs.readFileSync(parentFilenameRoot + '_cert.pem').toString('ascii');
  parentKey = fs.readFileSync(parentFilenameRoot + '_key.pem').toString('ascii');
  parentChain = fs.readFileSync(parentFilenameRoot + '_fullchain.pem').toString('ascii');
} else {
  parentChain = '';
}

var certOptions = {
  commonName: commonName,
  serial: Math.floor(Math.random() * 1000000000),
  days: 1,
};

if (command === 'root' || command === 'intermediate') {
  certOptions.config = [
    '[req]',
    'req_extensions = v3_req',
    'distinguished_name = req_distinguished_name',
    'x509_extensions = v3_ca',
    '[req_distinguished_name]',
    'commonName = ' + commonName,
    '[v3_req]',
    'basicConstraints = critical, CA:true'
  ].join('\n');
} else {
  certOptions.config = [
    '[req]',
    'req_extensions = v3_req',
    'distinguished_name = req_distinguished_name',
    '[req_distinguished_name]',
    'commonName = ' + commonName,
    '[v3_req]',
    'extendedKeyUsage = critical,clientAuth'
  ].join('\n');
}

if (parentCert) {
  certOptions.serviceKey = parentKey;
  certOptions.serviceCertificate = parentCert;
} else {
  certOptions.selfSigned = true;
}

console.log(chalk.green('creating certificate with common name=' + commonName));
pem.createCertificate(certOptions, function(err, cert) {
  if (err) {
    console.log(chalk.red('Could not create certificate: ' + err.message));
    process.exit(1);
  } else {
    console.log(chalk.green('saving cert to ' + certFilenameRoot + '_cert.pem.'));
    fs.writeFileSync(certFilenameRoot + '_cert.pem', cert.certificate);
    console.log(chalk.green('saving key to ' + certFilenameRoot + '_key.pem.'));
    fs.writeFileSync(certFilenameRoot + '_key.pem', cert.clientKey);
    // Note: this saves the root cert as part of the chain.  This isn't necessary, but it doesn't hurt either.
    console.log(chalk.green('saving cert with chain to ' + certFilenameRoot + '_fullchain.pem.'));
    fs.writeFileSync(certFilenameRoot + '_fullchain.pem', cert.certificate + '\n' + parentChain);
  }
});
