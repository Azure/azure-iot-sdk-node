// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const IotProperties = require('../dist/properties.js').Properties;

const propertyNum = 10;

describe('properties', function () {
  describe('#add', function () {
    /* Tests_SRS_NODE_IOTHUB_PROPERTIES_07_003: [The getItem function shall return a string representation of the body of the message.] */
    /* Tests_SRS_NODE_IOTHUB_PROPERTIES_07_002: [Properties.Count shall return the number of items in the Properties map.] */
    it('adds properties to the collection', function () {
      const properties = new IotProperties();

      let keyItem = "";
      let valueItem = "";

      for (let i = 0; i < propertyNum; i++) {
        keyItem = "itemKey" + (i + 1);
        valueItem = "itemValue" + (i + 1);
        properties.add(keyItem, valueItem);
      }
      assert.equal(propertyNum, properties.count());

      for (let i = 0; i < properties.count(); i++) {
        keyItem = "itemKey" + (i + 1);
        valueItem = "itemValue" + (i + 1);
        assert.equal(properties.getItem(i).key, keyItem);
        assert.equal(properties.getItem(i).value, valueItem);
      }
    });

    /* Tests_SRS_NODE_IOTHUB_PROPERTIES_07_004: [If itemKey contains any of the reserved key names then the add function will return false] */
    it('attempting to add invalid keys', function () {
      const failProperty = new IotProperties();

      let result = failProperty.add("Authorization", "itemValue1");
      assert.isFalse(result);
      result = failProperty.add("iothub-to", "itemValue2");
      assert.isFalse(result);
    });
  });

  /* Tests_SRS_NODE_IOTHUB_PROPERTIES_07_001: [if the supplied index is greater or equal to zero and less than property map length, then it shall return the property object.] */
  /* Tests_SRS_NODE_IOTHUB_PROPERTIES_13_001: [ If the supplied index is less than zero or greater than or equal to the property map length then it shall return undefined. ]*/
  describe('#getItem', function () {
    it('returns undefined object when given bad index', function () {
      const failProperty = new IotProperties();

      failProperty.add("itemKey1", "itemValue1");
      failProperty.add("itemKey2", "itemValue2");
      failProperty.add("itemKey3", "itemValue3");
      assert.equal(3, failProperty.count());

      assert.isUndefined(failProperty.getItem(5));
    });
  });

  describe('#getValue', function () {
    /*Tests_SRS_NODE_IOTHUB_PROPERTIES_16_002: [`Properties.getValue` should return the corresponding value of the `value` property of the element with the `key` property passed as argument.]*/
    it('returns the value of the property if it exists', function () {
      const testKey = 'key';
      const testValue = 'testValue';
      const properties = new IotProperties();
      properties.add('key2', 'value2');
      properties.add(testKey, testValue);
      properties.add('key3', 'value3');
      assert.strictEqual(properties.getValue(testKey), testValue);
    });

    /*Tests_SRS_NODE_IOTHUB_PROPERTIES_16_001: [`Properties.getValue` should return `undefined` if no element within the `propertyList` array contains `key`.]*/
    it('returns undefined when given a key that doesn\'t exist', function () {
      const properties = new IotProperties();
      properties.add('key2', 'value2');
      properties.add('key3', 'value3');
      assert.isUndefined(properties.getValue('key1'));
    });
  });
});
