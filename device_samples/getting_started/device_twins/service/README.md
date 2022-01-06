# Device Twin Backend Service

This project is used simulate a backend service to send desired property updates to a device. This the `update_desired_properties.js` file is needed if you are trying to run the `receive_desired_properties.js` sample.

The way it works is:
- `receive_desired_properties.js ` is started up and will listen for device twin desired property updates.
- `service\update_desired_properties.js` executes and updates the desired properties for the device twin.

## Setting things up

This sample assumes you already have an instance of IoT Hub created that contains at least one device.

### Configure `update_desired_properties.js`

Set the `IOTHUB_CONNECTION_STRING` environmental variable to the IoT Hub connection string. 

Once you have created a device, you also need to set the `deviceId` variable manually in the code. This is the specific device you want to work with. 

Make sure the **deviceId** is the same device you have configured for the `IOTHUB_DEVICE_CONNECTION_STRING`.

```javascript
    const deviceId = '{device id}';
```

## Getting started

Once you have set your IoT Hub connection string and deviceId, you are ready to run the sample. 

From the `device twins` directory, open a command prompt and run the command `node receive_desired_properties.js`. It will continue to run and listen for device twin desired property updates.

In a separate command prompt, from the `device twins\service` directory, run the command `node update_desired_properties.js 1`.

Watch the results from `receive_desired_properties.js` console as the `update_desired_properties.js` executes. You will notice the handler being called and should look something like this:

```text
New desired properties received for "properties.desired.climate":
  min temp=69
  max temp=77
New desired properties received for "properties.desired.climate.hvac.sytemControl":
  fan=true
New desired properties received for "properties.desired.modules":
  Adding module wifi: {"channel":6,"ssid":"my_network","encryption":"wpa","passphrase":"foo"}
  Adding module climate: {"id":17,"units":"farenheit"}
```

## Digging deeper into the sample

The `update_desired_properties.js` allows you to send several different patch documents, depending on the example scenario. To do this you just need to pass a value of 1-4 as the first argument after the `node update_desired_properties.js`

| Scenario Example                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `update_desired_properties.js 1` | Receiving all patches with a single event handler. This code will output any properties that are received from the service  |
| `update_desired_properties.js 2` | Receiving an event if anything under `properties.desired.climate` changes. This code will output desired min and max temperature every time the service updates either one.  |
| `update_desired_properties.js 3` | Receiving an event for a single (scalar) property value. This event is only fired if the fanOn boolean value is part of the patch. This code will output the new desired fan state whenever the service updates it.  |
| `update_desired_properties.js 4` | Handle add or delete operations. The app developer is responsible for inferring add/update/delete operations based on the contents of the patch.  |

# Feedback

The sample for device twins is a bit more complicated. We are hope this readme and helper files give you what you need to understand how device twins work. If you find anything off with this sample or have feedback for us, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).