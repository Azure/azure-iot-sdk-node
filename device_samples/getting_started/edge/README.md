# Edge samples

Connect a downstream device to IoT Edge and send and receive messages.

Also note, that all of these examples use the [connection string](../connections/connection_string.js) method to create a connection client. See the [connections](../connections) section if you want use a different connection method.

# 🦉 Getting set up

Before you can run any of the samples, you will need to setup and configure a few things.

> tip: right click and open in new tab

- [Setup IoT Hub and devices](../../../doc/devicesamples/iot-hub-prerequisites.md)
- [Setup your local environment](../../../doc/devicesamples/dev-environment.md)

# 🌟 Samples

### Connect a downstream device

Connect to a device to IoT Edge and send and recieve telemetry.

Before you get started, make sure you set the following environmental variables. [Click here](../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | Obtain the connection string for your downstream device and to it append this string GatewayHostName=<edge device hostname>; . The Azure IoT Edge device hostname is the hostname set in the config.yaml of the Azure IoT Edge device to which this sample will connect to. |
| PATH_TO_CERTIFICATE_FILE | Path to the Edge "owner" root CA certificate |

The resulting string should look like the following: 

```
HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>;GatewayHostName=<edge device hostname>
```

#### Running the sample

From the `getting_started/edge` directory, run `node edge_downstream_device.js`

# 📖 Further reading

- [Understand and invoke direct methods from IoT Hub](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods?WT.mc_id=Portal-Microsoft_Azure_IotHub)

# 👉 Next Steps

- [More getting started samples](../../)

# 💬 Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).