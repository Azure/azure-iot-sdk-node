# Microsoft Azure IoT device SDK for Node.js

The Azure IoT device SDK for Node allows to build devices that communicate with Azure IoT Hub.

## Features

Use the device SDK to:
* Send event data to Azure IoT Hub.
* Receive messages from IoT Hub.
* Communicate with the service via MQTT (optionally over WebSockets), AMQP (optionally over WebSockets),  or HTTP.
* Synchronize an Azure IoT Hub device Twin with Azure IoT Hub from a device
* Implement Azure IoT Hub Direct Device Methods on devices
* Implement Azure IoT Device Mangement features on devices

## How to use the Azure IoT device SDK for Node.js

* [Get started in minutes with the azure-iot-device npm package](./core/readme.md)
* [Check out the simple samples provided in this repository](./samples/)
* [Try out the Node-RED node for Azure IoT Hub](./node-red/)

## Directory structure

Device SDK subfolders:

### /core

Protocol-independent device SDK package.

### /node-red

Node-RED module for Azure IoT Hub.

### /samples

Sample applications exercising basic features.

### /transport

Protocol-specific SDK packages for: AMQP, AMQP over WebSockets, MQTT, and HTTP.
