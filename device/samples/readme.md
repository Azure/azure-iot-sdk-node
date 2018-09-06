# Samples for the Azure IoT device SDK for Node.js

This folder contains simple samples showing how to use the various features of the Microsoft Azure IoT Hub service from a device running JavaScript code.

## List of samples

* Simple send and receive messages:
   * **simple_sample_device.js**: Connect to IoT Hub and send and receive messages.
   * **simple_sample_device_with_sas.js**: Connect using a SAS Token to IoT Hub and send and receive messages.
   * **simple_sample_device_x509.js**: Connect using an X-509 certificate to IoT Hub and send and receive messages.
   * **send_batch_http.js**: Connect to IoT Hub and send a batch of messages over an HTTP connection.
   * **remote_monitoring**: Implements the device code used to connect to an [Azure IoT Suite Remote Monitoring preconfigured solution][remote-monitoring-pcs].
   * **edge_downstream_device.js**: Connect a downstream device to IoT Edge and send and receive messages.

* Device services samples (Device Twins, Methods, and Device Management):
   * **simple_sample_device_twin.js**: Shows how to synchronize a Device Twin with Azure IoT Hub on a device.
   * **device_method.js**: Shows how to implement an Azure IoT Hub Cloud to Device Direct Method on a device.
   * **dmpatterns_reboot_device.js**: Shows how a device handles a C2D method to reboot and provides progress updates through twin reported properties. See [device management patterns][dm-patterns] for instructions on running the device management patterns samples.
   * **dmpatterns_fwupdate_device.js**: Shows how a device handles a C2D method to initiate a firmware update and provides progress updates through twin reported properties. See [device management patterns][dm-patterns] for instructions on running the device management patterns samples.

* Uploading blob to Azure:
   * **device_blob_upload.js**: Uploads a blob to Azure through IoT Hub

## How to run the samples

In order to run the device samples you will first need the following prerequisites:
* Node.js v0.10 or above on your target device. (Check out [Nodejs.org](https://nodejs.org/) for more info)
* [Create an Azure IoT Hub instance][lnk-setup-iot-hub]
* [Create a device identity for your device][lnk-manage-iot-hub]

Once you have a device identity for your sample, get the following files from the current folder:
* **package.json**
* **__sample_file.js__** (where **__sample_file.js__** is one of the files listed above and available in this folder)

Place the files in the folder of your choice on the target machine/device then go through the following steps:
* Open the file **__sample_file.js__** in a text editor.
* Locate the following code in the file:

```js
var connectionString = '[IoT Device Connection String]';
```

* Replace `[IoT Device Connection String]` with the connection string for your device. Save the changes.
* From a shell or Node.js command prompt, navigate to the folder where you placed the sample files. Run the sample application using the following commands:

```
$ npm install
$ node sample_file.js
```

* In order to monitor and interact with the sample, you can use the [iothub-explorer][iothub-explorer] utility which can be used to display the messages sent by the device, send messages back to the device, interact with the device Twin, or invoke a C2D Direct Method on the device.


## Read More
For more information on how to use this library refer to the documents below:
- [Prepare your node.js development environment][node-devbox-setup]
- [Setup IoT Hub][lnk-setup-iot-hub]
- [Provision devices][lnk-manage-iot-hub]
- [Node API reference][node-api-reference]
- [Debugging with Visual Studio Code][debug-with-vscode]
- [Use the iothub-explorer command line tool][iothub-explorer]

[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[lnk-manage-iot-hub]: https://aka.ms/manageiothub
[remote-monitoring-pcs]: https://docs.microsoft.com/en-us/azure/iot-suite/iot-suite-remote-monitoring-sample-walkthrough
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/
[iothub-explorer]: https://github.com/azure/iothub-explorer
[debug-with-vscode]: ../../doc/node-debug-vscode.md
[node-devbox-setup]: ../../doc/node-devbox-setup.md
[dm-patterns]: ../../doc/dmpatterns.md
