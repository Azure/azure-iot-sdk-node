# Device firmware update

This sample highlights using a combination of cloud-to-device method invocation and device twins for a solution to update the firmware on a device. If you are not familiar with method invocation or device twins, please review the following **getting started** samples:

- [Cloud to device method invocation](../../getting_started/receive_method_invocation)
- [Device twins](../../getting_started/device_twins)

# 🦉 Getting set up

Before you can run any of the samples, you will need to setup and configure a few things. 

- [Setup IoT Hub and devices](../../../doc/devicesamples/iot-hub-prerequisites.md) 
- [Setup your local environment](../../../doc/devicesamples/dev-environment.md) 
- [Monitor activity (optional)](../../../doc/devicesamples/monitor-iot-hub.md)

Make sure you set the following environmental variables. [Click here](../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

# 🌟 Samples

### Update device

Using a combination of cloud-to-device method invocation and device twins for a solution to update the firmware on the device.

#### Running the sample

From the `how_to_guides/device_update` directory, run `node fwupdate_device.js`

You should then see the following message in the terminal:

```text
Client connected to IoT Hub. Waiting for firmwareUpdate device method...
```

Next, in order to trigger the firmware update, you need to send a method invocation from the cloud to your device. You can do this from either [Azure IoT Explorer](../../../doc/devicesamples/send-message-with-iot-explorer.md) or [Azure Portal](../../../doc/devicesamples/send-message-with-azure-portal.md).

- Method name: `firmwareUpdate`
- Method body: `"https://firmware-download-url.com"`

Click **Invoke method**. When the device recieves the message, the handler invokes the method. You should then see the following message in your terminal:

```text
Response to method 'firmwareUpdate' sent successfully.
{
  "iothubDM": {
    "firmwareUpdate": {
      "status": "downloading",
      "startedDownloadingTime": "2022-01-13T17:05:27.377Z"
    }
  }
}
Downloading image from URI: https://firmware-download-url.com
{
  "iothubDM": {
    "firmwareUpdate": {
      "status": "download complete",
      "downloadCompleteTime": "2022-01-13T17:05:31.622Z"
    }
  }
}
{
  "iothubDM": {
    "firmwareUpdate": {
      "status": "applying",
      "startedApplyingImage": "2022-01-13T17:05:31.840Z"
    }
  }
}
Applying firmware image
{
  "iothubDM": {
    "firmwareUpdate": {
      "status": "Apply firmware image complete",
      "lastFirmwareUpdate": "2022-01-13T17:05:36.062Z"
    }
  }
}
Completed firmwareUpdate flow
```

# 📖 Further reading

- [Get started with device twins (Node.js)](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-twin-getstarted)
- [Understand and use device twins in IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins)
- [Understand and invoke direct methods from IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods?WT.mc_id=Portal-Microsoft_Azure_IotHub)

# 👉 Next Steps

- [Connect a downstream device to IoT Edge and send and receive messages](../device_connecting_to_edge)
- [More how-to-guide samples](../../)
- [All samples](../../../device_samples)

# 💬 Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).