import { Registry } from 'azure-iothub';
import * as uuid from 'uuid';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-utils');

export interface TestDevice {
  deviceId: string;
  status?: 'enabled' | 'disabled';
  authentication?: {
    symmetricKey?: {
      primaryKey?: string;
      secondaryKey?: string;
    };
  };
}

export function createTestDevice(): TestDevice {
  return {
    deviceId: 'node-ts-e2e-' + uuid.v4(),
    status: 'enabled',
    authentication: {
      symmetricKey: {
        primaryKey: new Buffer(uuid.v4()).toString('base64'),
        secondaryKey: new Buffer(uuid.v4()).toString('base64')
      }
    }
  };
}

export function addTestDeviceToRegistry(testDevice: TestDevice, addCallback: (err?: Error) => void): void {
  const reg = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
  debug('creating device ' + testDevice.deviceId);
  reg.create(testDevice, (err, createdDev) => {
    if (err) debug('failed to create device ' + testDevice.deviceId + ': ' + err.toString());
    addCallback(err);
  });
}


export function removeTestDeviceFromRegistry(testDevice: TestDevice, removeCallback: (err?: Error) => void): void {
  const reg = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
  debug('deleting device ' + testDevice.deviceId);
  reg.delete(testDevice.deviceId, (err) => {
    if (err) debug('failed to delete device ' + testDevice.deviceId + ': ' + err.toString());
    removeCallback(err);
  });
}
