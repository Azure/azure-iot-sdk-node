/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
export declare const apiVersion = "2020-05-31-preview";
export declare const apiVersionLimitedAvail = "2020-03-13";
export declare function devicePath(deviceId: string): string;
export declare function deviceEventPath(deviceId: string): string;
export declare function deviceMessagePath(deviceId: string): string;
export declare function deviceMethodPath(deviceId: string): string;
export declare function deviceTwinPath(deviceId: string): string;
export declare function deviceFeedbackPath(deviceId: string, lockToken: string): string;
export declare function deviceBlobUploadPath(deviceId: string): string;
export declare function deviceBlobUploadNotificationPath(deviceId: string, correlationId: string): string;
export declare function modulePath(deviceId: string, moduleId: string): string;
export declare function moduleEventPath(deviceId: string, moduleId: string): string;
export declare function moduleMessagePath(deviceId: string, moduleId: string): string;
export declare function moduleMethodPath(deviceId: string, moduleId: string): string;
export declare function moduleTwinPath(deviceId: string, moduleId: string): string;
export declare function moduleInputMessagePath(deviceId: string, moduleId: string): string;
export declare function versionQueryString(): string;
export declare function versionQueryStringLimitedAvailability(): string;
