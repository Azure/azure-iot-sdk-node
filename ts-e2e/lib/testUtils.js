import { Registry } from 'azure-iothub';
import * as uuid from 'uuid';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-utils');
export function createTestDevice() {
    return {
        deviceId: 'node-ts-e2e-' + uuid.v4(),
        status: 'enabled',
        authentication: {
            symmetricKey: {
                primaryKey: Buffer.from(uuid.v4()).toString('base64'),
                secondaryKey: Buffer.from(uuid.v4()).toString('base64')
            }
        }
    };
}
export function addTestDeviceToRegistry(testDevice, addCallback) {
    const reg = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
    debug('creating device ' + testDevice.deviceId);
    reg.create(testDevice, (err, createdDev) => {
        if (err)
            debug('failed to create device ' + testDevice.deviceId + ': ' + err.toString());
        addCallback(err);
    });
}
export function removeTestDeviceFromRegistry(testDevice, removeCallback) {
    const reg = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
    debug('deleting device ' + testDevice.deviceId);
    reg.delete(testDevice.deviceId, (err) => {
        if (err)
            debug('failed to delete device ' + testDevice.deviceId + ': ' + err.toString());
        removeCallback(err);
    });
}
//# sourceMappingURL=testUtils.js.map