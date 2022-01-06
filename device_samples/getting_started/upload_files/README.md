# Upload files

The [Send messages](../send_messages) sample demonstrates the basic device-to-cloud messaging functionality of IoT Hub. However, in some scenarios you can't easily map the data your devices send into the relatively small device-to-cloud messages that IoT Hub accepts. For example:

- Large files that contain images
- Videos
- Vibration data sampled at high frequency
- Some form of pre-processed data.

This sample will show you how to upload files into Azure IoT Hub.

# 🦉 Getting set up

Before you can run any of the samples, you will need to setup and configure a few things. 

- [Setup IoT Hub and devices](../../../../doc/devicesamples/iot-hub-prerequisites.md) 
- [Setup your local environment](../../../../doc/devicesamples/dev-environment.md) 
- [Associate an Azure Storage account to IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-file-upload#associate-an-azure-storage-account-to-iot-hub)
- [Monitor activity (optional)](../../../../doc/devicesamples/monitor-iot-hub.md)

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |
| PATH_TO_FILE | The file path for the file you are attempting to upload.  |

# 🌟 Samples

### Upload file

Uploads a file into the linked Azure blob storage account. 

Make sure you properly [Associate an Azure Storage account to IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-file-upload#associate-an-azure-storage-account-to-iot-hub).

#### Running the sample

From the `getting_started/upload_files` directory, run `node upload_file.js`

You should then see the following message in the terminal window:

```text
uploadStreamToBlockBlob success
notifyBlobUploadStatus success
```

# 📖 Further reading

- [Upload files from your device to the cloud with IoT Hub (Node.js)](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-file-upload)
- [Upload files with IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload)
  
# 👉 Next Steps

- [Send messages to IoT Hub](../send_messages)
- [More getting started samples](../../)

# 💬 Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).