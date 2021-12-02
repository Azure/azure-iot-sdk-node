# Device Twin Backend Service

This project is used to send device twin patch updates for a specific device. This helper project is needed if you are trying to run the following samples:

- `javascript\simple_sample_device_twin.js`
- `typescript\simple_sample_device_twin.ts`

The way it works is:
- `simple_sample_device_twin.js` is started up and will listen for device twin desired property updates
- `twin-service.js` executes and updates the desired properties for the device twin

## Setting things up

### IoT Hub and Device

You need to setup an instance of IoT Hub and device. [Click here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-twin-getstarted) for detailed instructions.

### Install package dependencies

From the `helpers\device-twin-service` directory, install the packages for this project.

```
npm install
```

### Configure `twin-service.js`

Set the `IOTHUB_CONNECTION_STRING` environmental variable to the IoT Hub connection string. 

Once you have created a device, you also need to set the `deviceId` variable manually in the code. This is the specific device you want to work with.

```javascript
    const deviceId = '{device id}';
```

## Getting started quickly

Once you have set your IoT Hub connection string and deviceId, you are ready to run the sample. 

From the `samples\javascript` directory, open a command prompt and run the `simple_sample_device_twin.js` file.

```
node simple_sample_device_twin.js
```

In a separate command prompt, from the `helpers\device-twin-service` directory, run the `twin-service.js` file.

```
node twin-service.js
```

Watch the `simple_sample_device_twin.js` console as the `twin-service.js` executes. You will notice the handler being called and logged with results that look like this:

```text
new desired properties received:
{"climate":{"minTemperature":68,"maxTemperature":76},"$version":36}
updating desired temp:
min temp = 68
max temp = 76
```

## Digging deeper into the sample

The `twin-service.js` file contains several patch documents that you can run, depending on the example scenario. The script is very simple and should be run each time you want to make a patch update. You will need to set the `twinPatch` variable to the right patch document. 

```javascript
// set to the patch you want to update
const twinPatch = twinPatch1;
// const twinPatch = twinPatch2;
// const twinPatch = twinPatch3;
// const twinPatch = twinPatch4;  
// const twinPatch = twinPatch5;
```

## Usage Examples
Here are the example scenarios:

### Example #1 (twinPatch1)
Receiving all patches with a single event handler.
        
This code will output any properties that are received from the service

### Example #2 (twinPatch2)
Receiving an event if anything under `properties.desired.climate` changes
    
This code will output desired min and max temperature every time the service updates either one.

### Example #3 (twinPatch3)
Receiving an event for a single (scalar) property value. This event is only fired if the fanOn boolean value is part of the patch.
        
This code will output the new desired fan state whenever the service updates it.

### Example #4 (twinPatch4 & twinPatch5)
Handle add (twinPatch4) or delete (twinPatch5) operations. The app developer is responsible for inferring add/update/delete operations based on the contents of the patch.

# Documentation

For further reading on device twins:

- [Understand and use device twins in IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins)
- [Get started with device twins](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-twin-getstarted) 

# Feedback

The sample for device twins is a bit more complicated. We are hoping this readme and helper project give you what you need to understand how device twins work. If you find anything off with this sample or have feedback for us, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).
