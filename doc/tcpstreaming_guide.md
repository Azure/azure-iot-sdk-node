# IoT Hub Device Streams NodeJS SDK
**[Private Preview Use Only:** Do not share or re-distribute SDK code, documentation or samples in this private repo.**]**

**[Note:** this feautre was previously known as "TCP streaming".**]**

## Overview
Azure IoT Hub's *device streams* facilitate the creation of a secure bi-directional TCP tunnel for a variety of cloud-to-device communication scenarios. For more information see the main documentation page [here](https://github.com/Azure/azure-iot-sdk-csharp-tcpstreaming/blob/master/doc/tcpstreaming_guide.md) (contact [rezas@microsoft.com](mailto:rezas@microsoft.com) if you cannot open the link).

The present SDK adds service-side support for streaming in NodeJS. This functionality is compatible with the [C](https://github.com/Azure/azure-iot-sdk-c-tcpstreaming/tree/tcpstreaming/doc/tcpstreaming_guide.md) or [C#](https://github.com/Azure/azure-iot-sdk-csharp-tcpstreaming/blob/tcpstreaming/doc/tcpstreaming_guide.md) device-side streaming functionality.

## What is covered in this guide
* Instructions to set up your development environment;
* Instructions to build the SDK and samples;
* Instructions to run sample echo programs demonstrating the use of IoT device streams in Cloud-to-Device (C2D) flows.
* Instructions to run sample proxy programs demonstrating tunneling SSH or RDP sessions to a device over a C2D stream.

## Pre-requisites
* NodeJS version 8 - see [here](https://nodejs.org/dist/latest-v8.x/) for Version 8 release and [here](https://nodejs.org/en/download/) for installation instructions
* NPM - see [here](https://www.npmjs.com/get-npm) for installation instructions
* Lerna - to install run `npm install -g lerna` (you will also need Python 2.7 as a depedency here)
* IoT Hub in *Central US* region under a whitelisted subscription

## Build the SDK and samples
- Clone the SDK repository:
```
  git clone https://github.com/Azure/azure-iot-sdk-node-tcpstreaming
```

- Build the SDK
```
  cd azure-iot-sdk-node-tcpstreaming
  lerna bootstrap
  lerna run build
```

- Install built packages to prepare for running the samples
```
  cd service/samples
  npm install ..
```

## Run sample service-side C2D echo
The [sample C2D echo program](../service/samples/c2d_tcp_streaming.js) should be paird with the device-side echo program available in [C#](https://github.com/Azure/azure-iot-sdk-csharp-tcpstreaming/blob/master/doc/tcpstreaming_guide.md#c2d-echo-sample) and [C](TBD). Refer to the corresponding documentation for instructions on how to run the device-side programs.

Assuming the device-side program is running, follow the steps below to run the service-side C2D sample programs in NodeJS:

- Provide your service credentials and device ID as environment variables.
```
  export IOTHUB_CONNECTION_STRING="<provide_your_service_connection_string>"
  export STREAMING_TARGET_DEVICE="<provide_ip_or_host_of_your_device>"
```
(Use `SET` if you run in windows cmd prompt and make sure you remove the quotes).

- Run the sample using node.
```
  node c2d_tcp_streaming.js
```
After the connection is established, you can type in the console and press enter to send the data to device - the sample on the device will echo back the results. You can then terminate the program by pressing enter again.

## Build and run sample service-local proxy for SSH
To establish end-to-end connectivity for an SSH session, the sample service-local proxy program available in this SDK ([here](../service/samples/tcp_streaming_proxy.js)) should be paired with the device-local proxy program available in [C#](https://github.com/Azure/azure-iot-sdk-csharp-tcpstreaming/blob/master/doc/tcpstreaming_guide.md#ssh-proxy-sample) or [C](TBD). Refer to the corresponding documentation for your desired language for instructions on how to run the device-local proxy programs.

Assuming the device-local proxy is running, follow the steps below to run the service-local proxy in NodeJS:

- Provide your service credentials, the target device ID where SSH daemon runs, and the port number for the proxy running on the device as environment variables.
```
  export IOTHUB_CONNECTION_STRING="<provide_your_service_connection_string>"
  export STREAMING_TARGET_DEVICE="<provide_ip_or_host_of_your_device>"
  export PROXY_PORT=2222
```
(Use `SET` if you run in windows cmd prompt and make sure you remove the quotes).

- Run the service-local proxy using: `node tcp_streaming_proxy.js`

- Run SSH using `ssh $USER@localhost -p 2222`

## Build and run sample service-local proxy for RDP
To establish end-to-end connectivity for an RDP session, the sample service-local proxy program available in this SDK ([here](../service/samples/tcp_streaming_proxy.js)) should be paired with the device-local proxy program available in [C#](https://github.com/Azure/azure-iot-sdk-csharp-tcpstreaming/blob/master/doc/tcpstreaming_guide.md#rdp-proxy-sample) or [C](TBD). Refer to the corresponding documentation for your desired language for instructions on how to run the device-local proxy programs.

Assuming the device-local proxy is running, follow the steps below to run the service-local proxy in NodeJS:

- Provide your service credentials, the target device ID, and the port number for the proxy running on the device as environment variables.
```
  export IOTHUB_CONNECTION_STRING="<provide_your_service_connection_string>"
  export STREAMING_TARGET_DEVICE="<provide_ip_or_host_of_your_device>"
  export PROXY_PORT=2222
```
(Use `SET` if you run in windows cmd prompt and make sure you remove the quotes).

- Run the service-local proxy using: `node tcp_streaming_proxy.js`

- Run remote desktop and provide `localhost:2222` as computer.

## Troubleshooting
- If lerna bootstrap step failed due to not being able to find python executable, run the following command:
```
  npm --add-python-to-path='true' --debug install --global windows-build-tools
```
- If lerna boostrap step fails again ensure you are using NodeJS version 8 (not later).
