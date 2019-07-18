# Azure IoT Digital Twins: Environmental Sensor Example

This sample shows how to implement a simulated environmental sensor using typescript and the `DigitalTwinClient` class.

## Prerequisite

You should have [Node.js](https://nodejs.org/en/) installed.
You should have the typescript compiler installed. (`npm install -g typescript`)

## How to install the sample

1. Download the files in this folder
2. Install the dependencies:
  - To download the client libraries from NPM, simply run `npm install`
  - if you've downloaded the client libraries manually, simply run `npm install <package.tgz>` for the following packages: *azure-iot-common*, *azure-iot-device*, *azure-iot-device-mqtt* and *azure-iot-digitaltwins-device*

      (dont't forget to replace <path-to> with the actual path to the package and <preview-version> with the version of the packages you downloaded)
      ```
      $ npm install <path-to>/azure-iot-common-<preview-version>.tgz
      $ npm install <path-to>/azure-iot-device-<preview-version>.tgz
      $ npm install <path-to>/azure-iot-device-mqtt-<preview-version>.tgz
      $ npm install <path-to>/azure-iot-digitaltwins-device-<preview-version>.tgz
      ```

3. Compile the code:

```
$ npm run build
```

4. Run the sample with the following command:

```
$ node simple_sample.js <DEVICE_CONNECTION_STRING>
```

## What does this sample do?

`environmentalinterface.js` shows how to create a component class based on the Environmental Sensor interface published in the global model repository.

`sample_device.js` shows how to:
- instantiate the `DigitalTwinClient`
- instantiate the component created with `environmentalinterface.js`
- Combine them together to send telmetry, handle commands, and handle property updates.
