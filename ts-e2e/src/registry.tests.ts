import { Registry } from 'azure-iothub';
import * as uuid from 'uuid';
import { assert } from 'chai';

describe('Registry', function () {
  // eslint-disable-next-line no-invalid-this
  (this as any).timeout(60000);
  it('creates a device -> gets it -> updates it -> deletes it', function (testCallback: (err?: Error) => void) {
    const testDeviceId = uuid.v4();
    const registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
    registry.create({ deviceId: testDeviceId }, (err, createDevDesc) => {
      if (err) throw err;
      assert.strictEqual(createDevDesc.deviceId, testDeviceId);
      registry.get(testDeviceId, (err, getDevDesc) => {
        if (err) throw err;
        assert.strictEqual(getDevDesc.deviceId, testDeviceId);
        assert.strictEqual(getDevDesc.status, 'enabled');
        registry.update({ deviceId: testDeviceId, status: 'disabled' }, (_err, updateDevDesc) => {
          assert.strictEqual(updateDevDesc.deviceId, testDeviceId);
          assert.strictEqual(updateDevDesc.status, 'disabled');
          registry.delete(testDeviceId, (err) => {
            if (err) throw err;
            registry.get(testDeviceId, (err, _getDevDesc2) => {
              assert.instanceOf(err, Error);
              testCallback();
            });
          });
        });
      });
    });
  });
});
