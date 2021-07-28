import { JSONValue } from '.';
import { DeviceMethodRequest } from '../device_method';

export class CommandRequest {
    /**
     * The request identifier supplied by the service for this command call.
     */
    requestId: string;

    /**
     * The name of the command being called.
     */
    commandName: string;

    /**
     * The name of the component corresponding to the command being called.
     */
    componentName?: string;

    /**
     * The payload of this command call.
     */
    payload: JSONValue;

    constructor(methodRequest: DeviceMethodRequest) {
        this.requestId = methodRequest.requestId;
        this.payload = methodRequest.payload;
        const splitMethod = methodRequest.methodName.split('*');
        if (splitMethod.length > 1) {
            this.componentName = splitMethod[0];
            this.commandName = splitMethod.slice(1).join('*');
        } else {
            this.commandName = splitMethod[0];
        }
    }
}
