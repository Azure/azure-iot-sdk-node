# Send messages

Sending telemetry messages is the first and most basic thing to do using the SDK. There are multiple examples below and each example covers multipe protocols. We suggest you start with the [send messages to IoT Hub](#send-messages-to-hub) to ensure you successfull connection and message send using MQTT. Then you can work work your way through the different protocols.

Also note, that all of these examples use the [connection string](../connections/connection_string.js) method to create a connection client. See the [connections](../connections) section if you want use a different connection method.

# 🦉 Getting setup

Before you can run any of the samples, you will need to setup and configure a few things. 

- [Setup IoT Hub and devices](../../../../doc/device-samples/iot-hub-prerequisites.md) 
- [Setup your local environment](../../../../doc/device-samples/dev-environment.md) 
- [Monitor activity (optional)](../../../../doc/device-samples/monitor-iot-hub.md)

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/device-samples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

# 🌟 Samples

### Send messages to IoT Hub

The default sample and the simplest way to create a client connection on your device. This sample just creates a connection and sends a single event to Azure IoT Hub.

#### Running the sample

From the `getting started/src/send messages` directory, run `node send_messages_to_hub.js`

### Send messages to IoT Central

text text text

#### Running the sample

From the `getting started/src/send messages` directory, run `node send_messages_to_central.js`

### Send messages in batch

text text text                                                                                                                                                                                        |

#### Running the sample

From the `getting started/src/send messages` directory, run `node send_messages_in_batch_http.js`

# 👉 Next Steps

- [Send messages](../recieve%20messages)
- [More getting started samples](../../)