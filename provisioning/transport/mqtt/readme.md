This package (**azure-iot-provisioning-device-mqtt**) provides the MQTT and MQTT over Websocket transports that can be used to communicate with the Azure IoT Hub Device Provisioning Service. Please note that the MQTT transport only supports X509 authentication.

[![npm version](https://badge.fury.io/js/azure-iot-provisioning-device.svg)](https://badge.fury.io/js/azure-iot-provisioning-device)

## Install

There are at least 3 different packages involved when writing code to take advantage of the Azure IoT Hub Device Provisioning Service:
- The "client" package that will be used to create a provisioning client. This is the **azure-iot-provisioning-device** package.
- the "transport" package that will decide which protocol will be used to communicate with the provisioning service. One of **azure-iot-provisioning-device-amqp**, **azure-iot-provisioning-device-mqtt** (this package), or **azure-iot-provisioning-device-http**. Please note that X509 authentication is supported with all protocols but TPM authentication is supported only with AMQP and HTTP.
- The "security client" package that will be used to interface with whatever type of security (x509 or TPM) is used to authenticate the device.

For example:
```
npm install --save azure-iot-provisioning-device
npm install --save azure-iot-provisioning-device-amqp # Or -mqtt or -http
npm install --save azure-iot-security-x509 # Or -tpm
```

## Getting Started

To get started please read our [Overview of the Device Provisioning Service](https://docs.microsoft.com/en-us/azure/iot-dps/about-iot-dps) and visit [our tutorials pages](https://docs.microsoft.com/en-us/azure/iot-dps/tutorial-set-up-cloud)

