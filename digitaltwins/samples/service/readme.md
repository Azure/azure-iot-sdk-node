# Azure IoT Digital Twins: Service Client Example

This sample shows how to use `DigitalTwinServiceClient` class from the `azure-iot-digitaltwins-service` package.

## Prerequisite

You should have [Node.js](https://nodejs.org/en/) installed.

## How to install the sample

1. Download the samples you want to run from this folder of the repository
2. Install the dependencies by opening a terminal that contains the sample you downloaded and the `package.json` file and type:

```shell
npm install
```

3. Set the following environment variables:

```shell
set IOTHUB_CONNECTION_STRING=<your IoT Hub connection string>
```
*use `export` instead of `set` if you're running MacOS or Linux.*

4. Edit the sample to change the values at the top of the  file to match your scenario

5. Run the sample with the following command:

```shell
node <sample_name.js>
```

## What do these samples do?

- `invoke_command.js` invokes a command on a device interface instance.
- `get_digital_twin.js` gets the digital twin for a specific device.
- `get_digital_twin_interface_instance.js` gets the data for a specific interface instance of a specific device.
- `get_model.js` gets a model from the global repository.
- `update_digital_twin_property.js` updates a single writable property on a digital twin.
- `update_digital_twin.js` creates a patch to updates multiple writable properties on a digital twin, potentially on multiple interface instances.
- `query_interface.js` runs a query that returns all devices implementing a specific interface.