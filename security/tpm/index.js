// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

module.exports = {
  TpmSecurityClient : require('./lib/tpm').TpmSecurityClient,
  TpmAuthenticationProvider: require('./lib/tpm_authentication_provider').TpmAuthenticationProvider
};