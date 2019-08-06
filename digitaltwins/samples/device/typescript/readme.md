# Azure IoT Digital Twins: Environmental Sensor Example

This sample shows how to implement a simulated environmental sensor using typescript and the `DigitalTwinClient` class.

## Prerequisite

You should have [Node.js](https://nodejs.org/en/) installed.
You should have the typescript compiler installed. (`npm install -g typescript`)

## How to install the sample

1. Download the files in this folder
2. Install the dependencies by opening a terminal that contains the sample you downloaded and the `package.json` file and type:

```shell
npm install
```

3. Set the following environment variables:

```shell
set IOTHUB_CONNECTION_STRING=<your IoT Hub connection string>
```
*use `export` instead of `set` if you're running MacOS or Linux.*

4. Compile the code:

```
$ npm run build
```

5. Run the sample with the following command:

```
$ node simple_sample.js
```

## What does this sample do?

`environmentalinterface.js` shows how to create an interfaceInstance class based on the Environmental Sensor interface published in the global model repository.

`sample_device.js` shows how to:
- instantiate the `DigitalTwinClient`
- instantiate the interfaceInstance created with `environmentalinterface.js`
- Combine them together to send telmetry, handle commands, and handle property updates.
