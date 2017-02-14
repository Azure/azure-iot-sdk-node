// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var apiVersion = '2016-11-14';

function devicePath(id) {
  return '/devices/' + id;
}

function eventPath(id) {
  return devicePath(id) + '/messages/events';
}

function messagePath(id) {
  return devicePath(id) + '/messages/devicebound';
}

function feedbackPath(id, lockToken) {
  return messagePath(id) + '/' + lockToken;
}

function versionQueryString() {
  return '?api-version=' + apiVersion;
}

var endpoint = {
  devicePath: devicePath,
  eventPath: eventPath,
  messagePath: messagePath,
  feedbackPath: feedbackPath,
  versionQueryString: versionQueryString,
  apiVersion: apiVersion
};

module.exports = endpoint;
