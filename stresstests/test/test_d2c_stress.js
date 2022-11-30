// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const config = require('./config').d2c;
const EventHubHelper = require('./event_hub_helper.js');
const DeviceClientHelper = require('./device_client_helper.js');
const StressMeasurementsRecorder = require('./stress_measurements_recorder.js');
const Message = require('azure-iot-common').Message;
const uuid = require('uuid');
const assert = require('chai').assert;
const wtf = require('wtfnode');
const debug = require('debug')('stresstests:d2c');

/* NOTE: This test relies on the IOTHUB_CONNECTION_STRING environment variable */

config.transportsToTest.forEach((transportToTest) => {
  config.deviceClientHelperMethodsToUse.forEach((deviceClientHelperMethodToUse) => {
    d2cStressTests(transportToTest, deviceClientHelperMethodToUse);
  });
});

function d2cStressTests(transportToTest, deviceClientHelperMethodToUse) {
  describe(`D2C stress tests on client created with ${deviceClientHelperMethodToUse} over transport ${transportToTest.name}`, function () {
    let deviceClientHelper = null;
    let eventHubHelper = null;
    let stressMeasurementsRecorder = null;

    before(function () {
      // TODO: Remove test skipping when appropriate.
      if (['Amqp', 'AmqpWs'].includes(transportToTest.name)) {
        debug(
          'Tests over AMQP failing because of an issue with messageIds not '
          + 'matching up on the service side. Skipping.'
        );
        // eslint-disable-next-line no-invalid-this
        this.skip();
      }
      if ([
        'createDeviceClientX509SelfSigned',
        'createDeviceClientX509CaSigned'
      ].includes(deviceClientHelperMethodToUse)) {
        debug(
          'DeviceClientHelper has not implemented '
          + `${deviceClientHelperMethodToUse}. Skipping.`
        );
        // eslint-disable-next-line no-invalid-this
        this.skip();
      }

      deviceClientHelper = new DeviceClientHelper();
      eventHubHelper = new EventHubHelper();
      stressMeasurementsRecorder = new StressMeasurementsRecorder();
    });

    beforeEach(async function () {
      await eventHubHelper.open();
      await deviceClientHelper[deviceClientHelperMethodToUse](transportToTest);
      stressMeasurementsRecorder.start(
        deviceClientHelper.client,
        config.memorySamplingIntervalInMs
      );
    })

    afterEach(async function () {
      // eslint-disable-next-line no-invalid-this
      this.timeout(30 * 1000);
      /*  done() should have been called within the test, but we call it here in
          case the test failed and done() didn't get called. */
      stressMeasurementsRecorder.done();
      await Promise.all([
        eventHubHelper.close(),
        deviceClientHelper.disposeClient()
      ]);
    });

    after(wtf.dump);

    async function sendSingleMessage() {
      const messageId = uuid.v4();
      /* Function creates a string of random ASCII values between 32 and 126 */
      const randomString = (length) => Array.from(
        { length },
        () => String.fromCharCode(Math.floor(95 * Math.random() + 32))
      ).join('');
      /* 7 is the number of characters in {"":""} */
      const payloadSize = Math.max(config.telemetryPayloadSizeInBytes, 7);
      const keyLength = Math.ceil((payloadSize - 7) / 2);
      const valLength = payloadSize - keyLength - 7;
      const message = new Message(JSON.stringify({ [randomString(keyLength)]: randomString(valLength) }));
      message.messageId = messageId;
      const deferred = eventHubHelper.awaitMessage(messageId);
      stressMeasurementsRecorder.messageEnqueued();
      try {
        await deviceClientHelper.client.sendEvent(message);
      } catch (err) {
        const transportState = deviceClientHelper.client._transport._fsm
          && deviceClientHelper.client._transport._fsm.compositeState();
        debug(
          `Error sending message with ID ${messageId}: ${err}.` +
          `${transportState ? ` Transport state: ${transportState}.` : ''}`
        );
      }
      await deferred;
      stressMeasurementsRecorder.messageArrived(deferred.timeToSettle);
    }

    async function doContinuousSending(testDurationInMs, messagesPerSecond) {
      const endTime = Date.now() + testDurationInMs;
      const promises = [];
      do {
        promises.push(sendSingleMessage());
        await new Promise((resolve) => setTimeout(resolve, (1 / messagesPerSecond) * 1000));
      } while (Date.now() < endTime);
      await Promise.all(promises);
    }

    async function doSendingAllAtOnce(messageCount) {
      // eslint-disable-next-line no-invalid-this
      await Promise.all(Array.from({ length: messageCount }, sendSingleMessage, this));
    }

    function doMeasurementAssertions() {
      assert.isAtMost(
        stressMeasurementsRecorder.peakRssInBytes,
        config.peakRssFailureTriggerInBytes,
        `Recorded peak RSS of ${stressMeasurementsRecorder.peakRssInBytes / 1024 / 1024} MiB exceeded`
        + ` the configured maximum of ${config.peakRssFailureTriggerInBytes / 1024 / 1024} MiB`
      );
      assert.isAtMost(
        Number(stressMeasurementsRecorder.peakReconnectTimeInMs),
        config.peakReconnectTimeFailureTriggerInMs,
        `Recorded peak reconnect time of ${stressMeasurementsRecorder.peakReconnectTimeInMs} ms`
        + ` exceeded the configured maximum of ${config.peakReconnectTimeFailureTriggerInMs} ms`
      );
      assert.isAtMost(
        Number(stressMeasurementsRecorder.peakTelemetryArrivalTimeInMs),
        config.peakTelemetryArrivalTimeFailureTriggerInMs,
        `Recorded peak telemetry arrival time of ${stressMeasurementsRecorder.peakTelemetryArrivalTimeInMs} ms`
        + ` exceeded the configured maximum of ${config.peakTelemetryArrivalTimeFailureTriggerInMs} ms`
      );
    }

    it(`can send ${config.continuousTest.messagesPerSecond} messages per second for ${config.continuousTest.testDurationInMs} ms`, async function () {
      // eslint-disable-next-line no-invalid-this
      this.timeout(2 * config.continuousTest.testDurationInMs);
      await doContinuousSending(
        config.continuousTest.testDurationInMs,
        config.continuousTest.messagesPerSecond
      );
      stressMeasurementsRecorder.done();
      doMeasurementAssertions();
    });

    it(`can send ${config.allAtOnceTest.messageCount} messages at once`, async function () {
      // eslint-disable-next-line no-invalid-this
      this.timeout(config.allAtOnceTest.elapsedTimeFailureTriggerInMs);
      await doSendingAllAtOnce(config.allAtOnceTest.messageCount);
      stressMeasurementsRecorder.done();
      doMeasurementAssertions();
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip(`can send ${config.continuousTest.messagesPerSecond} messages per second for ${config.continuousTest.testDurationInMs} ms with a flaky network`, async function () {
      // TODO
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip(`can send ${config.continuousTest.messagesPerSecond} messages per second for ${config.continuousTest.testDurationInMs} ms with faults injected`, async function () {
      // TODO
    });

  });
}
