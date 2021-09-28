# Typscript Samples for the Azure IoT device SDK for Node.js

This folder contains simple samples showing how to use the various features of the Microsoft Azure IoT Hub service from a device written using TypeScript.

## Read this if you want to run sample using GitHub codespace (fastest)
You can use Github Codespaces to be up and running quickly! Here are the steps to follow.

**1) Make sure you have the prerequisites**

In order to run the device samples you will first need the following prerequisites:
* An Azure IoT Hub instance. [(Link if you don't.)][lnk-setup-iot-hub]
* A device identity for your device. [(Link if you don't.)][lnk-manage-iot-hub]

**2) Create and open Codespace**

* Select the Codespaces tab and the "New codespace" button

  ![screen shot of create codespace](../media/github-codespace.png)

* Once the Codespace is open, all required packages to run the samples will be setup for you

**3) Set the DEVICE_CONNECTION_STRING environment variable**

* From a shell or Node.js command prompt, navigate to the folder where you placed the sample files. 
* Set the `DEVICE_CONNECTION_STRING` environment variable: 

*in bash*
```bash
export DEVICE_CONNECTION_STRING="<YourIoTHubConnectionString>"
```

**4) Run it**

Find the the ```device/samples/typescript``` directory and run the sample application using the following commands:

```bash
cd dist
node simple_sample_device.js
```

## Read this if you want to run a sample locally
*How to run a sample in your own folder using published npm packages.*

**1) Make sure you have the prerequisites**

In order to run the device samples you will first need the following prerequisites:
* The latest or LTS version of Node.js on your device. (Check out [Nodejs.org](https://nodejs.org/) for more info)
* An Azure IoT Hub instance. [(Link if you don't.)][lnk-setup-iot-hub]
* A device identity for your device. [(Link if you don't.)][lnk-manage-iot-hub]
* Clone this repo to your local machine

**2) Install the packages**

You need to install proper dependencies as defined in the **package.json**. From the ```typescript``` directory, run the following command:

```
npm install
```

**3) Set the DEVICE_CONNECTION_STRING environment variable**

* From a shell or Node.js command prompt, navigate to the folder where you placed the sample files. 
* Set the `DEVICE_CONNECTION_STRING` environment variable: 

*in bash*
```bash
export DEVICE_CONNECTION_STRING="<YourIoTHubConnectionString>"
```
*in powershell*
```powershell
$env:DEVICE_CONNECTION_STRING="<YourIoTHubConnectionString>"
```
**4) Build it**

Run the ```build``` command to transpile the TypeScript code into the JavaScript files:

```
npm run build
```

The JavaScript files are placed into the ```dist``` folder.

**5) Run it**

Run the sample application using the following commands:

```
cd dist
node simple_sample_device.js
```

## List of samples

* Simple send and receive messages:
   * **simple_sample_device.ts**: Connect to IoT Hub and send and receive messages.
   * **send_batch_http.ts**: Connect to IoT Hub and send a batch of messages over an HTTP connection.
   * **remote_monitoring.ts**: Implements the device code used to connect to an [Azure IoT Suite Remote Monitoring preconfigured solution][remote-monitoring-pcs].

* Device services samples (Device Twins, Methods, and Device Management):
   * **simple_sample_device_twin.ts**: Shows how to synchronize a Device Twin with Azure IoT Hub on a device.
   * **device_method.ts**: Shows how to implement an Azure IoT Hub Cloud to Device Direct Method on a device.
 
* Uploading blob to Azure:
   * **upload_to_blob.ts**: Uploads a blob to Azure through IoT Hub
   * **upload_to_blob_advanced.ts**: More advanced scenario for greater control over the blob upload calls

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
