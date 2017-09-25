# Samples for the Azure IoT service SDK for Node.js

This folder contains simple samples showing how to use the various features of the Microsoft Azure IoT Hub service from a device running C code.

## List of samples

* Registry
   * **registry_sample.js**: Manage the device ID registry of IoT Hub.
   * **registry_bulk_sample.js**: Create a set of device IDs in the device ID registry of IoT Hub in bulk.
   * **create_device_with_cert.js**: Create a new device ID using an X-509 certificate.

* Messaging
   * **send_c2d_message.js** : Send C2D messages to a device through IoT Hub.

* Device services samples (Device Twins, Methods, and Device Management) (See [device management patterns][dm-patterns] for instructions on running the device management patterns samples):
   * **twin.js**: Interact with the Device Twins from a back-end app.
   * **twin_query.js**: Interact with the Device Twins using queries from a back-end app.
   * **device_method.js**: Invoke a C2D Direct Method on a device through IoT Hub.
   * **dmpatterns_reboot_service.js**: Initiate a C2D method to reboot a device and view progress through the twin reported properties.
   * **dmpatterns_fwupdate_service.js**: Implement the service side of the firmware update DM pattern.
   * **job_query.js**: Use the jobs query feature of the service SDK.
   * **schedule_job.js**: Schedule device management jobs.

* Uploading blob to Azure:
   * **receive_file_notifications.js**: Track the progress of the file "upload to blob" by devices.


## How to run the samples
In order to run the device samples you will first need the following prerequisites:
* Node.js v0.10 or above on your target device. (Check out [Nodejs.org](https://nodejs.org/) for more info)
* [Create an Azure IoT Hub instance][lnk-setup-iot-hub]

Get the following files from the current folder:
* **package.json**
* **__sample_file.js__** (where **__sample_file.js__** is one of the files listed above and available in this folder)

Place the files in the folder of your choice on the target machine/device then go through the following steps:
* Open the file **__sample_file.js__** in a text editor.
* Locate the following code in the file:
    ```
    var connectionString = '[IoT Connection String]';
    ```
* Replace `[IoT Connection String]` with the connection string for the access policy you want to use (learn more about access policies here). Save the changes.
* From a shell or Node.js command prompt, navigate to the folder where you placed the sample files. Run the sample application using the following commands:
    ```
    npm install
    node sample_file.js
    ```

To run the Device Management samples, follow our [DM patterns documentation][dm-patterns].

## Using the SDK with Promises rather than callbacks
If you'd like to see how to "convert" this samples to promises instead of using callbacks, please refer to [this page][promises] of the wiki!

## Read More
For more information on how to use this library refer to the documents below:
- [Prepare your node.js development environment](../../doc/node-devbox-setup.md)
- [Setup IoT Hub][lnk-setup-iot-hub]
- [Node API reference][node-api-reference]
- [Debugging with Visual Studio Code][debug-with-vscode]
- [Use the iothub-explorer command line tool][iothub-explorer]

[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[remote-monitoring-pcs]: https://docs.microsoft.com/en-us/azure/iot-suite/iot-suite-remote-monitoring-sample-walkthrough
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iothub/
[iothub-explorer]: https://github.com/azure/iothub-explorer
[dm-patterns]: ../../doc/dmpatterns.md
[debug-with-vscode]: ../../doc/get_started/node-debug-vscode.md
[promises]: https://github.com/Azure/azure-iot-sdk-node/wiki/Promises
