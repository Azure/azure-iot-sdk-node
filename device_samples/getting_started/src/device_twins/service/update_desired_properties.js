'use strict';

const iothub = require('azure-iothub');
const connectionString = process.env.IOTHUB_CONNECTION_STRING || '';
const deviceId = '{device id}';
let arg = 1;

// check for iot hub connection string
if (connectionString == '' || connectionString === undefined) {
  console.log('\x1b[31m%s\x1b[0m', 'IoT Hub connection string not set');
  process.exit(0);
}

// check for iot hub connection string
if (deviceId == '{device id}') {
  console.log('\x1b[33m%s\x1b[0m', 'DeviceId string not set');
  process.exit(0);
}

// get the passed in argument to run a specific patch update
// values 1-5 are legit
if (process.argv.length != 3) {
  console.log('\x1b[31m%s\x1b[0m', "Missing patch number. Defaulting to '1'.")
} 
else {
  arg = parseInt(process.argv.slice(2), 10);
  if ((arg > 5) || (arg < 1)) arg = 1;
}

const registry = iothub.Registry.fromConnectionString(connectionString);

registry.getTwin(deviceId, function (err, twin) {
  if (err) {
    console.error('\x1b[31m%s\x1b[0m', `Error during get twin (${err.constructor.name}): ${err.message}`);
    process.exit(0);
  } else {    

    // Usage example #1: receiving all patches with a single event handler.
    const twinPatch1 = {
      properties: {
        desired: {
          climate: { minTemperature: 69, maxTemperature: 77, },
        },
      },
    };

    // Usage example #2: receiving an event if anything under
    // properties.desired.climate changes
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
    const twinPatch3 = {
      properties: {
        desired: {
          modules : {
            wifi : { channel: 6, ssid: 'my_network' },
            climate : { id: 17, units: 'farenheit' }
          }
        }
      }
    }

    // Usage example #4: handle add operations. The app developer
    // is responsible for inferring add/update/delete operations based on
    // the contents of the patch.
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
    const twinPatch5 = {
      properties: {
        desired: {
          modules : { climate: null },
          climate : null
        }
      }
    }
   
    let twinPatch = twinPatch1;

    // set to the patch based on the argument value
    switch(arg) {                
      case 2:
        twinPatch = twinPatch2;
        console.log('Using twinPatch2');
        break;
      case 3:
        twinPatch = twinPatch3;
        console.log('Using twinPatch3');
        break;
      case 4:
        twinPatch = twinPatch4;
        console.log('Using twinPatch4');
        break;
      case 5:
        twinPatch = twinPatch5;
        console.log('Using twinPatch5');
        break;
      default:
        twinPatch = twinPatch1;
        console.log('Using twinPatch1');
    }     

    twin.update(twinPatch, (err, twin) => {
      if (err) {
        console.error('\x1b[31m%s\x1b[0m', `Error during patch update: ${err.message}`);
      } else {
        console.log(`Sent patch: ${JSON.stringify(twinPatch)}`);      
      }
    });
  }
});
