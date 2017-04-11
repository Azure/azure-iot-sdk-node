var uuid = require('uuid');

var Registry = require('azure-iothub').Registry;
var ServiceConnectionString = require('azure-iothub').ConnectionString;
var DeviceConnectionString = require('azure-iot-device').ConnectionString;

var registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
var hostName = ServiceConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
var deviceDesc = {
  deviceId: process.argv[2]
};

registry.create(deviceDesc, function(err, deviceInfo) {
  if (err) {
    console.error(err.toString());
    process.exit(1);
  } else {
    var connStr = DeviceConnectionString.createWithSharedAccessKey(hostName, deviceInfo.deviceId, deviceInfo.authentication.symmetricKey.primaryKey);
    console.log(connStr);
    process.exit(0);
  }
});