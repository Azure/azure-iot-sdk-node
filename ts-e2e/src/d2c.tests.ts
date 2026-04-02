import { Client as DeviceClient, ConnectionString as DeviceConnectionString } from 'azure-iot-device';
import { Amqp as DeviceAmqp, AmqpWs as DeviceAmqpWs } from 'azure-iot-device-amqp';
import { Mqtt as DeviceMqtt, MqttWs as DeviceMqttWs } from 'azure-iot-device-mqtt';
import { Http as DeviceHttp } from 'azure-iot-device-http';
import { EventHubConsumerClient, ReceivedEventData } from '@azure/event-hubs';
import { Message, results } from 'azure-iot-common';
import { ConnectionString as ServiceConnectionString } from 'azure-iothub';
import * as uuid from 'uuid';
import * as testUtils from './testUtils';
import { assert } from 'chai';
import * as dbg from 'debug';
import * as uuidBuffer from 'uuid-buffer';
const debug = dbg('ts-e2e-d2c');


describe('D2C', function () {
  // eslint-disable-next-line no-invalid-this
  (this as any).timeout(60000);
  const testDevice = testUtils.createTestDevice();

  const hostName = ServiceConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
  const testDeviceCS = DeviceConnectionString.createWithSharedAccessKey(hostName, testDevice.deviceId, testDevice.authentication.symmetricKey.primaryKey);

  before(function (beforeCallback: (err?: Error) => void) {
    testUtils.addTestDeviceToRegistry(testDevice, beforeCallback);
  });

  after(function (afterCallback: (err?: Error) => void) {
    testUtils.removeTestDeviceFromRegistry(testDevice, afterCallback);
  });

  [DeviceAmqp, DeviceAmqpWs, DeviceMqtt, DeviceMqttWs, DeviceHttp].forEach((transportCtor: any) => {
    describe('Over ' + transportCtor.name, function () {
      it('can send a D2C message', function (testCallback: (err?: Error) => void) {
        const testMessage = new Message('testMessage');
        testMessage.messageId = uuid.v4();
        let sendOK = false;
        let receiveOK = false;
        let ehClient: EventHubConsumerClient;

        const startAfterTime = new Date(Date.now() - 5000);
        const onEventHubMessage = (receivedMsg: ReceivedEventData) => {
          debug('EH Client: Message received');
          const msgId = Buffer.isBuffer(receivedMsg.messageId)
            ? uuidBuffer.toString(receivedMsg.messageId)
            : String(receivedMsg.messageId);
          if (msgId === testMessage.messageId) {
            debug('EH Client: Message OK');
            receiveOK = true;
            if (sendOK && receiveOK) {
              ehClient.close()
                      .then(() => testCallback());
            }
          }
        };

        ehClient = new EventHubConsumerClient("$Default", process.env.EVENTHUB_CONNECTION_STRING);
        ehClient.subscribe({
          processEvents: async (events) => {
            for (const event of events) { onEventHubMessage(event); }
          },
          processError: async (err) => {
            throw err;
          },
        }, {
          startPosition: { enqueuedOn: startAfterTime },
        });
        setTimeout(() => {
          debug('EH Client: Receivers created');
          const deviceClient = DeviceClient.fromConnectionString(testDeviceCS, transportCtor);
          deviceClient.sendEvent(testMessage, (sendErr, result) => {
            if (sendErr) throw sendErr;
            debug('Device Client: Message sent');
            assert.instanceOf(result, results.MessageEnqueued);
            sendOK = true;
            if (sendOK && receiveOK) {
              return testCallback();
            }
          });
        }, 3000);
      });
    });
  });
});
