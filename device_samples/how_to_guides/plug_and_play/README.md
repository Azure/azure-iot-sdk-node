# Plug and Play

These samples demonstrate how a device that follows the [IoT Plug and Play conventions](https://docs.microsoft.com/azure/iot-pnp/concepts-convention) interacts with IoT Hub or IoT Central, to:

- Send telemetry.
- Update read-only and read-write properties.
- Respond to command invocation.

#### Caveats

- Azure IoT Plug and Play is only supported for MQTT and MQTT over WebSockets for the Azure IoT Node Device SDK. Modifying these samples to use AMQP, AMQP over WebSockets, or HTTP protocols **will not work**.
- When the thermostat receives a desired temperature, it has no actual affect on the current temperature.
- The command `getMaxMinReport` allows the application to specify statistics of the temperature since a given date. To keep the sample simple, we ignore this field and instead return statistics from the entire lifecycle of the executable.
- The temperature controller implements a command named `reboot` which takes a request payload indicating the delay in seconds. The sample will ignore this command.

# 🦉 Getting set up

Before you can run any of the samples, you will need to setup and configure a few things.

> tip: right click and open in new tab

- [Setup IoT Hub and devices](../../../doc/devicesamples/iot-hub-prerequisites.md)
- [Setup IoT Central and devices](../../../doc/devicesamples/iot-central-prerequisites.md)
- [Setup your local environment](../../../doc/devicesamples/dev-environment.md)
- [Monitor activity (optional)](../../../doc/devicesamples/monitor-iot-hub.md)

#### IoT Central or IoT Hub with Device Provisioning Service

| Env variable                 | Description                                                                                                                                    |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| IOTHUB_DEVICE_DPS_ENDPOINT   | Optional and the default is `global.azure-devices-provisioning.net`. You only need to set the variable if you chose to use a different endpoint. |
| IOTHUB_DEVICE_DPS_ID_SCOPE   | `ID scope`                                                                                                                                     |
| IOTHUB_DEVICE_DPS_DEVICE_ID  | `Device ID`                                                                                                                                    |
| IOTHUB_DEVICE_DPS_DEVICE_KEY | `Primary Key` or `Secondary key`               

#### IoT Hub with a device connection string

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

# 🌟 Samples

### Thermostat

An IoT Plug and Play device that implements the [Thermostat](https://devicemodels.azure.com/dtmi/com/example/thermostat-1.json) model. This model has a single interface that defines telemetry, read-only and read-write properties, and commands. To learn more about how to configure and run the Thermostat device sample with IoT Hub, see [Quickstart: Connect a sample IoT Plug and Play device application running on Linux or Windows to IoT Hub](https://docs.microsoft.com/azure/iot-pnp/quickstart-connect-device?pivots=programming-language-javascript).

#### Running the sample

From the `how_to_guides/plug_and_play` directory, run `node thermostat.js`

### Temperature controller

An IoT Plug and Play device that implements the [Temperature controller](https://devicemodels.azure.com/dtmi/com/example/temperaturecontroller-2.json) model. This model uses multiple components:

  - The top-level interface defines telemetry, read-only property and commands.
  - The model includes two [Thermostat](https://devicemodels.azure.com/dtmi/com/example/thermostat-1.json) components, and a [device information](https://devicemodels.azure.com/dtmi/azure/devicemanagement/deviceinformation-1.json) component.

To learn more about how to configure and run the Temperature Controller device sample with:

  - IoT Hub, see [Tutorial: Connect an IoT Plug and Play multiple component device application running on Linux or Windows to IoT Hub](https://docs.microsoft.com/azure/iot-pnp/tutorial-multiple-components?pivots=programming-language-javascript)
  - IoT Central, see [Tutorial: Create and connect a client application to your Azure IoT Central application](https://docs.microsoft.com/azure/iot-central/core/tutorial-connect-device?pivots=programming-language-javascript)

#### Running the sample

From the `how_to_guides/plug_and_play` directory, run `node temperature_controller.js`

# 📖 Further reading

- [IoT Plug and Play conventions](https://docs.microsoft.com/azure/iot-pnp/concepts-convention)
- [Tutorial: Connect an IoT Plug and Play multiple component device application running on Linux or Windows to IoT Hub](https://docs.microsoft.com/azure/iot-pnp/tutorial-multiple-components?pivots=programming-language-javascript)
- [Tutorial: Create and connect a client application to your Azure IoT Central application](https://docs.microsoft.com/azure/iot-central/core/tutorial-connect-device?pivots=programming-language-javascript)
- [Quickstart: Connect a sample IoT Plug and Play device application running on Linux or Windows to IoT Hub](https://docs.microsoft.com/azure/iot-pnp/quickstart-connect-device?pivots=programming-language-javascript)
- [Thermostat model](https://devicemodels.azure.com/dtmi/com/example/thermostat-1.json)
- [Temperature controller model](https://devicemodels.azure.com/dtmi/com/example/temperaturecontroller-2.json)

# 👉 Next Steps

- [Use Device Twins to reboot a device](../device_reboot)
- [More how-to-guide samples](../../)

# 💬 Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).