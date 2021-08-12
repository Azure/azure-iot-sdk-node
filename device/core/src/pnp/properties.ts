import { JSONValue, JSONObject } from '.';
import { Twin } from '../twin';

export function generateWritablePropertyResponse(value: JSONValue, ackCode: number, ackDescription: string, ackVersion: number): {
    value: JSONValue,
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
    backingObject: JSONObject = {};

    constructor(backingObject?: JSONObject) {
        this.backingObject = backingObject;
    }

    /**
     * The $version field of the properties.
     * Returns NaN if the $version field is undefined or cannot be converted to a number.
     */
    get version(): number {
        return Number(this.backingObject.$version);
    }

    /**
     * Assigns the provided value to a specified property for a component.
     * If no component is specified, the default component is assumed.
     *
     * @param {string} componentName The name of the component.
     * @param {string} propertyName  The name of the property.
     * @param {JSONValue} value      The value to assign to the property.
     */
    setProperty(propertyName: string, value: JSONValue): void;
    setProperty(componentName: string, propertyName: string, value: JSONValue): void;
    setProperty(propertyNameOrComponentName: string, valueOrPropertyName: JSONValue, value?: JSONValue): void {
        if (value === undefined) { // We cannot just check the truthiness of value because null is a valid argument for value
            this.backingObject[propertyNameOrComponentName] = valueOrPropertyName;
        } else {
            // tslint:disable-next-line:no-unused-expression
            this.backingObject[propertyNameOrComponentName] ?? (this.backingObject[propertyNameOrComponentName] = {__t: 'c'});
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
    getProperty(propertyName: string): JSONValue;
    getProperty(componentName: string, propertyName: string): JSONValue;
    getProperty(propertyNameOrComponentName: string, propertyName?: string): JSONValue {
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
