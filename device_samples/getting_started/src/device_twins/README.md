# Device twins

Device twins are JSON documents that store device state information, including metadata, configurations, and conditions. IoT Hub persists a device twin for each device that connects to it.

Use device twins to:

- Store device metadata from your solution back end.
- Report current state information such as available capabilities and conditions, for example, the connectivity method used, from your device app.
- Synchronize the state of long-running workflows, such as firmware and configuration updates, between a device app and a back-end app.
- Query your device metadata, configuration, or state.

For an in-depth walk through of using device twins, we suggest reading the [Get started with device twins (Node.js)](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-twin-getstarted) article.

Note, that these examples use the [connection string](../connections/connection_string.js) method to create a connection client. See the [connections](../connections) section if you want use a different connection method.

# 🦉 Getting setup

Before you can run any of the samples, you will need to setup and configure a few things.

> tip: right click and open in new tab

- [Setup IoT Hub and devices](../../../../doc/devicesamples/iot-hub-prerequisites.md)
- [Setup your local environment](../../../../doc/devicesamples/dev-environment.md)
- [Configure simulated backend service](./service)

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

# 🌟 Samples

### Get twin

Creates a twin and gets it's desired properties.

#### Running the sample

From the `getting_started/src/device_twins` directory, run `node get_twin.js`

You should then see the following message in the terminal window:

```text
Client created.
Client opened.
Twin created.
Getting twin properties...
{"reported":{"$version":1},"desired":{"$version":1}}
```

You can view the device twin from the [Azure Portal](../../../../doc/devicesamples/device-twin-with-azure-portal.md) or [Azure IoT Explorer]((../../../../doc/devicesamples/device-twin-with-iot-explorer.md)).

### Recieve desired properties

How a device would recieve desired property updates from a backend service. For example, you might set a target operational temperature range for a device or collect firmware version information from your devices.

#### Running the sample

Running this sample requires two steps:

1. From the `getting_started/src/device_twins` directory, run `node receive_desired_properties.js`. You are now running and listening for desired property updates.

2. Open a new command (terminal) window and run `getting_started/src/device_twins/service/update_desired_properties.js 1`. This will send an update to a desired property. Go back to the terminal window for `receive_desired_properties.js` to view the results.

Take a [look at these details](./service) for the `update_desired_properties.js` file for setup, configuration, and additional desired property update options.

### Update reported properties

Update reported properties back to IoT Hub.

### Running the sample

From the `getting_started/src/device_twins` directory, run `node update_reported_properties.js`

You should then see the following message in the terminal window:

```text
Client created.
Client opened.
Twin created.
Twin state reported successfully.
```
You can view the device twin from the [Azure Portal](../../../../doc/devicesamples/device-twin-with-azure-portal.md) or [Azure IoT Explorer]((../../../../doc/devicesamples/device-twin-with-iot-explorer.md)).

### All together

View get twin, recieving desire property updates, and sending reported properties, all together in a single file.

### Running the sample

From the `getting_started/src/device_twins` directory, run `node all_together.js`

[Follow the instructions here](./service) to send desired property updates from a backend service to the device.

# 📖 Further reading

- [Get started with device twins (Node.js)](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-twin-getstarted)
- [Understand and use device twins in IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins)
- [Tutorial: Configure your devices from a back-end service](https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-device-twins)

# 👉 Next Steps

- [Upload files](../upload_files)
- [More getting started samples](../../)

# 💬 Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).