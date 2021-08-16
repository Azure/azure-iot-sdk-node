import { JSONSerializableValue, JSONSerializableObject } from '.';
import { Twin } from '../twin';

/**
 * Helper function to generate an object used in the device's response to a writable property request.
 *
 * @param {JSONSerializableValue} value          The the value field of the response object. Usually equal to the received value in the writable property request.
 * @param {number}                ackCode        The ac field of the response object.
 * @param {string}                ackDescription The ad field of the response object.
 * @param {number}                ackVersion     The av field of the response object. Usually equal to the received version number in the writable property request.
 */
export function generateWritablePropertyResponse(value: JSONSerializableValue, ackCode: number, ackDescription: string, ackVersion: number): {
  value: JSONSerializableValue,
  ac: number,
  ad: string,
  av: number
} {
  return {
    value,
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
   * @param {string}                componentName The name of the component.
   * @param {string}                propertyName  The name of the property.
   * @param {JSONSerializableValue} value         The value to assign to the property.
   */
  setProperty(propertyName: string, value: JSONSerializableValue): void;
  setProperty(componentName: string, propertyName: string, value: JSONSerializableValue): void;
  setProperty(propertyNameOrComponentName: string, valueOrPropertyName: JSONSerializableValue, value?: JSONSerializableValue): void {
    if (value === undefined) { // We cannot just check the truthiness of value because null is a valid argument for value
      this.backingObject[propertyNameOrComponentName] = valueOrPropertyName;
    } else {
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
   * @param {string} componentName The name of the component.
   * @param {string} propertyName  The name of the property.
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

  constructor(originalTwin?: Twin) {
    this.writablePropertiesRequests = new ClientPropertyCollection(originalTwin?.properties.desired);
    this.reportedFromDevice = new ClientPropertyCollection(originalTwin?.properties.reported);
  }
}
