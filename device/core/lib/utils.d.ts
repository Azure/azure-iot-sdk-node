import { NoErrorCallback } from 'azure-iot-common';
export declare function getUserAgentString(done: NoErrorCallback<string>): void;
export declare function getUserAgentString(): Promise<string>;
export declare function getUserAgentString(productInfo: string, done: NoErrorCallback<string>): void;
export declare function getUserAgentString(productInfo: string): Promise<string>;
