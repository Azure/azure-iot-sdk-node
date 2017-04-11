var Registry = require('azure-iothub').Registry;
var DeviceConnectionString = require('azure-iot-device').ConnectionString;

var registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
var deviceId = process.argv[2];

registry.delete(deviceId, function(err, deviceInfo) {
  if (err) {
    console.error(err.toString());
    process.exit(1);
  } else {
    process.exit(0);
  }
});