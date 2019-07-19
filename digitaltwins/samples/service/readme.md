# Azure IoT Digital Twins: Service Client Example

This sample shows how to use `DigitalTwinServiceClient` class from the `azure-iot-digitaltwins-service` package.

## Prerequisite

You should have [Node.js](https://nodejs.org/en/) installed.

## How to install the sample

1. Download the files in this folder
2. Install the dependencies:
  - To download the client libraries from NPM, simply run `npm install`
  - if you've downloaded the client libraries manually, simply run:
      (dont't forget to replace <path-to> with the actual path to the package and <preview-version> with the version of the packages you downloaded)
      ```shell
      npm install <path-to>/azure-iot-common-<preview-version>
      npm install <path-to>/azure-iot-digitaltwins-service-<preview-version>
      ```
      and  if you want to run the query sample (which relies on the azure-iothub package):
      ```shell
      npm install <path-to>/azure-iot-http-base-<preview-version>
      npm install <path-to>/azure-iot-amqp-base-<preview-version>
      npm install <path-to>/azure-iothub-<preview-version>
      ```
3. Set the following environment variables:
```shell
set IOTHUB_CONNECTION_STRING=<your IoT Hub connection string>
```
*use `export` instead of `set` if you're running MacOS or Linux.*


4. Run the sample with the following command:

```shell
node <sample_name.js>
```

## What do these samples do?

- `invoke_command.js` invokes a command on a device component.
- `get_digital_twin.js` gets the digital twin for a specific device.
- `get_digital_twin_component.js` gets the data for a specific component of a specific device.
- `get_model.js` gets a model from the global repository.
- `update_digital_twin_property.js` updates a single writable property on a digital twin.
- `update_digital_twin.js` creates a patch to updates multiple writable properties on a digital twin, potentially on multiple components.
- `query_interface.js` runs a query that returns all devices implementing a specific interface.