import { Client as DeviceClient, ConnectionString as DeviceConnectionString } from 'azure-iot-device';
import { Amqp as DeviceAmqp, AmqpWs as DeviceAmqpWs } from 'azure-iot-device-amqp';
import { Mqtt as DeviceMqtt, MqttWs as DeviceMqttWs } from 'azure-iot-device-mqtt';
import { Http as DeviceHttp } from 'azure-iot-device-http';
import { Client as EventHubsClient } from 'azure-event-hubs';
import { Message, results } from 'azure-iot-common';
import {ConnectionString as ServiceConnectionString } from 'azure-iothub';
import * as uuid from 'uuid';
import * as testUtils from './testUtils';
import { assert } from 'chai';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-d2c');


describe('D2C', () => {
  // tslint:disable:no-invalid-this
  this.timeout(60000);
  const testDevice = testUtils.createTestDevice();

  const hostName = ServiceConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
  const testDeviceCS = DeviceConnectionString.createWithSharedAccessKey(hostName, testDevice.deviceId, testDevice.authentication.symmetricKey.primaryKey);

  before((beforeCallback) => {
    testUtils.addTestDeviceToRegistry(testDevice, beforeCallback);
  });

  after((afterCallback) => {
    testUtils.removeTestDeviceFromRegistry(testDevice, afterCallback);
  });

  [DeviceAmqp, DeviceAmqpWs, DeviceMqtt, DeviceMqttWs, DeviceHttp].forEach((transportCtor: any) => {
    describe('Over ' + transportCtor.name, () => {
      it('can send a D2C message', (testCallback) => {
        const ehClient = EventHubsClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
        let testMessage = new Message('testMessage');
        testMessage.messageId = uuid.v4();
        let sendOK = false;
        let receiveOK = false;

        ehClient.open()
                .then(ehClient.getPartitionIds.bind(ehClient))
                .then((partitionIds) => {
                  return Promise.all((partitionIds as EventHubsClient.PartitionId[]).map((id) => {
                    return ehClient.createReceiver('$Default', id, { startAfterTime: Date.now() - 5000})
                                  .then((recv) => {
                                    debug('EH Client: receiver created for Partition ' + id);
                                    recv.on('errorReceived', (err) => {
                                      throw err;
                                    });
                                    recv.on('message', (receivedMsg) => {
                                      debug('EH Client: Message received');
                                      if (receivedMsg.systemProperties.messageId === testMessage.messageId) {
                                        debug('EH Client: Message OK');
                                        receiveOK = true;
                                        if (sendOK && receiveOK) {
                                          ehClient.close()
                                                  .then(() => testCallback());
                                        }
                                      }
                                    });
                                  });
                  }));
                })
                .then(() => {
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
                })
                .catch((err) => {
                  throw err;
                });
      });
    });
  });
});
