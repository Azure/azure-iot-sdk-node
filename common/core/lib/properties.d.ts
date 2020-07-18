/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
/**
 * Collection of user defined properties of a {@link azure-iot-common.Message} object that are going to be sent alongside the body of the message
 * and can be used for [routing](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-csharp-csharp-process-d2c).
 * Values can only be strings.
 */
export declare class Properties {
    /**
     * Array containing the properties stored as key/value pairs
     * ```json
     * [
     *   { key: 'prop1', value: 'value1' },
     *   { key: 'prop2', value: 'value2' }
     * ]
     * ```
     */
    propertyList: any[];
    /**
     * Adds the key-value pair to the collection. The strings `'Authorization'`
     * and `'iothub-to'` are considered as reserved key names and will cause the
     * function to return `false` if those key names are used.
     */
    add(itemKey: string, itemValue: string): boolean;
    /**
     * Returns the key-value pair corresponding to the given index.
     * @returns {Object}  Key-value pair corresponding to the given index. The
     *                    returned object has the properties `key` and `value`
     *                    corresponding to the key and value of the property.
     */
    getItem(index: number): {
        key: string;
        value: string;
    };
    /**
     * Returns the value property of the element that has the given key.
     * @returns {Object}  corresponding value or undefined if the key doesn't exist.
     */
    getValue(key: string): any;
    /**
     * Returns the number of items in the collection.
     */
    count(): number;
}
