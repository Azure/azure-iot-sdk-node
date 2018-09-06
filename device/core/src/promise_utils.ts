// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

export type ErrorCallback = (error?: Error) => void;
export type Callback<TResult> = (error?: Error, result?: TResult) => void;

// export type Callback2<TResult1, TResult2> = (error?: Error, result1?: TResult1) => void;

// export function getCallbackFromParameters<TParam, TResult>(param?: TParam, callback?: Callback<TResult>): Callback<TResult> | undefined {
//     if (!callback && typeof param === "function") {
//         callback = options;
//         options = undefined;
//       }
// }

// export function callbackToPromise<TResult>(operation: ((xxx, callback: Callback<TResult>) => void)): Promise<TResult> {
//     return new Promise<TResult>((resolve, reject) => {
//         operation((err, result) => {
//             if (err) {
//                 return reject(err);
//             }
    
//             return resolve(result);
//          });
//     });
// };

