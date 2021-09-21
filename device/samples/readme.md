# Samples for the Azure IoT device SDK for Node.js

This folder contains simple samples showing how to use the various features of the Microsoft Azure IoT Hub service from a device running JavaScript code.

## Read this if you want to run sample using GitHub codespace (fastest)
You can use Github Codespaces to be up and running quickly! Here are the steps to follow.

**1) Make sure you have the prerequisites**

In order to run the device samples you will first need the following prerequisites:
* An Azure IoT Hub instance. [Link if you don't.](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-create-through-portal)
* A device identity for your device. [Link if you don't.](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-create-through-portal#register-a-new-device-in-the-iot-hub)

**2) Create and open Codespace**

* Select the Codespaces tab and the "New codespace" button

  ![screen shot of create codespace](./media/github-codespace.png)

* Once the Codespace is open, all required packages to run the samples will be setup for you

**3) Set the DEVICE_CONNECTION_STRING environment variable**

* From the command command prompt, navigate to the folder where you placed the sample files. 
* Set the `DEVICE_CONNECTION_STRING` environment variable: 

```bash
export DEVICE_CONNECTION_STRING="<YourIoTHubConnectionString>"
```

**4) Run it**

Run the sample application using the following commands:

```bash
node simple_sample_device.js
```

## Read this if you want to run a sample locally
*How to run a sample in your own folder using published npm packages.*

**1) Make sure you have the prerequisites**

In order to run the device samples you will first need the following prerequisites:
* The latest or LTS version of Node.js on your device. (Check out [Nodejs.org](https://nodejs.org/) for more info)
* An Azure IoT Hub instance. [(Link if you don't.)][lnk-setup-iot-hub]
* A device identity for your device. [(Link if you don't.)][lnk-manage-iot-hub]

**2) Grab the right files**

Once you have the prerequisites, get the following files from the current folder:
* **package.json**
* **__sample_file.js__** (where **__sample_file.js__** is one of the files listed above and available in this folder)

Copy them into your directory of choice. Once they've been placed in that directory, navigate using a terminal window to the folder. Then execute the following command:
```
npm install
```

This should install the proper dependencies as specified in the **package.json** you copied.

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


**4) Run it**

Run the sample application using the following commands:

```bash
npm install
node sample_file.js
```

## Read this if you want to run a sample in VS Code

**1) Do steps 1 and 2 above**

**2) Open Visual Studio Code**

Open the folder containing your Node.js project in Visual Studio Code.

**3) Set up the Debug Configuration**

* Click on the *Debug* tab. (also `ctrl-shift-D`)
* Find the little gear and click on it (When hovered over it says "Open launch.json")
* Add the following launch configuration:

```json
{
   "type": "node",
   "request": "launch",
   "name": "IoT Hub Sample Device",
   "program": "${workspaceFolder}/device/samples/simple_sample_device.js",
   "protocol": "inspector",
   "sourceMaps": true,
   "console": "integratedTerminal",
   "env": {
      "DEBUG": "mqtt*,rhea*,azure*",
      "NODE_ENV": "development",
      "DEVICE_CONNECTION_STRING": "<YourConnectionString>"
   },
   "outFiles": [
      "${workspaceFolder}/common/core/lib/*.js",
      "${workspaceFolder}/common/transport/amqp/lib/*.js",
      "${workspaceFolder}/common/transport/http/lib/*.js",
      "${workspaceFolder}/common/transport/mqtt/lib/*.js",
      "${workspaceFolder}/device/core/lib/*.js",
      "${workspaceFolder}/device/transport/amqp/lib/*.js",
      "${workspaceFolder}/device/transport/http/lib/*.js",
      "${workspaceFolder}/device/transport/mqtt/lib/*.js",
      "${workspaceFolder}/dtclient/lib/*.js",
      "${workspaceFolder}/service/lib/*.js",
   ]
}
```
* Edit the `DEVICE_CONNECTION_STRING` environment variable to use your IoT Hub device connection string.
* Edit the `program` to the path to the code you want to run. 
* If you do not want debug logs to be printed, delete the `DEBUG` environment variable. Otherwise you can leave it as it is.

**4) Run it**

* In the debug tab, click on the configuration drop down and select `IoT Hub Sample Device`, then press `Start Debugging`.


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
