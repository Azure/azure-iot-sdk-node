// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Http = require('./lib/http.js').Http;

/**
 * The `azure-iot-provisioning-http` module provides support for the HTTPS protocol to the Azure Device Provisoning Service.
 *
 * @module azure-iot-provisioning-http
 * @requires module:azure-iot-http-base
 * @requires module:azure-iot-common
 */

module.exports = {
  Http: Http
};