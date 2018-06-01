// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import {
  SignatureProvider,
  SharedAccessSignature,
  errors
} from 'azure-iot-common';

export class SharedAccessKeySignatureProvider implements SignatureProvider {
  private _tokenValidTimeInSeconds: number = 3600; // 1 hour

  constructor(
    private _sharedAccessKey: string,
    tokenValidTimeInSeconds?: number
  ) {
    // Codes_SRS_NODE_SAK_SIG_PROVIDER_13_003: [ The constructor shall throw an ArgumentError if the _sharedAccessKey parameter is falsy. ]
    if (!this._sharedAccessKey) {
      throw new errors.ArgumentError(
        '_sharedAccessKey cannot be "' + this._sharedAccessKey + '".'
      );
    }

    // Codes_SRS_NODE_SAK_SIG_PROVIDER_13_004: [ The constructor shall save the tokenValidTimeInSeconds parameter if supplied. If not, it shall default to 3600 seconds (1 hour). ]
    if (tokenValidTimeInSeconds)
      this._tokenValidTimeInSeconds = tokenValidTimeInSeconds;
  }

  sign(
    keyName: string,
    data: string,
    callback: (err: Error, signature: SharedAccessSignature) => void
  ): void {
    // Codes_SRS_NODE_SAK_SIG_PROVIDER_13_005: [ The sign method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
    if (!callback || typeof callback !== 'function') {
      throw new ReferenceError('callback cannot be \'' + callback + '\'');
    }

    // Codes_SRS_NODE_SAK_SIG_PROVIDER_13_006: [ The sign method shall invoke callback with a ReferenceError if the data parameter is falsy. ]
    if (!data) {
      callback(new ReferenceError('data cannot be \'' + data + '\''), null);
      return;
    }

    // Codes_SRS_NODE_SAK_SIG_PROVIDER_13_001: [ Every token shall be created with a validity period of tokenValidTimeInSeconds if specified when the constructor was called, or 1 hour by default. ]
    const newExpiry =
      Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;

    // Codes_SRS_NODE_SAK_SIG_PROVIDER_13_002: [ Every token shall be created using the azure-iot-common.SharedAccessSignature.create method and then serialized as a string. The the expiration time of the token will be now + the token validity time, formatted as the number of seconds since Epoch (Jan 1st, 1970, 00:00 UTC).]
    const sas = SharedAccessSignature.create(
      data,
      keyName,
      this._sharedAccessKey,
      newExpiry
    );

    // Codes_SRS_NODE_SAK_SIG_PROVIDER_13_007: [ sign shall invoke the callback with the result of calling azure-iot-common.SharedAccessSignature.create. ]
    callback(null, sas);
  }
}
