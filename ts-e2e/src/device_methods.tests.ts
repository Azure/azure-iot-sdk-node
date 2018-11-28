import { Client as DeviceClient, ConnectionString as DeviceConnectionString } from 'azure-iot-device';
import { Mqtt as DeviceMqtt, MqttWs as DeviceMqttWs } from 'azure-iot-device-mqtt';
import { Amqp as DeviceAmqp, AmqpWs as DeviceAmqpWs } from 'azure-iot-device-amqp';
import {
  Client as ServiceClient,
  ConnectionString as ServiceConnectionString,
  DeviceMethodParams
} from 'azure-iothub';

import * as uuid from 'uuid';
import * as testUtils from './testUtils';
import { assert } from 'chai';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-methods');


describe('Device Methods', () => {
  [DeviceMqtt, DeviceMqttWs, DeviceAmqp, DeviceAmqpWs].forEach((transportCtor: any) => {
    describe('Over ' + transportCtor.name, () => {
      // tslint:disable:no-invalid-this
      this.timeout(60000);

      const testDevice = testUtils.createTestDevice();
      const scs = ServiceConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING);
      const testDeviceCS = DeviceConnectionString.createWithSharedAccessKey(scs.HostName, testDevice.deviceId, testDevice.authentication.symmetricKey.primaryKey);

      beforeEach((beforeEachCallback) => {
        testUtils.addTestDeviceToRegistry(testDevice, beforeEachCallback);
      });

      afterEach((afterEachCallback) => {
        testUtils.removeTestDeviceFromRegistry(testDevice, afterEachCallback);
      });

      [null, '', 'foo', { k1: 'v1' }, {}].forEach((testPayload) => {
      it('device can receive a method call with a payload of ' + JSON.stringify(testPayload) + ' and send a response', (testCallback) => {
        const methodName = 'testMethod';
        const requestPayload = testPayload;
        const responsePayload = { responseKey: uuid.v4() };
        const deviceClient = DeviceClient.fromConnectionString(testDeviceCS, transportCtor);
        let sendOK = false;
        let receiveOK = false;
        deviceClient.open((err) => {
          if (err) throw err;
          debug('Device Client: Opened');
          deviceClient.onDeviceMethod(methodName, (request, response) => {
            assert.deepEqual(request.payload, requestPayload);
            debug('Device Client: Received method request');
            response.send(200, responsePayload, (err) => {
              if (err) throw err;
              debug('Device Client: Sent method response');
              deviceClient.close((err) => {
                if (err) throw err;
                debug('Device Client: Closed');
                receiveOK = true;
                if (sendOK && receiveOK) {
                  debug('Device Client: Test Callback');
                  testCallback();
                }
              });
            });
          });
          });

          setTimeout(() => {
            const serviceClient = ServiceClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
            const methodParams: DeviceMethodParams = {
              methodName: methodName,
              payload: requestPayload,
              connectTimeoutInSeconds: 30,
              responseTimeoutInSeconds: 30
            };

            debug('Service Client: Invoking device method');
            serviceClient.invokeDeviceMethod(testDevice.deviceId, methodParams, (err, result, response) => {
              if (err) throw err;
              debug('Service Client: Received device method response');
              sendOK = true;
              assert.strictEqual(response.statusCode, 200);
              assert.deepEqual(result.payload, responsePayload);
              if (sendOK && receiveOK) {
                debug('Service Client: Test Callback');
                return testCallback();
              }
            });
          }, 2000);
        });
      });
    });
  });
});
