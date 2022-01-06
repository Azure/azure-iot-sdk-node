# Send messages

Sending telemetry messages is the first and most basic thing to do using the SDK. There are multiple examples below and each example covers multiple protocols. We suggest you start with the [send messages to IoT Hub](#send-messages-to-hub) to ensure you successful connection and message send using MQTT. Then you can work your way through the different protocols.

Also note, that all of these examples use the [connection string](../connections/connection_string.js) method to create a connection client. See the [connections](../connections) section if you want use a different connection method.

# 🦉 Getting set up

Before you can run any of the samples, you will need to setup and configure a few things.

> tip: right click and open in new tab

- [Setup IoT Hub and devices](../../../../doc/devicesamples/iot-hub-prerequisites.md)
- [Setup IoT Central and devices](../../../../doc/devicesamples/iot-central-prerequisites.md) (*only used for send messages to IoT Central*)
- [Setup your local environment](../../../../doc/devicesamples/dev-environment.md)
- [Monitor activity (optional)](../../../../doc/devicesamples/monitor-iot-hub.md)

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

# 🌟 Samples

### Send messages to IoT Hub

The default sample and the simplest way to create a client connection on your device. This sample creates a connection and sends telemetry events to Azure IoT Hub.

#### Running the sample

From the `getting_started/send_messages` directory, run `node send_messages_to_iot_hub.js`

### Send messages to IoT Central

Before you can send telemetry messages to IoT Central, you need to create an IoT Central application and add a new device. [Click here](../../../../doc/devicesamples/iot-central-prerequisites.md) for a walk thru on how to do both.

This example does not use the connection string to connect the device. You will need to take the values from the IoT Central application and set them to the following environmental variables. [Click here](../../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                 | Description                                                                                                                                    |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| IOTHUB_DEVICE_DPS_ENDPOINT   | Option and the default is `global.azure-devices-provisioning.net`. You only need to set the variable if you chose to use a different endpoint. |
| IOTHUB_DEVICE_DPS_ID_SCOPE   | `ID scope`                                                                                                                                     |
| IOTHUB_DEVICE_DPS_DEVICE_ID  | `Device ID`                                                                                                                                    |
| IOTHUB_DEVICE_DPS_DEVICE_KEY | `Primary Key` or `Secondary key`                                                                                                               |

> For a more in-depth example of plug and play capabilies, see [this how to sample](../../../how_to_guide/plug_and_play)

#### Running the sample

From the `getting_started/send_messages` directory, run `node send_messages_to_iot_central.js`

### Send messages in batch

Batch up several messages and send them in a single HTTP request. |

#### Running the sample

From the `getting_started/send_messages` directory, run `node send_messages_in_batch_http.js`

# 👉 Next Steps

- [Recieve cloud to device messages](../receive_messages)
- [More getting started samples](../../)

# 💬 Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).