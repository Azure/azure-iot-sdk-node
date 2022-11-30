#!/usr/bin/env node
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
process.env.DEBUG += ',longhaul*';

import * as deviceIdentityHelper from './device_identity_helper';
import { Client } from 'azure-iot-device';
import { Message } from 'azure-iot-common';
import * as utils from './utils';
import * as dbg from 'debug';
import { amqpFaults } from './faults';

const debug = dbg('longhaul');
const debugErrors = dbg('longhaul:Errors');

// Handy constants for making time readable
const MILLISECONDS = 1;
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

// How long to run the test
const MAX_EXECUTION_TIME = 24 * HOURS;

// How many device clients to create
const NUMBER_OF_DEVICES = 10;

// How frequently to send D2C messages
const D2C_SEND_INTERVAL = 200 * MILLISECONDS;

// How frequently to inject faults, minimum and maximum values
const FAULT_INTERVAL_MIN = 2 * SECONDS;
const FAULT_INTERVAL_MAX = 10 * SECONDS;

// How long iothub delays between receiving the fault command and the actual fault.
const FAULT_DELAY_SECONDS = 1;

// Transport to use
const protocol = utils.getTransport('amqp');

// Which faults to inject
const faults = amqpFaults;

// Awaitable sleep helper
function sleep(interval: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, interval));
}

// Running counter of sent messages
let globalSendCount = 0;

// Interface for our top-level tasks. A top-level task is an awaitable function that
// runs for the length of the test.
interface TopLevelTask {
  done: boolean;
  stats: any;
  objectName: string;
  run(): Promise<void>;
}

// Top-level task for a device instance
class Device implements TopLevelTask {
  _sendIndex: number = 0;
  _faultCount: number = 0;
  done: boolean = false;
  client: Client;
  deviceId: string;
  stats: any = {
    sendEventCount: 0,
    totalFaultCount: 0,
  };
  objectName: string;

  // Main loop for the top-level task
  public async run(): Promise<void> {
    // Create a device instance
    const description = await deviceIdentityHelper.createDeviceWithSymmetricKey();
    this.deviceId = description.deviceId;
    this.objectName = description.deviceId;

    let tasks = [];
    try {
      // Create the client and connect.
      this.client = Client.fromConnectionString(description.connectionString, protocol);
      await this.client.open();

      // Spin up tasks for operations to run at various intervals.
      tasks = [
        this._runAtInterval(this._send.bind(this), D2C_SEND_INTERVAL),
        this._runAtRandomInterval(this._fault.bind(this), FAULT_INTERVAL_MIN, FAULT_INTERVAL_MAX),
      ];

      // Wait for one of the sub-tasks to fail or complete.
      await Promise.race(tasks);
    } catch (e) {
      debugErrors(`Exception: ${e}`);
      throw e;
    } finally {
      debug('One device task exited.  Stopping device');
      this.done = true;
      try {
        if (tasks) {
          await (Promise as any).allSettled(tasks);
        }
      } finally {
        debug('finally');
        await this.client.close();
        await deviceIdentityHelper.deleteDevice(this.deviceId);
        debug('device deleted');
      }
    }
  }

  // Helper function run run an async function at a regular interval.
  private async _runAtInterval(func: () => void, interval: number): Promise<void> {
    while (!this.done) {
      await func();
      await sleep(interval);
    }
  }

  // Helper function to run an async function at a random interval.
  private async _runAtRandomInterval(
    func: () => void,
    minInterval: number,
    maxInterval: number
  ): Promise<void> {
    while (!this.done) {
      await func();
      const interval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
      await sleep(interval);
    }
  }

  // Send a single D2C message.
  private async _send(): Promise<void> {
    const body = JSON.stringify({ msg: `message index ${this._sendIndex}, ${globalSendCount}` });
    const msg = new Message(body);
    msg.messageId = this._sendIndex.toString();
    this._sendIndex += 1;
    globalSendCount += 1;

    await this.client.sendEvent(msg);
    debug(`Done sending ${body} for ${this.deviceId}`);
    this.stats.sendEventCount++;
  }

  // Send a fault-injecting message
  private async _fault(): Promise<void> {
    // Cycle through faults.
    const fault = faults[this._faultCount % faults.length];
    this._faultCount++;

    // Make a message to send the fault command to iothub
    const faultMessage = new Message('');
    faultMessage.properties.add('AzIoTHub_FaultOperationType', fault.operationType);
    faultMessage.properties.add('AzIoTHub_FaultOperationCloseReason', fault.closeReason);
    faultMessage.properties.add(
      'AzIoTHub_FaultOperationDelayInSecs',
      FAULT_DELAY_SECONDS.toString()
    );

    await this.client.sendEvent(faultMessage);
    debug(`Done sending fault #${this._faultCount} for ${this.deviceId}`);

    // Keep track of what faults are injected.
    const statName = `faultCount-${fault.operationType}`;
    this.stats[statName] = this.stats[statName] || 0;
    this.stats[statName]++;
    this.stats.totalFaultCount++;
  }
}

// Top-level task for limiting the length of the test.  This task just sleeps
// until the time elapses and then raises a string to actually end the task.
class TimeLimit implements TopLevelTask {
  _interval: number;
  _resolution: number = 1000;
  _end: number;
  done: boolean = false;
  stats: any;
  objectName: string = 'TimeLimit';

  constructor(interval: number) {
    this._interval = interval;
    this.stats = {
      totalTime: utils.getIntervalString(interval),
    };
  }

  async run(): Promise<void> {
    this._end = Date.now() + this._interval;

    // use our async sleep function to sleep for the full interval.
    // But check the done flag every once in a while so this coroutine can exit
    // at the end of the test
    while (!this.done && Date.now() < this._end) {
      await sleep(Math.min(this._resolution, this._end - Date.now()));
      this.stats.remainingTime = utils.getIntervalString(Math.max(0, this._end - Date.now()));
    }

    if (Date.now() >= this._end) {
      // If we're at the end of the interval.  Raise a string to signal the end of the test.
      // Returning here would also signal the end of the test, but we use the string
      // to carry the reason for exit to the end of the test.
      throw `Interval of ${utils.getIntervalString(this._interval)} elapsed.`;
    }
  }
}

async function main(): Promise<void> {
  // Create an array of tasks to run for the duration of the test
  const topLevelTaskObjects: Array<TopLevelTask> = [new TimeLimit(MAX_EXECUTION_TIME)];
  for (let i = 0; i < NUMBER_OF_DEVICES; i++) {
    topLevelTaskObjects.push(new Device());
  }
  const tasks = topLevelTaskObjects.map((d) => d.run());

  // Wait for one of the tasks to complete or fail.
  try {
    await Promise.race(tasks);
  } finally {
    // Set a "done" flag to stop all top-level tasks and wait for them to settle
    debug('one top level task done.  Stopping all top level tasks');
    topLevelTaskObjects.forEach((d) => {
      d.done = true;
    });
    await (Promise as any).allSettled(tasks);
    debug('Done stopping all top level tasks');
    debug('----------------------------------------------------------------');

    // Collect stats from all the top-level tasks and report them
    const stats: object = {};
    topLevelTaskObjects.forEach((d) => {
      stats[d.objectName] = d.stats;
    });

    debug('Final results:');
    debug(JSON.stringify(stats, null, 2));
  }
}

main()
  .catch((e) => {
    debugErrors('----------------------------------------------------------------');
    debugErrors('reason for exit:');
    debugErrors(e);
    debugErrors('----------------------------------------------------------------');
    // Top-level tasks can raise strings to stop the test in non-failure situations
    if (e instanceof Error) {
      debugErrors('exiting with error 1');
      return 1;
    }
  })
  .finally(() => {
    debug('done with app');
  });
