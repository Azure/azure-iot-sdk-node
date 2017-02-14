azure-iot-common.properties Requirements
========================================

Overview
--------

Properties is a collection of user defined properties. Values can only be
strings.

Public Interface
----------------

| **Member**                           | **Type**       | **Description**                                                |
|--------------------------------------|----------------|----------------------------------------------------------------|
| `Properties.add(itemKey, itemValue)` | void           | Adds the key-value pair to the collection.                     |
| `Properties.getItem(index)`          | Key/value Pair | Returns the key/value pair corresponding to the given index.   |
| `Properties.getValue(key)`           | Any            | Returns the value corresponding to the given key.              |
| `Properties.count`                   | Number         | Returns the number of items in the collection.                 |

Requirements
------------

### Properties.add(itemKey, itemValue)

**SRS_NODE_IOTHUB_PROPERTIES_07_003: [** The add function shall push the supplied `itemKey` and `itemValue` to the property object map.  **]**

**SRS_NODE_IOTHUB_PROPERTIES_07_004: [** If `itemKey` contains any of the reserved key names then the `add` function will return `false`. **]** 

### Properties.getItem(index)

**SRS_NODE_IOTHUB_PROPERTIES_07_001: [** If the supplied index is greater or equal to zero and is less than property map length, then it shall return the property object. **]**

**SRS_NODE_IOTHUB_PROPERTIES_13_001: [** If the supplied index is less than zero or greater than or equal to the property map length then it shall return `undefined`. **]**

### Properties.count()

**SRS_NODE_IOTHUB_PROPERTIES_07_002: [** `Properties.count()` shall return the number of items in the Properties map. **]**

### Properties.getValue(key)
**SRS_NODE_IOTHUB_PROPERTIES_16_001: [** `Properties.getValue` should return `undefined` if no element within the `propertyList` array contains `key`. **]**

**SRS_NODE_IOTHUB_PROPERTIES_16_002: [** `Properties.getValue` should return the corresponding value of the `value` property of the element with the `key` property passed as argument. **]**
