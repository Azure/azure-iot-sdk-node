# Connection types

These samples highlight the different ways to create a client. For simplicity, all proceeding samples will use the default **connection string** method. However, if you need to connect using an X509 certificate, web proxy, or shared access signature (sas), we got you covered.

# 🦉 Getting setup

Before you can run any of the samples, you will need to setup and configure a few things. 

- [Setup IoT Hub and devices](../../../../doc/device-samples/iot-hub-prerequisites.md) 
- [Setup your local environment](../../../../doc/device-samples/dev-environment.md) 
- [Monitor activity (optional)](../../../../doc/device-samples/monitor-iot-hub.md)

# 🌟 Samples

### Connection string

The default sample and the simplest way to create a client connection on your device. This sample just creates a connection and sends a single event to Azure IoT Hub.

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/device-samples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

#### Running the sample

From the `getting started/src/connections` directory, run `node connection_string.js`

### Shared Access Signature (SAS)

This sample shows you how to create a client connection using a SAS token. [Learn more](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-dev-guide-sas?tabs=node) about shared access signatures.

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/device-samples/setting-env-variables.md) if you need help setting environment variables.

| Env variable | Description                                                                                                                                                    |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IOTHUB_SAS   | String SharedAccessSignature in the following format:<br/><br/>`"SharedAccessSignature sr=<iothub_host_name>/devices/<device_id>&sig=<signature>&se=<expiry>"` |

#### Running the sample

From the `getting started/src/connections` directory, run `node sas.js`

### X509 certificate

This sample shows you how to create a client connection using a x509 certificates. [Learn more](https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-x509-introduction) about certificates.

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/device-samples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | 
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |
| PATH_TO_CERTIFICATE_FILE        | Path on disk to the certificate. For example: `c:\mycerts\mydevice.csr`.                                                                                                                                            | 
| PATH_TO_KEY_FILE                | Path on disk to the certificate key. For example: `c:\mykeys\mydevice.key`.                                                                                                                                         |
| KEY_PASSPHRASE_OR_EMPTY         | Optional key passphrase.                                                                                                                                                                                            |

#### Running the sample

From the `getting started/src/connections` directory, run `node x509.js`

### Web proxy

This sample using the connection string with options to use a proxy server.

Before you get started, make sure you set the following environmental variables. [Click here](../../../../doc/device-samples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                    | Description                                                                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IOTHUB_DEVICE_CONNECTION_STRING | The connection string for your IoT Hub device. It contains the Hostname, Device Id & Device Key in the following format:<br/><br/>`"HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"` |

There is also a line of code you you will need to change to match the endpoing of your proxy server.

```javascript
// Create a Proxy Agent
// TODO: You need to change this to match the endpoint of your proxy server.
const proxy = "http://localhost:8888/";
```

#### Running the sample

From the `getting started/src/connections` directory, run `node proxy.js`

# 📖 Further reading

- [Control access to IoT Hub using Shared Access Signatures and security tokens](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-dev-guide-sas?tabs=node)
- [Understanding Public Key Cryptography and X.509 Public Key Infrastructure](https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-x509-introduction)

# 👉 Next Steps

- [Send messages](../send%20messages/README.md)