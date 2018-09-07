// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

export type NoErrorCallback<TResult> = (result?: TResult) => void;
export type ErrorCallback = (error?: Error) => void;
export type Callback<TResult> = (error?: Error, result?: TResult) => void;

export function callbackToPromise<TResult>(callBackOperation: (callback: Callback<TResult>) => void): Promise<TResult> {
    return new Promise((resolve, reject) => {
      callBackOperation((error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      });
    });
  }
