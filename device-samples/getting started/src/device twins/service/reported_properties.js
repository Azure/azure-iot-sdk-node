'use strict';

const iothub = require('azure-iothub');
const connectionString = process.env.IOTHUB_CONNECTION_STRING || '';
const deviceId = '{device id}';
let arg = 1;

// check for iot hub connection string
if (connectionString == '' || connectionString === undefined) {
  console.log('\x1b[33m%s\x1b[0m', 'IoT Hub connection string not set');
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
  console.log('\x1b[33m%s\x1b[0m', "Missing patch number. Defaulting to '1'.")
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

    // reported properties
    console.log('\x1b[33m%s\x1b[0m', 'Reported properties...')
    console.log(" version: " + twin.properties.reported.$version);
    console.log(" last updated: " + twin.properties.reported.$metadata.$lastUpdated);
    console.log(" firmware version: " + twin.properties.reported.firmwareVersion);
    console.log(" temperature: " + twin.properties.reported.weather.temperature);
    console.log(" humidity: " + twin.properties.reported.weather.humidity);    
    console.log();    
  }
});
