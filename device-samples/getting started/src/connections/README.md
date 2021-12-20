# Connection types

These samples highlight the different ways to create a client. For simplicity, all proceeding samples will use the default **connection string** method. However, if you need to connect using an X509 certificate, web proxy, or shared access signature (sas), we got you covered.

# 🌟 Samples

### Connection string

The default sample and the simplest way to create a client connection on your device. This sample just creates a connection and sends a single event to Azure IoT Hub.

Before you get started, make sure you set the following environmental variables. [Click here](../../../help/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

#### Running the sample

From the `getting started/src/connections` directory, run `node connection_string.js`

### Shared Access Signature (SAS)

### X509 certificate

### Web proxy

# 📖 Documentation

Nunc malesuada volutpat fermentum. Donec in ante nec diam venenatis eleifend. Cras commodo ligula nec justo lacinia fringilla. Morbi eget congue neque. Duis varius eleifend enim eu euismod. Pellentesque scelerisque convallis tortor. Fusce gravida est diam, ac sodales enim consectetur eu. Duis eu consequat massa.

- [Quickstart: Send telemetry from a device to an IoT hub and monitor it with the Azure CLI](https://docs.microsoft.com/en-us/azure/iot-hub/quickstart-send-telemetry-cli)
- [Quickstart: Send telemetry from an IoT Plug and Play device to Azure IoT Hub](https://docs.microsoft.com/en-us/azure/iot-develop/quickstart-send-telemetry-iot-hub?toc=%2Fazure%2Fiot-hub%2Ftoc.json&bc=%2Fazure%2Fiot-hub%2Fbreadcrumb%2Ftoc.json&pivots=programming-language-nodejs)

# 👉 Next Steps

- [How to guides](src/../../how%20to%20guides)
- [Solutions](src/../../solutions)
