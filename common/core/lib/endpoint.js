/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiVersion = '2020-05-31-preview';
exports.apiVersionLimitedAvail = '2020-03-13';
function devicePath(deviceId) {
    return '/devices/' + deviceId;
}
exports.devicePath = devicePath;
function deviceEventPath(deviceId) {
    return devicePath(deviceId) + '/messages/events';
}
exports.deviceEventPath = deviceEventPath;
function deviceMessagePath(deviceId) {
    return devicePath(deviceId) + '/messages/devicebound';
}
exports.deviceMessagePath = deviceMessagePath;
function deviceMethodPath(deviceId) {
    return devicePath(deviceId) + '/methods/devicebound';
}
exports.deviceMethodPath = deviceMethodPath;
function deviceTwinPath(deviceId) {
    return devicePath(deviceId) + '/twin';
}
exports.deviceTwinPath = deviceTwinPath;
function deviceFeedbackPath(deviceId, lockToken) {
    return deviceMessagePath(deviceId) + '/' + lockToken;
}
exports.deviceFeedbackPath = deviceFeedbackPath;
function deviceBlobUploadPath(deviceId) {
    return devicePath(deviceId) + '/files';
}
exports.deviceBlobUploadPath = deviceBlobUploadPath;
function deviceBlobUploadNotificationPath(deviceId, correlationId) {
    return devicePath(deviceId) + '/files/notifications/' + encodeURIComponent(correlationId);
}
exports.deviceBlobUploadNotificationPath = deviceBlobUploadNotificationPath;
function modulePath(deviceId, moduleId) {
    return '/devices/' + deviceId + '/modules/' + moduleId;
}
exports.modulePath = modulePath;
function moduleEventPath(deviceId, moduleId) {
    return modulePath(deviceId, moduleId) + '/messages/events';
}
exports.moduleEventPath = moduleEventPath;
function moduleMessagePath(deviceId, moduleId) {
    return modulePath(deviceId, moduleId) + '/messages/events';
}
exports.moduleMessagePath = moduleMessagePath;
function moduleMethodPath(deviceId, moduleId) {
    return modulePath(deviceId, moduleId) + '/methods/devicebound';
}
exports.moduleMethodPath = moduleMethodPath;
function moduleTwinPath(deviceId, moduleId) {
    return modulePath(deviceId, moduleId) + '/twin';
}
exports.moduleTwinPath = moduleTwinPath;
function moduleInputMessagePath(deviceId, moduleId) {
    return modulePath(deviceId, moduleId) + '/inputs';
}
exports.moduleInputMessagePath = moduleInputMessagePath;
function versionQueryString() {
    return '?api-version=' + exports.apiVersion;
}
exports.versionQueryString = versionQueryString;
function versionQueryStringLimitedAvailability() {
    // This addition is for the limited Availability of certain service
    // regions
    if (process.env.EnableStorageIdentity === '1') {
        return '?api-version=' + exports.apiVersionLimitedAvail;
    }
    else {
        return '?api-version=' + exports.apiVersion;
    }
}
exports.versionQueryStringLimitedAvailability = versionQueryStringLimitedAvailability;
//# sourceMappingURL=endpoint.js.map