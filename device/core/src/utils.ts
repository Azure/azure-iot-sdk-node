// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { getAgentPlatformString } from 'azure-iot-common';
import { NoErrorCallback, noErrorCallbackToPromise } from 'azure-iot-common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

export function getUserAgentString(done: NoErrorCallback<string>): void;
export function getUserAgentString(): Promise<string>;
export function getUserAgentString(productInfo: string, done: NoErrorCallback<string>): void;
export function getUserAgentString(productInfo: string): Promise<string>;
export function getUserAgentString(productInfoOrDone?: string | NoErrorCallback<string>, doneOrNone?: NoErrorCallback<string>): Promise<string> | void {
  let productInfo: string;
  let done: NoErrorCallback<string>;

  /*Codes_SRS_NODE_DEVICE_UTILS_41_001: [`getUserAgentString` shall not add any custom product Info if a `falsy` value is passed in as the first arg.]*/
  if (!productInfoOrDone) {
    productInfo = '';
    done = doneOrNone;
  } else {
    switch (typeof(productInfoOrDone)) {
      /*Codes_SRS_NODE_DEVICE_UTILS_41_002: [`getUserAgentString` shall accept productInfo as a `string` so that the callback is called with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'.]*/
      case 'string': {
        productInfo = <string> productInfoOrDone;
        done = doneOrNone;
        break;
      }
      case 'function': {
        productInfo = '';
        done = <NoErrorCallback<string>> productInfoOrDone;
        break;
      }
      /*Codes_SRS_NODE_DEVICE_UTILS_41_003: [`getUserAgentString` shall throw if the first arg is not `falsy`, or of type `string` or `function`.]*/
      default:
        throw new TypeError('Error: productInfo must be of type \'string\'');
    }
  }
  return noErrorCallbackToPromise((_callback) => {
    /*Codes_SRS_NODE_DEVICE_UTILS_18_001: [`getUserAgentString` shall call `getAgentPlatformString` to get the platform string.]*/
    getAgentPlatformString((platformString) => {
      /*Codes_SRS_NODE_DEVICE_UTILS_18_002: [`getUserAgentString` shall call its `callback` with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'.]*/
      _callback(packageJson.name + '/' + packageJson.version + ' (' + platformString + ')' + productInfo);
    });
  }, done);
}
