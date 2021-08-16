// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var ClientPropertyCollection = require('../../dist/pnp').ClientPropertyCollection;
var ClientProperties = require('../../dist/pnp').ClientProperties;
var generateWritablePropertyResponse = require('../../dist/pnp').generateWritablePropertyResponse;

describe('generateWritablePropertyResponse', function () {
  it('returns an object with the correctly populated values', function () {
    assert.deepEqual(
      generateWritablePropertyResponse(
        {key: 'value'},
        200,
        'request succeeded',
        42
      ),
      {
        value: {key: 'value'},
        ac: 200,
        ad: 'request succeeded',
        av: 42
      }
    );
  });
});

describe('ClientPropertyCollection', function () {
  describe('constructor', function () {
    it('sets the backingObject to empty object if no argument is provided', function() {
      const collection = new ClientPropertyCollection();
      assert.deepEqual(collection.backingObject, {});
    });

    it('sets the backingObject to the provided argument', function() {
      const collection = new ClientPropertyCollection({key: 'value'});
      assert.deepEqual(collection.backingObject, {key: 'value'});
    });
  });

  describe('version', function() {
    [123, '123', 12.3, '12.3', null, ''].forEach(($version) => {
      it(`is equivalent to Number(backingObject.$version) (${typeof $version} ${$version})`, function () {
        const collection = new ClientPropertyCollection({$version});
        assert.strictEqual(collection.version, Number($version));
      });
    });

    [undefined, 'unicorn', {}].forEach(($version) => {
      it(`returns NaN if it cannot be converted to a number (${typeof $version} ${$version})`, function() {
        const collection = new ClientPropertyCollection({$version});
        assert.isNaN(collection.version);
      });
    });
  });

  describe('getProperty', function() {
    [{property: 'some property'}, {component: 'string'}, {component: 42}, {component: false}, {}].forEach((backingObject) => {
      it(`returns undefined if the component property does not exist (${JSON.stringify(backingObject)})`, function () {
        const collection = new ClientPropertyCollection(backingObject);
        assert.isUndefined(collection.getProperty('component', 'property'));
      });
    });

    it(`returns the component property if it exists`, function () {
      const collection = new ClientPropertyCollection({
        property: 'property value',
        component: {
          __t: 'c',
          componentProperty: 'component property value'
        }
      });
      assert.strictEqual(collection.getProperty('component', 'componentProperty'), 'component property value');
    });

    it('returns the property if it exists', function () {
      const collection = new ClientPropertyCollection({property: 'value'});
      assert.strictEqual(collection.getProperty('property'), 'value');
    });

    [{otherProperty: 'not the property we want'}, {}].forEach((backingObject) => {
      it(`returns undefined if the property does not exist (${JSON.stringify(backingObject)})`, function () {
        const collection = new ClientPropertyCollection(backingObject);
        assert.isUndefined(collection.getProperty('property'));
      });
    });
  });

  describe('setProperty', function() {
    [{property: 'some property'}, {component: 'string'}, {component: 42}, {component: false}, {}].forEach((backingObject) => {
      it(`creates an object with __t: c property if the component does not exist or is not an object (${JSON.stringify(backingObject)})`, function () {
        const collection = new ClientPropertyCollection(backingObject);
        collection.setProperty('component', 'componentProperty', 'component property value');
        assert.strictEqual(collection.backingObject.component.__t, 'c');
        assert.strictEqual(collection.backingObject.component.componentProperty, 'component property value');
      });
    });

    it('can set null component property values', function () {
      const collection = new ClientPropertyCollection({component: {__t: 'c', componentProperty: 'value'}});
      collection.setProperty('component', 'componentProperty', null);
      assert.deepEqual(collection.backingObject, {component: {__t: 'c', componentProperty: null}});
    });

    it('can overwrite existing component property values', function () {
      const collection = new ClientPropertyCollection({component: {__t: 'c', componentProperty: 'old value'}});
      collection.setProperty('component', 'componentProperty', 'new value');
      assert.deepEqual(collection.backingObject, {component: {__t: 'c', componentProperty: 'new value'}});
    });

    it('creates a property if it doesn\'t exist', function () {
      const collection = new ClientPropertyCollection();
      collection.setProperty('property', 'value');
      assert.deepEqual(collection.backingObject, {property: 'value'});
    });

    it('can set null property values', function() {
      const collection = new ClientPropertyCollection();
      collection.setProperty('property', null);
      assert.deepEqual(collection.backingObject, {property: null});
    });

    it('can overwrite existing property values', function () {
      const collection = new ClientPropertyCollection({property: 'old value'});
      collection.setProperty('property', 'new value');
      assert.deepEqual(collection.backingObject, {property: 'new value'});
    });
  });
});

describe('ClientProperties', function () {
  describe('constructor', function () {
    it('creates ClientPropertyCollection instances using the provided twin', function () {
      const properties = {
        desired: {
          desiredKey: 'desiredValue'
        },
        reported: {
          reportedKey: 'reportedValue'
        }
      };
      const clientProperties = new ClientProperties({properties});
      assert.deepEqual(clientProperties.writablePropertiesRequests.backingObject, {desiredKey: 'desiredValue'});
      assert.deepEqual(clientProperties.reportedFromDevice.backingObject, {reportedKey: 'reportedValue'});
    });

    it('creates empty ClientPropertyCollection instances if no twin is provided', function () {
      const clientProperties = new ClientProperties();
      assert.deepEqual(clientProperties.writablePropertiesRequests.backingObject, {});
      assert.deepEqual(clientProperties.reportedFromDevice.backingObject, {});
    });
  });
});