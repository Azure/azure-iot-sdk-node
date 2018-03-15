// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var fs = require('fs');
var pem = require('pem');
var chalk = require('chalk');
var camelcase = require('camelcase');
var argv = require('yargs')
          .command('root [commonName]', 'create a root certificate', (yargs) => {
            return yargs
              .positional('commonName', { describe: 'name to use for cert', default: 'Test Root Cert' })
          })
          .command('intermediate <commonName> <parentCommonName>', 'create an intermediate cert', (yargs) => {
            return yargs
              .positional('commonName', { describe: 'name to use for cert' })
              .positional('parentCommonName', { describe: 'common name of parent cert' });
          })
          .command('device <commonName> [parentCommonName]', 'create a device cert', (yargs) => {
            return yargs
              .positional('commonName', { describe: 'name to use for cert' })
              .positional('parentCommonName', { describe: 'common name of parent cert' });
          })
          .command('verification [--ca root cert pem file name] [--key root cert key pem file name] [--nonce nonce]', 'provide proof of possession for a cert using a verification code', (yargs) => {
            return yargs
              .option('ca', { describe: 'pem file name of the root' })
              .option('key', { describe: 'pem file name of the key' })
              .option('nonce', { describe: 'verification code from portal' })
              .demandOption(['ca', 'key', 'nonce']);
          })
          .demandCommand()
          .help(false)
          .version(false)
          .wrap(null)
          .argv;

var command = argv._[0];

var commonName = null;
var parentCommonName = null;

var outputFilenameRoot = null;

var parentCert = null;
var parentKey = null;
var parentChain = null;

if (command === 'verification') {
  commonName = argv.nonce;
  outputFilenameRoot = 'verification';

  parentCert = fs.readFileSync(argv.ca).toString('ascii');
  parentKey = fs.readFileSync(argv.key).toString('ascii');
} else {
  commonName = argv.commonName;
  outputFilenameRoot = camelcase(commonName);

  if (argv.parentCommonName) {
    var parentFilenameRoot = camelcase(argv.parentCommonName);
    console.log(chalk.green('reading parent cert from ' + parentFilenameRoot + '_*.pem'));
    parentCert = fs.readFileSync(parentFilenameRoot + '_cert.pem').toString('ascii');
    parentKey = fs.readFileSync(parentFilenameRoot + '_key.pem').toString('ascii');
    parentChain = fs.readFileSync(parentFilenameRoot + '_fullchain.pem').toString('ascii');
  }
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
    console.log(chalk.green('saving cert to ' + outputFilenameRoot + '_cert.pem.'));
    fs.writeFileSync(outputFilenameRoot + '_cert.pem', cert.certificate);
    console.log(chalk.green('saving key to ' + outputFilenameRoot + '_key.pem.'));
    fs.writeFileSync(outputFilenameRoot + '_key.pem', cert.clientKey);
    // Note: this saves the root cert as part of the chain.  This isn't necessary, but it doesn't hurt either.
    console.log(chalk.green('saving cert with chain to ' + outputFilenameRoot + '_fullchain.pem.'));
    fs.writeFileSync(outputFilenameRoot + '_fullchain.pem', cert.certificate + '\n' + parentChain);
  }
});
