// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { SharedAccessSignature, encodeUriComponentStrict } from 'azure-iot-common';

export function create(host: string, deviceId: string, key: string, expiry: string | number): SharedAccessSignature {
  /*Codes_SRS_NODE_DEVICE_SAS_05_004: [<urlEncodedDeviceId> shall be the URL-encoded value of deviceId.]*/
  const uri = encodeUriComponentStrict(host + '/devices/' + deviceId);
  /*Codes_SRS_NODE_DEVICE_SAS_05_003: [The create method shall return the result of calling azure-iot-common.SharedAccessSignature.create with following arguments:
  resourceUri - host + '%2Fdevices%2F' + <urlEncodedDeviceId>
  keyName - null
  key - key
  expiry - expiry]*/
  return SharedAccessSignature.create(uri, null, key, expiry);
}

export function parse(source: string): SharedAccessSignature {
  /*Codes_SRS_NODE_DEVICE_SAS_05_001: [The parse method shall return the result of calling azure-iot-common.SharedAccessSignature.parse.]*/
  /*Codes_SRS_NODE_DEVICE_SAS_05_002: [It shall throw ArgumentError if any of 'sr', 'sig', 'se' fields are not found in the source argument.]*/
  return SharedAccessSignature.parse(source, ['sr', 'sig', 'se']);
}
