// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const debug = require('debug')('stresstests:StressMeasurementsRecorder');

/**
 * Helps record relevant measurements for stress tests.
 */
class StressMeasurementsRecorder {
  /**
   * Construct a StressMeasurementsRecorder instance
   *
   * @public
   */
  constructor() {
    this._client = null;
    this._done = true;
    this.peakRssInBytes = null
    this.telemetryMessagesInQueue = null;
    this.peakTelemetryMessagesInQueue = null;
    this.peakTelemetryArrivalTimeInMs = null;
    this.peakReconnectTimeInMs = null;
    this.totalElapsedTime = null;
    this._startTime = null;
    this._memorySamplingInterval = null;
    this._disconnectedTime = null;
  }

  /**
   * This should be called when a message is sent from the device side to keep
   * track of the number of messages in the queue.
   *
   * @public
   */
  messageEnqueued() {
    if (this._done) {
      throw new Error('start() must be called before calling messageArrived()');
    }
    this.peakTelemetryMessagesInQueue = Math.max(this.peakTelemetryMessagesInQueue, ++this.telemetryMessagesInQueue);
  }

  /**
   * This should be called when a message is received from the service side to
   * keep track of the messages in the queue and the peak telemetry arrival time.
   *
   * @param {number} arrivalTimeInMs - The amount of time from when the message
   *   was sent on the device side to when it was seen on the service side.
   * @public
   */
  messageArrived(arrivalTimeInMs) {
    if (this._done) {
      throw new Error('start() must be called before calling messageArrived()');
    }
    if (!arrivalTimeInMs) {
      throw new Error('arrivalTimeInMs must be defined.');
    }
    if (typeof arrivalTimeInMs !== 'number') {
      throw new TypeError('arrivalTimeInMs must be a number');
    }
    --this.telemetryMessagesInQueue;
    this.peakTelemetryArrivalTimeInMs = Math.max(this.peakTelemetryArrivalTimeInMs, arrivalTimeInMs);
  }

  /**
   * This function should be called at the beginning of every test.
   *
   * @param {object} client - A Client or ModuleClient instance. Used to keep
   *   track of connects and disconnects
   * @param {number} memorySamplingIntervalInMs - The time interval to sample
   *   the RSS to keep track of memory usage.
   * @public
   */
  start(client, memorySamplingIntervalInMs) {
    if (!this._done) {
      throw new Error('Already started. done() must be called before calling this function.')
    }
    if (!memorySamplingIntervalInMs) {
      throw new Error('memorySamplingIntervalInMs must be defined.');
    }
    if (typeof memorySamplingIntervalInMs !== 'number') {
      throw new TypeError('memorySamplingIntervalInMs must be a number');
    }
    if (!client) {
      throw new Error('client must be defined.');
    }
    if (typeof client !== 'object') {
      throw new TypeError('client must be an object');
    }
    this._client = client;
    this._done = false;
    this.peakRssInBytes = process.memoryUsage().rss;
    this.telemetryMessagesInQueue = 0;
    this.peakTelemetryMessagesInQueue = 0;
    this.peakTelemetryArrivalTimeInMs = null;
    this.peakReconnectTimeInMs = null;
    this.totalElapsedTime = null;
    this._startTime = Date.now();
    this._disconnectedTime = null;
    this._memorySamplingInterval = setInterval(() => {
      const rss = process.memoryUsage().rss;
      this.peakRssInBytes = Math.max(this.peakRssInBytes, rss);
      debug(`RSS: ${rss / 1024 / 1024} MiB (max ${this.peakRssInBytes / 1024 / 1024} MiB)`);
    }, memorySamplingIntervalInMs);
    this._client.on('connect', this._connectHandler);
    this._client.on('disconnect', this._disconnectHandler);
  }

  /**
   * This should be called at the end of a test to clean up listeners and
   * intervals, finalize measurements, and reset the state for the recorder
   * to be started again by the next test.
   *
   * @public
   */
  done() {
    if (this._done) {
      return;
    }
    clearInterval(this._memorySamplingInterval);
    this._client.off('connect', this._connectHandler.bind(this));
    this._client.off('disconnect', this._disconnectHandler.bind(this));
    this.totalElapsedTime = Date.now() - this._startTime;
    this._done = true;
  }

  /**
   * @private
   */
  _connectHandler() {
    debug('client emitted a connect event');
    if (this._disconnectedTime) {
      this.peakReconnectTimeInMs = Math.max(this.peakReconnectTimeInMs, Date.now() - this._disconnectedTime);
      this._disconnectedTime = null;
    }
  }

  /**
   * @private
   */
  _disconnectHandler() {
    debug('client emitted a disconnect event');
    if (!this._disconnectedTime) {
      this._disconnectedTime = Date.now();
    }
  }
}

module.exports = StressMeasurementsRecorder;
