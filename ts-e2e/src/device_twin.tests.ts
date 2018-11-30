import { Client as DeviceClient, ConnectionString as DeviceConnectionString } from 'azure-iot-device';
import { Mqtt as DeviceMqtt, MqttWs as DeviceMqttWs } from 'azure-iot-device-mqtt';
import {
  Registry,
  ConnectionString as ServiceConnectionString
} from 'azure-iothub';

import * as testUtils from './testUtils';
import { assert } from 'chai';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-twin');


describe('Device Twin', () => {
  [DeviceMqtt, DeviceMqttWs].forEach((transportCtor: any) => {
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

      it('device can get its device twin and modify reported properties', (testCallback) => {
        const deviceClient = DeviceClient.fromConnectionString(testDeviceCS, transportCtor);
        const twinPatch = { twinKey: 'twinValue' };

        deviceClient.open((err) => {
          if (err) throw err;
          debug('Device Client: Opened');
          deviceClient.getTwin((err, twin) => {
            if (err) throw err;
            debug('Device Client: Received Twin');
            twin.properties.reported.update(twinPatch, (err) => {
              if (err) throw err;
              const registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
              registry.getTwin(testDevice.deviceId, (err, twin) => {
                debug('Registry: Got Device Twin');
                assert.strictEqual(twin.properties.reported.twinKey, twinPatch.twinKey);
                testCallback();
              });
            });
          });
        });
      });

      it('service can modify desired properties and the device gets a notification', (testCallback) => {
        let sendOK = false;
        let receiveOK = false;
        const twinPatch = {
          properties: {
            desired: {
              desiredKey: 'desiredValue'
            }
          }
        };

        const deviceClient = DeviceClient.fromConnectionString(testDeviceCS, transportCtor);
        deviceClient.open((err) => {
          if (err) throw err;
          debug('Device Client: Opened');
          deviceClient.getTwin((err, twin) => {
            if (err) throw err;
            debug('Device Client: Received Twin');
            twin.on('properties.desired', (patch) => {
              debug('Device Client: Received Twin Patch');
              if (patch.$version > 1) {
                assert.strictEqual(patch.desiredKey, twinPatch.properties.desired.desiredKey);
                receiveOK = true;
              }
              if (sendOK && receiveOK) {
                testCallback();
              }
            });
          });
        });

        const registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
        registry.getTwin(testDevice.deviceId, (err, twin) => {
          debug('Registry: Got Device Twin');
          twin.update(twinPatch, (err) => {
            if (err) throw err;
            sendOK = true;
            debug('Registry: Device Twin updated.');
            if (sendOK && receiveOK) {
              testCallback();
            }
          });
        });
      });
    });
  });
});
