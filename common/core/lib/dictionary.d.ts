/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
export declare function createDictionary(source: string, separator: string): createDictionary.Dictionary<string>;
export declare namespace createDictionary {
    /**
     * @private
     */
    interface Dictionary<T> {
        [key: string]: T;
    }
}
