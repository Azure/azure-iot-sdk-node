// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * @class         module:azure-iot-device.BlobSasError
 * @classdesc     Error used when the client fails to get a blob shared access signature from the IoT Hub service.
 *
 * @params        {string}  message  Error message
 * @augments      {Error}
 */
export class BlobSasError extends Error {
  innerError: Error;

  constructor(message: string) {
    super(message);
    this.name = 'BlobSasError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * @class         module:azure-iot-device.BlobUploadNotificationError
 * @classdesc     Error used when the client fails to notify the IoT Hub service that the upload is complete.
 *
 * @params        {string}  message  Error message
 * @augments      {Error}
 */
export class BlobUploadNotificationError extends Error {
  innerError: Error;

  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = 'BlobUploadNotificationError';
    Error.captureStackTrace(this, this.constructor);
  }
}
