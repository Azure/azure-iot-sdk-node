# Microsoft Azure IoT SDK for Node.js modules-preview branch for Microsoft Edge modules.

This branch of the Azure IoT SDK for Node.js contains code to use the Mqtt protocol to act as a Microsoft Azure Edge module and talk to a Microsoft Azure Edge hub instance.

## Important note
This code is not currently published on NPM.  In order to use these modules, you need to use the versions in this branch.  Instructions for working with this code outside of the NPM repository can be found [here](./doc/node-devbox-setup.md)

## Current functionality.

### Connection string support to connect to Azure IoT Edge instances

To connect to an Edge instance, you need to use a module connection string which includes the ModuleId and GatewayHostName fields.  A correct connection string will look like this:
HostName='hubName';DeviceId='deviceId';ModuleId='moduleId';SharedAccessKey='key';GatewayHostName='edgeIp'

* 'hubName' is the name of your IoT hub, possibly in the azure-devices.net domain. (e.g. foo.azure-devices.net)
* 'deviceId' is the name of your IoT Edge Device
* 'moduleId' is the name of your Edge Module
* 'key' is the shared access key for your module
* 'edgeIp' is the IP address or DNS name for the machine hosting the edgeHub instance for the 'deviceId' device.  TCP port 8883 must be open on this device and be routed to the container hosting the edgeHub module.

Currently, a connection string can be obtained using the Bootstrapping instructions below.

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

## Sample Code.

Sample code can be found in this branch in the [device/core/samples][samples] directory:
simple_sample_module.js has an example of on('inputMessage') and sendOutputEvent functionality.
simple_sample_module_twin.js has an example of module twin functionality.

## Bootstrapping

Since there are no Docker containers for Node.js Edge Modules, there is a convoluted set of steps necessary to bring a test module online.  As soon as a docker container is created (see roadmap below), these steps will not be necessary

To create a module for use with this SDK, we use the Azure portal to create one of the sample modules, and we steal the connection string from this module.  In order to make this work, we tell the edgeAgent that it doesn't need to restart this module.

Assuming you have your Edge device created, you can use the Simulated Device instructions for creating a new module.  You can find the instruction [here][tutorial-simulate-device-windows].  Your Edge instance doesn't need to be running on Windows.  It can just as easily be running on Linux.  Use these [instructions][tutorial-simulate-device-linux] if it makes you more comfortable, though the gist is the same.

You can find the relevant instructions at the [Deploy A Module][deploy-a-module] section.

You should name your module as you wish, but use 'microsoft/azureiotedge-simulated-temperature-sensor:1.0-preview' in the Image URI field.  This is the Docker image that we use to start, but we will be quickly terminating it after we harvest its connection string.

It is important that you set the 'Restart Policy' for your module to 'Never' so that the hubAgent doesn't attempt to automatically restart the module.

Once the module is running, use the `docker exec` command to open a bash shell on the container and get value of the EdgeHubConnectionString variable.

```
bertk@bertk-edge:~$ docker exec -it mod2 /bin/bash
moduleuser@cfa838074c49:/app$ echo ${EdgeHubConnectionString}
HostName=bertk-edge.azure-devices.net;GatewayHostName=bertk-edge;DeviceId=edge-03;ModuleId=mod2;SharedAccessKey=<redacted>
moduleuser@cfa838074c49:/app$ exit
exit
bertk@bertk-edge:~$
```

Once we have the connection string, we can stop that container using the `docker stop` command.  We are done with it and won't ever need to launch it again.

You should then use the `docker ps` command to verify that the container is no longer running.

One final temporary change is necessary to establish the connection between the node.js module and the Edge instance.  Inside mqtt_base.ts and mqtt_base.js is an MQTT configuration structure that contains the following value.
```
rejectUnauthorized: true,
```

It is temporarily necessary to set this value to false.  After you do this, you need to run `npm run build` to transpile the TypeScript to JavaScript.


## Roadmap
* NPM packages need to be published
* Module methods needs to be implemented.
* A way to use the correct x509 certificate when connecting needs to be created.  This will remove the need for the rejectUnauthorized change above.
* A standard recipe for docker container that can host a module needs to be created.  This should alleviate the need for the bootstrapping steps above.


[samples]: ./device/core/samples
[tutorial-simulate-device-windows]: https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-windows
[tutorial-simulate-device-linux]: https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-linux
[deploy-a-module]: https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-linux#deploy-a-module
[mqtt-ts]: ./common/transport/mqtt/src/mqtt_base.ts

