# Setting up your local environment

### **1) Make sure you have the prerequisites**

In order to run the device samples you will first need the following prerequisites:

- The latest or LTS version of Node.js on your device. (Check out [Nodejs.org](https://nodejs.org/en/) for more info)
- Clone this repo to your local machine

### **2) Install dependencies**

You need to install proper dependencies as defined in the package.json. Run the following commands:

```bash
cd device-samples/getting started
npm install
```

```bash
cd device-samples/how to guides
npm install
```

# Read more

For more information on how to use this library refer to the documents below:

- [Prepare your node.js development environment][node-devbox-setup]
- [Set up IoT Hub][lnk-setup-iot-hub]
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
