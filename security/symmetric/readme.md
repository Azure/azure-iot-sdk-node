Security module used to provide Symmetric Key authentication capabilities to the Azure IoT Hub device client and Azure IoT Hub Provisioning Service device client.

[![npm version](https://badge.fury.io/js/azure-iot-security-symmetric-key.svg)](https://badge.fury.io/js/azure-iot-security-symmmetric-key)

## Install

There are at least 3 different packages involved when writing code to take advantage of the Azure IoT Hub Device Provisioning Service:
- The "client" package that will be used to create a provisioning client. This is the **azure-iot-provisioning-device** package.
- the "transport" package that will decide which protocol will be used to communicate with the provisioning service. One of **azure-iot-provisioning-device-amqp**, **azure-iot-provisioning-device-mqtt**, or **azure-iot-provisioning-device-http**. Please note that Symmetric Key authentication is supported with all protocols but TPM authentication is supported only with AMQP and HTTP.
- The "security client" package that will be used to interface with whatever type of security (x509, TPM, or Symmetric Key) is used to authenticate the device. This package (**azure-iot-security-symmetric-key**) provides Symmetric Key authentication capabilities.

For example:
```
npm install --save azure-iot-provisioning-device
npm install --save azure-iot-provisioning-device-amqp # Or -mqtt or -http
npm install --save azure-iot-security-symmetric-key
```

## Getting Started

To get started please read our [Overview of the Device Provisioning Service](https://docs.microsoft.com/en-us/azure/iot-dps/about-iot-dps) and visit [our tutorials pages](https://docs.microsoft.com/en-us/azure/iot-dps/tutorial-set-up-cloud)

