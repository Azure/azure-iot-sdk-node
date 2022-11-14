// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const EventEmitter = require('events').EventEmitter;
const ExternalEventTracker = require('../dist/external_event_tracker.js').ExternalEventTracker;

describe('ExternalEventTracker', function () {
  let emitter;
  let externalEventTracker;

  beforeEach(function () {
    emitter = new EventEmitter();
    sinon.spy(emitter, 'addListener');
    sinon.spy(emitter, 'removeListener');
    externalEventTracker = new ExternalEventTracker(emitter);
  });

  describe('#addTrackedListener', function () {
    it('adds listener for a previously untracked event', function () {
      const listener = function () {};
      externalEventTracker.addTrackedListener('test', listener);
      assert.isTrue(emitter.addListener.calledOnceWith('test', listener));
      assert.strictEqual(externalEventTracker._listenerContainer.get('test').length, 1);
      assert.strictEqual(externalEventTracker._listenerContainer.get('test')[0], listener);
    });

    it('adds listener for already tracked event', function () {
      const listener1 = function () {};
      const listener2 = function () {};
      externalEventTracker.addTrackedListener('test', listener1);
      externalEventTracker.addTrackedListener('test', listener2);
      assert.strictEqual(emitter.addListener.callCount, 2);
      assert.isTrue(emitter.addListener.getCall(0).calledWith('test', listener1));
      assert.isTrue(emitter.addListener.getCall(1).calledWith('test', listener2));
      assert.strictEqual(externalEventTracker._listenerContainer.get('test').length, 2);
      assert.strictEqual(externalEventTracker._listenerContainer.get('test')[0], listener1);
      assert.strictEqual(externalEventTracker._listenerContainer.get('test')[1], listener2);
    });
  });

  describe('#removeTrackedListener', function () {
    it('removes last listener for tracked event', function () {
      const listener = function () {};
      externalEventTracker.addTrackedListener('test', listener);
      externalEventTracker.removeTrackedListener('test', listener);

      assert.isTrue(emitter.removeListener.calledOnceWith('test', listener));
      assert.isFalse(externalEventTracker._listenerContainer.has('test'));
    });

    it('removes listener from tracked event with other listener remaining', function () {
      const listener1 = function () {};
      const listener2 = function () {};
      externalEventTracker.addTrackedListener('test', listener1);
      externalEventTracker.addTrackedListener('test', listener2);
      externalEventTracker.removeTrackedListener('test', listener1);

      assert.isTrue(emitter.removeListener.calledOnceWith('test', listener1));
      assert.strictEqual(externalEventTracker._listenerContainer.get('test').length, 1);
      assert.strictEqual(externalEventTracker._listenerContainer.get('test')[0], listener2);
    });

    it('does nothing if attempting to remove listener on an untracked event', function () {
      const listener = function () {};
      externalEventTracker.removeTrackedListener('test', listener);

      assert.isTrue(emitter.removeListener.notCalled);
    });

    it('does nothing if there is no listener match on a tracked event', function () {
      const listener1 = function () {};
      const listener2 = function () {};
      externalEventTracker.addTrackedListener('test', listener1);
      externalEventTracker.removeTrackedListener('test', listener2);

      assert.isTrue(emitter.removeListener.notCalled);
    });
  });

  describe('#removeAllTrackedListeners', function () {
    it('removes all listeners for a tracked event', function () {
      const [event1, event2] = ['test1', 'test2'];
      const event1listener1 = function () {};
      const event1listener2 = function () {};
      const event2listener = function () {};
      externalEventTracker.addTrackedListener(event1, event1listener1);
      externalEventTracker.addTrackedListener(event1, event1listener2);
      externalEventTracker.addTrackedListener(event2, event2listener);

      externalEventTracker.removeAllTrackedListeners(event1);
      assert.isTrue(emitter.removeListener.calledTwice);
      assert.isTrue(emitter.removeListener.getCall(0).calledWith(event1, event1listener1));
      assert.isTrue(emitter.removeListener.getCall(1).calledWith(event1, event1listener2));
      assert.isFalse(externalEventTracker._listenerContainer.has(event1));
      assert.strictEqual(externalEventTracker._listenerContainer.get(event2).length, 1);
      assert.isTrue(externalEventTracker._listenerContainer.get(event2)[0] === event2listener);
    });

    it('removes all listeners for every tracked event if no event specified', function () {
      const [event1, event2] = ['test1', 'test2'];
      const event1listener1 = function () {};
      const event1listener2 = function () {};
      const event2listener1 = function () {};
      const event2listener2 = function () {};
      externalEventTracker.addTrackedListener(event1, event1listener1);
      externalEventTracker.addTrackedListener(event1, event1listener2);
      externalEventTracker.addTrackedListener(event2, event2listener1);
      externalEventTracker.addTrackedListener(event2, event2listener2);

      externalEventTracker.removeAllTrackedListeners();
      assert.strictEqual(emitter.removeListener.callCount, 4);
      assert.isTrue(emitter.removeListener.getCall(0).calledWith(event1, event1listener1));
      assert.isTrue(emitter.removeListener.getCall(1).calledWith(event1, event1listener2));
      assert.isTrue(emitter.removeListener.getCall(2).calledWith(event2, event2listener1));
      assert.isTrue(emitter.removeListener.getCall(3).calledWith(event2, event2listener2));
      assert.isFalse(externalEventTracker._listenerContainer.has(event1));
      assert.isFalse(externalEventTracker._listenerContainer.has(event2));
    });
  });

  it('does nothing if there are no listeners on the event specified', function () {
    const listener1 = function () {}
    const listener2 = function () {}
    externalEventTracker.addTrackedListener('test', listener1);
    externalEventTracker.addTrackedListener('test', listener2);
    externalEventTracker.removeAllTrackedListeners('doesnotexist');

    assert.isTrue(emitter.removeListener.notCalled);
  });

  it('does nothing if no tracked listeners exist on any event', function () {
    externalEventTracker.removeAllTrackedListeners();
    assert.isTrue(emitter.removeListener.notCalled);
  });
});
