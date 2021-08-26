// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { JSONSerializableValue, JSONSerializableObject } from '.';
import { TwinProperties } from '../twin';

/**
 * Helper function to generate an object used in the device's response to a writable property request.
 *
 * @param {JSONSerializableValue} value          - The the value field of the response object. Usually equal to the received value in the writable property request.
 * @param {number}                ackCode        - The ac field of the response object.
 * @param {string}                ackDescription - The ad field of the response object.
 * @param {number}                ackVersion     - The av field of the response object. Usually equal to the received version number in the writable property request.
 */
export function generateWritablePropertyResponse(value: JSONSerializableValue, ackCode: number, ackDescription: string, ackVersion: number): {
  value: JSONSerializableValue,
  ac: number,
  ad: string,
  av: number
} {
  return {
    value: value,
    ac: ackCode,
    ad: ackDescription,
    av: ackVersion
  };
}

export class ClientPropertyCollection {
  /**
   * The object representation of the properties.
   */
  backingObject: JSONSerializableObject;

  constructor(backingObject?: JSONSerializableObject) {
    this.backingObject = backingObject ?? {};
  }

  /**
   * The $version field of the properties.
   * Returns NaN if the $version field cannot be converted to a number.
   * Equivalent to Number(backingObject.$version)
   */
  get version(): number {
    return Number(this.backingObject.$version);
  }

  /**
   * Assigns the provided value to a specified property for a component.
   * If no component is specified, the default component is assumed.
   *
   * @param {string}                componentName - The name of the component.
   * @param {string}                propertyName  - The name of the property.
   * @param {JSONSerializableValue} value         - The value to assign to the property.
   */
  setProperty(propertyName: string, value: JSONSerializableValue): void;
  setProperty(componentName: string, propertyName: string, value: JSONSerializableValue): void;
  setProperty(propertyNameOrComponentName: string, valueOrPropertyName: JSONSerializableValue, value?: JSONSerializableValue): void {
    if (value === undefined) {
      // If third argument (value) is undefined, the user invoked the two-argument function (i.e., without a componentName)
      // We cannot check the truthiness of this argument because null is a possible value
      this.backingObject[propertyNameOrComponentName] = valueOrPropertyName;
    } else {
      // Otherwise, the user invoked the three-argument function (i.e., with a componentName)
      if (typeof this.backingObject[propertyNameOrComponentName] !== 'object') {
        this.backingObject[propertyNameOrComponentName] = {};
      }
      this.backingObject[propertyNameOrComponentName][`__t`] = 'c';
      this.backingObject[propertyNameOrComponentName][valueOrPropertyName as string] = value;
    }
  }

  /**
   * Gets the value assigned to the specified component and property.
   * If no component is specified, the default component is assumed.
   * Returns undefined if the property does not exist.
   *
   * @param {string} componentName - The name of the component.
   * @param {string} propertyName  - The name of the property.
   */
  getProperty(propertyName: string): JSONSerializableValue;
  getProperty(componentName: string, propertyName: string): JSONSerializableValue;
  getProperty(propertyNameOrComponentName: string, propertyName?: string): JSONSerializableValue {
    return propertyName ?
      this.backingObject[propertyNameOrComponentName]?.[propertyName] :
      this.backingObject[propertyNameOrComponentName];
  }
}

export class ClientProperties {
  writablePropertiesRequests: ClientPropertyCollection;
  reportedFromDevice: ClientPropertyCollection;

  constructor(originalTwin?: TwinProperties) {
    this.writablePropertiesRequests = new ClientPropertyCollection(originalTwin?.desired);
    this.reportedFromDevice = new ClientPropertyCollection(originalTwin?.reported);
  }
}
