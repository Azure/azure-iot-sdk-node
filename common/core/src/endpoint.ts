/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

export const apiVersion = '2016-11-14';

export function devicePath(id: string): string {
  return '/devices/' + id;
}

export function eventPath(id: string): string {
  return devicePath(id) + '/messages/events';
}

export function messagePath(id: string): string {
  return devicePath(id) + '/messages/devicebound';
}

export function feedbackPath(id: string, lockToken: string): string {
  return messagePath(id) + '/' + lockToken;
}

export function versionQueryString(): string {
  return '?api-version=' + apiVersion;
}
