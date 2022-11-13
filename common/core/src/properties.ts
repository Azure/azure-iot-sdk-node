/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

/**
 * Collection of user defined properties of a {@link azure-iot-common.Message} object that are going to be sent alongside the body of the message
 * and can be used for [routing](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-csharp-csharp-process-d2c).
 * Values can only be strings.
 */
export class Properties {
  /**
   * Array containing the properties stored as key/value pairs
   * ```json
   * [
   *   { key: 'prop1', value: 'value1' },
   *   { key: 'prop2', value: 'value2' }
   * ]
   * ```
   */
  propertyList: any[] = [];

  /**
   * Adds the key-value pair to the collection. The strings `'Authorization'`
   * and `'iothub-to'` are considered as reserved key names and will cause the
   * function to return `false` if those key names are used.
   */
  /* Codes_SRS_NODE_IOTHUB_PROPERTIES_07_003: [The getData function shall return a string representation of the body of the message.] */
  add(itemKey: string, itemValue: string): boolean {
    /* Codes_SRS_NODE_IOTHUB_PROPERTIES_07_004: [If itemKey contains any of the reserved key names then the add function will return false] */
    if (itemKey === 'Authorization' || itemKey === 'iothub-to') {
      return false;
    } else {
      this.propertyList.push({ key: itemKey, value: itemValue });
      return true;
    }
  }

  /**
   * Returns the key-value pair corresponding to the given index.
   *
   * @returns {Object}  Key-value pair corresponding to the given index. The
   *                    returned object has the properties `key` and `value`
   *                    corresponding to the key and value of the property.
   */
  /* Codes_SRS_NODE_IOTHUB_PROPERTIES_07_001: [if the supplied index is greater or equal to zero and the is less than property map length then it shall return the property object.] */
  getItem(index: number): { key: string; value: string } {
    if (index >= 0 && index < this.propertyList.length)
      return this.propertyList[index];

    /*Codes_SRS_NODE_IOTHUB_PROPERTIES_13_001: [ If the supplied index is less than zero or greater than or equal to the property map length then it shall return undefined. ]*/
    return undefined;
  }

  /**
   * Returns the value property of the element that has the given key.
   *
   * @returns {Object}  corresponding value or undefined if the key doesn't exist.
   */
  getValue(key: string): any {
    for (let i = 0; i < this.propertyList.length; i++) {
      /*Codes_SRS_NODE_IOTHUB_PROPERTIES_16_002: [`Properties.getValue` should return the corresponding value of the `value` property of the element with the `key` property passed as argument.]*/
      if (this.propertyList[i].key === key) {
        return this.propertyList[i].value;
      }
    }

    /*Codes_SRS_NODE_IOTHUB_PROPERTIES_16_001: [`Properties.getValue` should return `undefined` if no element within the `propertyList` array contains `key`.]*/
    return undefined;
  }

  /**
   * Returns the number of items in the collection.
   */
  /* Codes_SRS_NODE_IOTHUB_PROPERTIES_07_002: [Properties.Count shall return the number of items in the Properties map.] */
  count(): number {
    return this.propertyList.length;
  }
}
