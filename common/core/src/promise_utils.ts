// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

export type DoubleValueCallback<TResult1, TResult2> = (result1?: TResult1, result2?: TResult2) => void;
export type NoErrorCallback<TResult> = (result?: TResult) => void;
export type ErrorCallback = (error?: Error) => void;
export type Callback<TResult> = DoubleValueCallback<Error, TResult>;

export function callbackToPromise<TResult>(callBackOperation: (callback: Callback<TResult>) => void): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    callBackOperation((error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    });
  });
}

export function errorCallbackToPromise(callBackOperation: (callback: ErrorCallback) => void): Promise<void> {
  return new Promise<void>((_resolve, reject) => {
    callBackOperation((error) => {
      return reject(error);
    });
  });
}

export function noErrorCallbackToPromise<TResult>(callBackOperation: (callback: NoErrorCallback<TResult>) => void): Promise<TResult> {
  return new Promise<TResult>((resolve, _reject) => {
    callBackOperation((result) => {
      return resolve(result);
    });
  });
}

export function multiValueCallbackToPromise<TResult1, TResult2, TPromiseResult>(
  callBackOperation: (callback: DoubleValueCallback<TResult1, TResult2>) => void,
  packResults: (result1: TResult1, result2: TResult2) => TPromiseResult): Promise<TPromiseResult> {
  return new Promise<TPromiseResult>((resolve, reject) => {
    callBackOperation((result1, result2) => {
      if (result1 instanceof Error) {
        reject(result1);
      }

      if (result2 instanceof Error) {
        reject(result2);
      }

      return resolve(packResults(result1, result2));
    });
  });
}
