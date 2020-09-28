/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

export const apiVersion = '2020-09-30';
export const apiVersionLimitedAvail = '2020-03-13';

export function devicePath(deviceId: string): string {
  return '/devices/' + deviceId;
}

export function deviceEventPath(deviceId: string): string {
  return devicePath(deviceId) + '/messages/events';
}

export function deviceMessagePath(deviceId: string): string {
  return devicePath(deviceId) + '/messages/devicebound';
}

export function deviceMethodPath(deviceId: string): string {
  return devicePath(deviceId) + '/methods/devicebound';
}

export function deviceTwinPath(deviceId: string): string {
  return devicePath(deviceId) + '/twin';
}

export function deviceFeedbackPath(deviceId: string, lockToken: string): string {
  return deviceMessagePath(deviceId) + '/' + lockToken;
}

export function deviceBlobUploadPath(deviceId: string): string {
  return devicePath(deviceId) + '/files';
}

export function deviceBlobUploadNotificationPath(deviceId: string, correlationId: string): string {
  return devicePath(deviceId) + '/files/notifications/' + encodeURIComponent(correlationId);
}

export function modulePath(deviceId: string, moduleId: string): string {
  return '/devices/' + deviceId + '/modules/' + moduleId;
}

export function moduleEventPath(deviceId: string, moduleId: string): string {
  return modulePath(deviceId, moduleId) + '/messages/events';
}

export function moduleMessagePath(deviceId: string, moduleId: string): string {
  return modulePath(deviceId, moduleId) + '/messages/events';
}

export function moduleMethodPath(deviceId: string, moduleId: string): string {
  return modulePath(deviceId, moduleId) + '/methods/devicebound';
}

export function moduleTwinPath(deviceId: string, moduleId: string): string {
  return modulePath(deviceId, moduleId) + '/twin';
}

export function moduleInputMessagePath(deviceId: string, moduleId: string): string {
  return modulePath(deviceId, moduleId) + '/inputs';
}

export function versionQueryString(): string {
  return '?api-version=' + apiVersion;
}

export function versionQueryStringLimitedAvailability(): string {
  // This addition is for the limited Availability of certain service
  // regions
  if (process.env.EnableStorageIdentity === '1') {
    return '?api-version=' + apiVersionLimitedAvail;
  } else {
    return '?api-version=' + apiVersion;
  }
}
