// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

class fakeBlockBlobClient {
  constructor() {}

  static uploadStream() {
    return new Promise((resolve, _reject) => {
      resolve('fakeUploadResponse');
    });
  }
}

class BlockBlobClient {
  constructor(_url, _pipeline) {
    return fakeBlockBlobClient
  }
}

function newPipeline() {
  return function () {};
}

function AnonymousCredential() {}


module.exports = {
  newPipeline: newPipeline,
  AnonymousCredential: AnonymousCredential,
  BlockBlobClient: BlockBlobClient,
};
