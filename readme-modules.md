# Microsoft Azure IoT SDK for Node.js modules-preview branch for Microsoft Edge modules.

This branch of the Azure IoT SDK for Node.js contains code to use the Mqtt protocol to act as a Microsoft Azure IoT Edge module and talk to a Microsoft Azure IoT Edge hub instance.

## Important note
This code is not currently published on NPM.  In order to use these modules, you need to use the versions in this branch.  Instructions for working with this code outside of the NPM repository can be found [here](./doc/node-devbox-setup.md)

## Current functionality.

### Recent updates:
* It is no longer to extract the connection string from an existing module.
* It is now possible to run and debug your module code inside of a docker container.
* You no longer need to edit mqtt_base.ts to change the value of `reject_unauthorized`
* Module methods are supported

### Module inputs

A module can receive inputs by registering for the inputMessage event.

```
client.on('inputMessage', function(inputName, msg) {
  // inputName is a string that contains the name of the input, and msg is a Message object
});
```

### Module outputs

A module can send a Message to an output by using the sendOutputEvent function

```
client.sendOutputEvent(outputName, msg);
// outputName is a string that contains the name of the output and msg is a Message object.
```

### Module twin

A module can act as a twin using the existing twin API.  The only difference between a device twin and a module twin is the connection string used to connect.

### Module methods

A module can also support methods using the existing method API.

## Sample Code.

Some sample code can be found in this branch in the [device/core/samples](./device/core/samples/) directory:
* simple_sample_module.js has an example of on('inputMessage') and sendOutputEvent functionality.
* simple_sample_module_twin.js has an example of module twin functionality.
* simple_sample_module_method.js has an example of module method functionality.

Sample code for a docker container can be found in the [device/edge_sample](./device/edge-sample/) directory. Checkout the [readme](./device/edge-sample/readme.md) to learn more

## Future changes

The samples all have a block of code at the top which retrieves a certificate from the container file system and passes it down to the transport.  For now, you should consider this to be boilerplate code.  The APIs used here will likely changed and replaced with different boilerplate code in a future drop:
```
var authProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(connectionString);
authProvider.getDeviceCredentials(function(err, credentials) {
  if (err) {
    throw new Error('unexpected: getDeviceCredentials failure');
  } else {
    credentials.ca = fs.readFileSync(process.env.EdgeModuleCACertificateFile).toString('ascii');
  }
});
var client = Client.fromAuthenticationProvider(authProvider, Protocol);
```

[tutorial-simulate-device-windows]: https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-windows
[tutorial-simulate-device-linux]: https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-linux
[deploy-a-module]: https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-linux#deploy-a-module

