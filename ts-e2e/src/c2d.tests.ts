/* eslint-disable security/detect-non-literal-fs-filename */
import { Client as DeviceClient, ConnectionString as DeviceConnectionString } from 'azure-iot-device';
import { Amqp as DeviceAmqp, AmqpWs as DeviceAmqpWs } from 'azure-iot-device-amqp';
import { Mqtt as DeviceMqtt, MqttWs as DeviceMqttWs } from 'azure-iot-device-mqtt';
import { Http as DeviceHttp } from 'azure-iot-device-http';
import { Message } from 'azure-iot-common';
import { Client as ServiceClient, ConnectionString as ServiceConnectionString } from 'azure-iothub';
import * as uuid from 'uuid';
import * as testUtils from './testUtils';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-c2d');

describe('C2D', function () {
  // eslint-disable-next-line no-invalid-this
  (this as any).timeout(60000);
  const testDevice2 = testUtils.createTestDevice();

  const hostName = ServiceConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING || '').HostName;
  const testDeviceCS2 = DeviceConnectionString.createWithSharedAccessKey(hostName || '', testDevice2.deviceId, testDevice2?.authentication?.symmetricKey?.primaryKey ||'BAD DEVICE' );

  before(function (beforeCallback: (err?: Error) => void) {
    testUtils.addTestDeviceToRegistry(testDevice2, beforeCallback);
  });

  after(function (afterCallback: (err?: Error) => void) {
    testUtils.removeTestDeviceFromRegistry(testDevice2, afterCallback);
  });

  [DeviceAmqp, DeviceAmqpWs, DeviceMqtt, DeviceMqttWs, DeviceHttp].forEach((transportCtor: any) => {
    describe('Over ' + transportCtor.name, function () {
      let deviceClient: DeviceClient;

      beforeEach(function (beforeEachCallback: (err?: Error) => void) {
        deviceClient = DeviceClient.fromConnectionString(testDeviceCS2, transportCtor);
        deviceClient.open((err) => {
          if (err) throw err;
          debug('Device Client: Opened');
          beforeEachCallback();
        });
      });

      afterEach(function (afterEachCallback: (err?: Error) => void) {
        deviceClient.close((err) => {
          if (err) throw err;
          debug('Device Client: Closed');
          afterEachCallback();
        });
      });

      it('can receive a C2D message', function (testCallback: (err?: Error) => void) {
        const testMessage = new Message('testMessage');
        testMessage.messageId = uuid.v4();
        let sendOK = false;
        let receiveOK = false;
        deviceClient.on('error', (err) => {
          debug('DEVICE CLIENT ERROR: ' + err.toString());
        });
        deviceClient.on('message', (msg) => {
          debug('Device Client: Message Received');
          if (msg.messageId === testMessage.messageId) {
            debug('Device Client: Message OK');
            deviceClient.complete(msg, (err) => {
              if (err) throw err;
              debug('Device Client: Message Completed');
              deviceClient.close((err) => {
                if (err) throw err;
                debug('Device Client: Closed');
                receiveOK = true;
                if (receiveOK && sendOK) {
                  return testCallback();
                }
              });
            });
          }
        });

        const serviceClient = ServiceClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING || '');
        serviceClient.open((err) => {
          if (err) throw err;
          debug('Service Client: Opened');
          setTimeout(() => { //DevSkim: reviewed DS172411 on 2022-11-30
            debug('sending a test message to ' + testDevice2.deviceId);
            serviceClient.send(testDevice2.deviceId, testMessage, (err) => {
              if (err) throw err;
              debug('Service Client: Message Sent');
              serviceClient.close((err) => {
                if (err) throw err;
                debug('Service Client: Closed');
                sendOK = true;
                if (sendOK && receiveOK) {
                  return testCallback();
                }
              });
            });
          }, 2000);
        });
      });
    });
  });
});
