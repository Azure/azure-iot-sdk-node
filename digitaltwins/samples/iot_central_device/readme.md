# Azure IoT Digital Twins: Environmental Sensor Example

This sample shows how to implement a simulated environmental sensor using javascript and the `DigitalTwinClient` class.

## Prerequisite

You should have [Node.js](https://nodejs.org/en/) installed.

## How to install the sample

1. Download the files in this folder
2. Install the dependencies by opening a terminal that contains the sample you downloaded and the `package.json` file and type:

```shell
npm install
```

3. Set the following environment variables:

```shell
set AZURE_IOT_PROVISIONING_REGISTRATION_ID=<your device registration id>
set AZURE_IOT_PROVISIONING_ID_SCOPE=<your iot central application scope id>
set AZURE_IOT_PROVISIONING_KEY=<your device symmetric key>
set AZURE_IOT_PROVISIONING_ENDPOINT=<the global azure iot provisioning endpoint>
```
*use `export` instead of `set` if you're running MacOS or Linux.*

4. Modify the samples to fit your IoT Central application:
- In `environmentalinterface.js`, change the interface id to the one you created in your IoT Central solution.
- In `sample_device.js` change the capability model id to the one you created in your IoT Central solution.

5. Run the sample with the following command:

```shell
node sample_device.js
```

## What does this sample do?

`environmentalinterface.js` shows how to create a interface class based on the Environmental Sensor interface published in the global model repository.

`sample_device.js` shows how to:
- instantiate a `ProvisioningDeviceClient` to proceed with the device registration.
- use the result of the registration to create a device connection string that will be used by the `DigitalTwinClient` to connect
- instantiate the `DigitalTwinClient`
- instantiate the interface class created with `environmentalinterface.js`
- Combine them together to send telemetry, handle commands, and handle property updates.
