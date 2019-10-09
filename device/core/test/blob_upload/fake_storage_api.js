// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

class BlockBlobURL {
  constructor(url, pipeline) {
    return 'fakeBlockBlobURL'
  }
}

class Aborter {
  constructor () {
  }
  static timeout() {
    return 'fakeTimeout';
  }
}

class StorageURL {
  constructor() {
   }
  static newPipeline() {
    return fakePipeline;
  }
};

function AnonymousCredential() {};

function uploadStreamToBlockBlob() {
  return new Promise((resolve, reject) => {
    resolve('fakeUploadResponse');
  });
}

function fakePipeline() {};

module.exports = {
  AnonymousCredential: AnonymousCredential,
  Aborter: Aborter,
  StorageURL: StorageURL,
  BlockBlobURL: BlockBlobURL,
  uploadStreamToBlockBlob: uploadStreamToBlockBlob
};
