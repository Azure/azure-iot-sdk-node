// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

/**
 * Object to keep track of objects via assigned names.  Assigned names are used to send object references over REST.
 */
var NamedObjectCache = function() {
  this.ObjectMap = {}
};

/**
 * Internal function to assign the next object ID for a given object type
 */
NamedObjectCache.prototype._getNextObjectId = function(objectType) {
  return objectType + "_" + (Object.keys(this.ObjectMap).length + 1).toString();
}

/**
 * Add a new object to the cache.
 *
 * @param {string} objectType   Type of object.  Used to assign a name
 * @param {Object} object       Object to add to the cache
 *
 * @returns Name of the object.  This name can be used to retrieve the object back from the cache.
 */
NamedObjectCache.prototype.addObject = function(objectType, object) {
  var objectId = this._getNextObjectId(objectType);
  this.ObjectMap[objectId] = object;
  return objectId;
}

/**
 * Get an object from the cache
 *
 * @param {string} objectId   Name of the object
 *
 * @returns Object with the given ID.  null if the object is not in the cache.
 */
NamedObjectCache.prototype.getObject = function(objectId) {
  return this.ObjectMap[objectId];
}

/**
 * Remove an object from the cache
 *
 * @param {string} objectId   Name of the object
 *
 * @returns Object with the given ID that was just removed from the cache.
 * null if the object is not in the cache.
 */
NamedObjectCache.prototype.removeObject = function(objectId) {
  var value = this.ObjectMap[objectId];
  delete this.ObjectMap[objectId];
  return value;
}

/**
 * Get the object map for the cache
 *
 * @return An object that contains all of the cached objects.
 */
NamedObjectCache.prototype.getMap = function() {
  return this.ObjectMap;
}

module.exports = NamedObjectCache;