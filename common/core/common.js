// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-common` module contains code common to the Azure IoT Hub Device and Service SDKs.
 *
 * @module azure-iot-common
 */

module.exports = {
  anHourFromNow: require('./lib/authorization.js').anHourFromNow,
  encodeUriComponentStrict: require('./lib/authorization.js').encodeUriComponentStrict,
  ConnectionString: require('./lib/connection_string.js').ConnectionString,
  endpoint: require('./lib/endpoint.js'),
  errors: require('./lib/errors.js'),
  results: require('./lib/results.js'),
  Message: require('./lib/message.js').Message,
  SharedAccessSignature: require('./lib/shared_access_signature.js').SharedAccessSignature,
  RetryOperation: require('./lib/retry_operation.js').RetryOperation,
  RetryPolicy: require('./lib/retry_policy.js').RetryPolicy,
  NoRetry: require('./lib/retry_policy.js').NoRetry,
  ExponentialBackOffWithJitter: require('./lib/retry_policy.js').ExponentialBackOffWithJitter,
  AuthenticationProvider: require('./lib/authentication_provider').X509AuthenticationProvider,
  AuthenticationType: require('./lib/authentication_provider').AuthenticationType,
  getAgentPlatformString: require('./lib/utils').getAgentPlatformString
};