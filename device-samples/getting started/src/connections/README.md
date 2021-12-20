# Connection types

These samples highlight the different ways to create a client. For simplicity, all proceeding samples will use the default **connection string** method. However, if you need to connect using an X509 certificate, web proxy, or shared access signature (sas), we got you covered.

# 🌟 Samples

### Connection string

The default sample and the simplest way to create a client connection on your device. This sample just creates a connection and sends a single event to Azure IoT Hub.

Before you get started, make sure you set the following environmental variables. [Click here](../../../help/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following formats: "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>" |

#### Running the sample

From the `getting started/src/connections` directory, run `node connection_string.js`

### Shared Access Signature (SAS)

### X509 certificate

### Web proxy

### Send messages to IoT Central

Send messages to IoT Central using MQTT (default), AMQP, MQTTW (Web Socket), AMQPW (Web Socket), and HTTP

<a href="./send_messages_iot_central.js"><code>send_messages_iot_central.js</code></a>
<a href="./send_messages_iot_central.ts"><code>send_messages_iot_central.ts</code></a>

- [Azure Documentation](#)
- [Create and connect a client application to your Azure IoT Central application](#)

### Send messages via proxy

Send messages through a proxy

<a href="./send_messages_through_proxy.js"><code>send_messages_through_proxy.js</code></a>

### Send messages with x509

Send messages when using an X509 certificate

<a href="./send_messages_with_x509.js"><code>send_messages_with_x509.js</code></a>
<a href="./send_messages_with_x509.ts"><code>send_messages_with_x509.ts</code></a>

- [Understanding Public Key Cryptography and X.509 Public Key Infrastructure](https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-x509-introduction)

### Send messages with SAS token

Send messages with Shared Access Signature (SAS) token

<a href="./send_messages_with_sas.js"><code>send_messages_with_sas.js</code></a>
<a href="./send_messages_with_sas.ts"><code>send_messages_with_sas.ts</code></a>

- [Azure Documentation](https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-x509-introduction)

### Send messages in batch with HTTP

Send several messages in batch using HTTP

<a href="./send_messages_in_batch_http.js"><code>send_messages_in_batch_http.js</code></a>
<a href="./send_messages_in_batch_http.ts"><code>send_messages_in_batch_http.ts</code></a>

# ⚙️ Installation

## Using GitHub codespaces

You can use Github Codespaces to be up and running quickly! Here are the steps to follow.

**1) Create and open Codespace**

- Select the Codespaces tab and the "New codespace" button
- Once the Codespace is open, all required packages to run the samples will be setup for you

**3) Set the IOTHUB_DEVICE_CONNECTING_STRING environment variable**

- From a shell or Node.js command prompt, navigate to the folder where you placed the sample files.
- Set the `IOTHUB_DEVICE_CONNECTING_STRING` environment variable:

```bash
export IOTHUB_DEVICE_CONNECTING_STRING="<YourIoTHubConnectionString>"
```

**4) Run it**

Run the sample application using the following commands:

_for JavaScript_

```bash
cd device/samples/javascript
node simple_sample_device.js
```

_for TypeScript_

```bash
cd device/samples/typescript/dist
node simple_sample_device.js
```

## Run samples locally

_How to run a sample in your own folder using published npm packages._

**1) Make sure you have the prerequisites**

In order to run the device samples you will first need the following prerequisites:

- The latest or LTS version of Node.js on your device. (Check out [Nodejs.org](https://nodejs.org/) for more info)
- An Azure IoT Hub instance ([Link if you don't](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-create-through-portal))
- A device identity for your device ([Link if you don't](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-create-through-portal#register-a-new-device-in-the-iot-hub))
- Clone this repo to your local machine

**2) Install dependencies**

You need to install proper dependencies as defined in the **package.json**. Run the following commands:

```
cd device/samples/javascript
npm install
```

**3) Set the IOTHUB_DEVICE_CONNECTING_STRING environment variable**

- From a shell or Node.js command prompt, navigate to the folder where you placed the sample files.
- Set the `IOTHUB_DEVICE_CONNECTION_STRING` environment variable:

_in bash_

```bash
export IOTHUB_DEVICE_CONNECTION_STRING="<YourIoTHubConnectionString>"
```

_in powershell_

```powershell
$env:IOTHUB_DEVICE_CONNECTION_STRING="<YourIoTHubConnectionString>"
```

**4) Build it**

For the TypeScript samples, we need to run the `build` command to transpile the TypeScript code into the JavaScript files:

```
npm run build
```

The JavaScript files are placed into the `dist` folder.

**5) Run it**

Run the sample application using the following commands:

JavaScript

```bash
node sample_sample_device.js
```

# 📖 Documentation

Nunc malesuada volutpat fermentum. Donec in ante nec diam venenatis eleifend. Cras commodo ligula nec justo lacinia fringilla. Morbi eget congue neque. Duis varius eleifend enim eu euismod. Pellentesque scelerisque convallis tortor. Fusce gravida est diam, ac sodales enim consectetur eu. Duis eu consequat massa.

- [Quickstart: Send telemetry from a device to an IoT hub and monitor it with the Azure CLI](https://docs.microsoft.com/en-us/azure/iot-hub/quickstart-send-telemetry-cli)
- [Quickstart: Send telemetry from an IoT Plug and Play device to Azure IoT Hub](https://docs.microsoft.com/en-us/azure/iot-develop/quickstart-send-telemetry-iot-hub?toc=%2Fazure%2Fiot-hub%2Ftoc.json&bc=%2Fazure%2Fiot-hub%2Fbreadcrumb%2Ftoc.json&pivots=programming-language-nodejs)

# ➡️ Next Steps

- [How to guides](src/../../how%20to%20guides)
- [Solutions](src/../../solutions)
