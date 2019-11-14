// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;
const DeviceInformation = require('./deviceInformation').DeviceInformation;
const ModelDefinition = require('./modelDefinition').ModelDefinition;

const environmentalModel = `{
  "@id": "urn:contoso:com:EnvironmentalSensor:1",
  "@type": "Interface",
  "displayName": "Environmental Sensor",
  "description": "Provides functionality to report temperature, humidity. Provides telemetry, commands and read-write properties",
  "comment": "Requires temperature and humidity sensors.",
  "contents": [
    {
      "@type": "Property",
      "displayName": "Device State",
      "description": "The state of the device. Two states online/offline are available.",
      "name": "state",
      "schema": "boolean"
    },
    {
      "@type": "Property",
      "displayName": "Customer Name",
      "description": "The name of the customer currently operating the device.",
      "name": "name",
      "schema": "string",
      "writable": true
    },
    {
      "@type": "Property",
      "displayName": "Brightness Level",
      "description": "The brightness level for the light on the device. Can be specified as 1 (high), 2 (medium), 3 (low)",
      "name": "brightness",
      "writable": true,
      "schema": "long"
    },
    {
      "@type": [
        "Telemetry",
        "SemanticType/Temperature"
      ],
      "description": "Current temperature on the device",
      "displayName": "Temperature",
      "name": "temp",
      "schema": "double",
      "unit": "Units/Temperature/fahrenheit"
    },
    {
      "@type": [
        "Telemetry",
        "SemanticType/Humidity"
      ],
      "description": "Current humidity on the device",
      "displayName": "Humidity",
      "name": "humid",
      "schema": "double",
      "unit": "Units/Humidity/percent"
    },
    {
      "@type": "Command",
      "description": "This command will begin blinking the LED for given time interval.",
      "name": "blink",
      "commandType": "synchronous",
      "request": {
        "name": "interval",
        "schema": "long"
      },
      "response": {
        "name": "blinkResponse",
        "schema": {
          "@type": "Object",
          "fields": [
            {
              "name": "description",
              "schema": "string"
            }
          ]
        }
      }
    },
    {
      "@type": "Command",
      "name": "turnon",
      "comment": "This Commands will turn-on the LED light on the device.",
      "commandType": "synchronous"
    },
    {
      "@type": "Command",
      "name": "turnoff",
      "comment": "This Commands will turn-off the LED light on the device.",
      "commandType": "synchronous"
    },
    {
      "@type": "Command",
      "name": "rundiagnostics",
      "comment": "This command initiates a diagnostics run.  This will take time and is implemented as an asynchronous command",
      "commandType": "asynchronous"
    }
  ],
  "@context": "http://azureiot.com/v1/contexts/IoTModel.json"
}`;

const environmentalId = JSON.parse(environmentalModel)['@id'];

const propertyUpdateHandler = (interfaceInstance, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
  interfaceInstance[propertyName].report(desiredValue, {
    code: 200,
    description: 'helpful descriptive text',
    version: version
  })
    .then(() => console.log('updated the property'))
    .catch(() => console.log('failed to update the property'));
};

const commandHandler = (request, response) => {
  console.log('received command: ' + request.commandName + ' for interfaceInstance: ' + request.interfaceInstanceName);
  response.acknowledge(200, 'helpful response text')
    .then(() => console.log('acknowledgement succeeded.'))
    .catch(() => console.log('acknowledgement failed'));
};

const modelDefinitionHandler = (request, response) => {
  console.log('received command: ' + request.commandName + ' for interfaceInstance: ' + request.interfaceInstanceName);
  //
  // The model definition interface only supports one command.  The
  // getModelDefinition.
  //
  // Its only argument is an 'id'.
  //
  // Make sure that the id matches what the model id is.
  //
  console.log('Payload is: ' + request.payload);
  if (request.payload !== environmentalId) {
    response.acknowledge(404, null)
      .then(console.log('Successfully sent the not found error for command ' + request.payload))
      .catch((err) => {
        console.log('The failure response to the getModelDefinition failed to send.  Error is: ' + err.toString());
      });
  } else {
    response.acknowledge(200, JSON.parse(environmentalModel))
      .then(console.log('Successfully sent the model.'))
      .catch((err) => {
        console.log('The response to the getModelDefinition failed to send.  Error is: ' + err.toString());
      });
  }
};

const environmentalSensor = new EnvironmentalSensor('environmentalSensor', propertyUpdateHandler, commandHandler);
const deviceInformation = new DeviceInformation('deviceInformation');
const modelDefinition = new ModelDefinition('urn_azureiot_ModelDiscovery_ModelDefinition', null, modelDefinitionHandler);

const deviceClient = DeviceClient.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Mqtt);

const capabilityModel = 'urn:azureiot:samplemodel:1';

async function main() {
  const digitalTwinClient = new DigitalTwinClient(capabilityModel, deviceClient);
  digitalTwinClient.addInterfaceInstance(environmentalSensor);
  digitalTwinClient.addInterfaceInstance(deviceInformation);
  digitalTwinClient.addInterfaceInstance(modelDefinition);
  await digitalTwinClient.register();

  // report all of the device information.
  await deviceInformation.manufacturer.report('Contoso Device Corporation');
  await deviceInformation.model.report('Contoso 4762B-turbo');
  await deviceInformation.swVersion.report('3.1');
  await deviceInformation.osName.report('ContosoOS');
  await deviceInformation.processorArchitecture.report('4762');
  await deviceInformation.processorManufacturer.report('Contoso Foundries');
  await deviceInformation.totalStorage.report('64000');
  await deviceInformation.totalMemory.report('640');
  console.log('Done sending device Information');

  // report a property
  await environmentalSensor.state.report(true);
  console.log('reported state property online as true');

  // send telemetry every 5 seconds
  setInterval( async () => {
    await environmentalSensor.sendTelemetry( { temp: 10 + (Math.random() * 90), humid: 1 + (Math.random() * 99) } );
  }, 5000);
};

main();
