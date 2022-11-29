'use strict';

const iothub = require('azure-iothub');
const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const deviceId = 'devDevice';

if (connectionString === undefined) {
  console.log('IoT Hub connection string not set');
  process.exit(0);
}

const registry = iothub.Registry.fromConnectionString(connectionString);

registry.getTwin(deviceId, function (err, twin) {
  if (err) {
    console.error(err.constructor.name + ': ' + err.message);
  } else {

    // Usage example #1: receiving all patches with a single event handler.
    const twinPatch1 = {
      properties: {
        desired: {
          climate: { minTemperature: 68, maxTemperature: 76, },
        },
      },
    };

    // Usage example #2: receiving an event if anything under
    // properties.desired.climate changes
    // eslint-disable-next-line no-unused-vars
    const twinPatch2 = {
      properties: {
        desired: {
          climate: {
            hvac: {
              systemControl: { fanOn: true, },
            },
          },
        },
      },
    };

    // Usage example #3: receiving an event for a single (scalar) property
    // value. This event is only fired if the fanOn boolean value is part
    // of the patch.
    // eslint-disable-next-line no-unused-vars
    const twinPatch3 = {
      properties: {
        desired: {
          modules : {
            wifi : { channel: 6, ssid: 'my_network' },
            climate : { id: 17, units: 'fahrenheit' }
          }
        }
      }
    }

    // Usage example #4: handle add operations. The app developer
    // is responsible for inferring add/update/delete operations based on
    // the contents of the patch.
    // eslint-disable-next-line no-unused-vars
    const twinPatch4 = {
      properties: {
        desired: {
          modules : {
            wifi : { channel: 7, encryption: 'wpa', passphrase: 'foo' }
          }
        }
      }
    }

    // Usage example #4: handle delete operations. The app developer
    // is responsible for inferring add/update/delete operations based on
    // the contents of the patch.
    // eslint-disable-next-line no-unused-vars
    const twinPatch5 = {
      properties: {
        desired: {
          modules : { climate: null }
        }
      }
    }

    // set to the patch you want to update
    const twinPatch = twinPatch1;
    // const twinPatch = twinPatch2;
    // const twinPatch = twinPatch3;
    // const twinPatch = twinPatch4;
    // const twinPatch = twinPatch5;

    twin.update(twinPatch, (err, _twin) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log(`\nSent patch:`);
        console.log(JSON.stringify(twinPatch, null, 2));
      }
    });
  }
});
