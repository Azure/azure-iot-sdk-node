// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-common` module contains code common to the Azure IoT Hub Device and Service SDKs.
 *
 * @module azure-iot-common
 */

module.exports = {
  anHourFromNow: require('./dist/authorization.js').anHourFromNow,
  encodeUriComponentStrict: require('./dist/authorization.js').encodeUriComponentStrict,
  ConnectionString: require('./dist/connection_string.js').ConnectionString,
  endpoint: require('./dist/endpoint.js'),
  errors: require('./dist/errors.js'),
  results: require('./dist/results.js'),
  ResultWithHttpResponse: require('./dist/results.js').ResultWithHttpResponse,
  Message: require('./dist/message.js').Message,
  SharedAccessSignature: require('./dist/shared_access_signature.js').SharedAccessSignature,
  RetryOperation: require('./dist/retry_operation.js').RetryOperation,
  RetryPolicy: require('./dist/retry_policy.js').RetryPolicy,
  NoRetry: require('./dist/retry_policy.js').NoRetry,
  ExponentialBackOffWithJitter: require('./dist/retry_policy.js').ExponentialBackOffWithJitter,
  AuthenticationProvider: require('./dist/authentication_provider').X509AuthenticationProvider,
  AuthenticationType: require('./dist/authentication_provider').AuthenticationType,
  getAgentPlatformString: require('./dist/utils').getAgentPlatformString,
  callbackToPromise: require('./dist/promise_utils').callbackToPromise,
  doubleValueCallbackToPromise: require('./dist/promise_utils').doubleValueCallbackToPromise,
  errorCallbackToPromise: require('./dist/promise_utils').errorCallbackToPromise,
  noErrorCallbackToPromise: require('./dist/promise_utils').noErrorCallbackToPromise,
  tripleValueCallbackToPromise: require('./dist/promise_utils').tripleValueCallbackToPromise,
  httpCallbackToPromise: require('./dist/promise_utils').httpCallbackToPromise,
  Callback: require('./dist/promise_utils').Callback,
  ErrorCallback: require('./dist/promise_utils').ErrorCallback,
  NoErrorCallback: require('./dist/promise_utils').NoErrorCallback,
  DoubleValueCallback: require('./dist/promise_utils').DoubleValueCallback,
  TripleValueCallback: require('./dist/promise_utils').TripleValueCallback,
  HttpResponseCallback: require('./dist/promise_utils').HttpResponseCallback
};
