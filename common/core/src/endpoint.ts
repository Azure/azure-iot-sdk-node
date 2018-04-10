/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

export const apiVersion = '2017-11-08-preview';

export function devicePath(deviceId: string, moduleId?: string): string {
  if (moduleId) {
    return '/devices/' + deviceId + '/modules/' + moduleId;
  } else {
    return '/devices/' + deviceId;
  }
}

export function eventPath(deviceId: string, moduleId?: string): string {
  return devicePath(deviceId, moduleId) + '/messages/events';
}

export function messagePath(deviceId: string, moduleId?: string): string {
  return devicePath(deviceId, moduleId) + '/messages/devicebound';
}

export function feedbackPath(id: string, lockToken: string): string {
  return messagePath(id) + '/' + lockToken;
}

export function versionQueryString(): string {
  return '?api-version=' + apiVersion;
}
