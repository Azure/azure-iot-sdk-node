// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;
const DeviceInformation = require('./deviceInformation').DeviceInformation;
const ModelDefinition = require('./modelDefinition').ModelDefinition;

const environmentalId = 'urn:contoso:com:EnvironmentalSensor:1';
let digitalTwinClient;


const propertyUpdateHandler = async (interfaceInstance, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
  try {
    await digitalTwinClient.report(interfaceInstance, propertyName, desiredValue, {
      code: 200,
      description: 'helpful descriptive text',
      version: version
    });
    console.log('updated the property');
  } catch (e) {
    console.log('failed to update the property'))
  }
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

const capabilityModel = 'urn:azureiot:samplemodel:1';

async function main() {
  // mqtt is implied in this static method
  digitalTwinClient = DigitalTwinClient.fromConnectionString(capabilityModel, process.env.DEVICE_CONNECTION_STRING);


  // TBC: Do we create these inline
  await digitalTwinClient.addInterfaceInstances(
    environmentalSensor,
    deviceInformation,
    modelDefinition
  );

  // // either one of these would cause the device to call open, or the report.
  // // device could do report / telemetry before these enables.
  // // enablePropertyUpdates
  await digitalTwinClient.enableCommands();
  await digitalTwinClient.enablePropertyUpdates();

  // report all of the device information.
  // TBC: Should 1st parameter be the interface or the ID
  await digitalTwinClient.report(deviceInformation, {
    manufacturer: 'Contoso Device Corporation',
    model: 'Contoso 47-turbo',
    swVersion: '3.1',
    osName: 'ContosoOS',
    processorArchitecture: 'Cotosox86',
    processorManufacturer: 'Contoso Industries',
    totalStorage: 65000,
    totalMemory: 640,
  });

  await digitalTwinClient.report(environmentalSensor, { state: true });

  // send telemetry every 5 seconds
  setInterval( async () => {
    await digitalTwinClient.sendTelemetry(environmentalSensor, { temp: 1 + (Math.random() * 90), humid: 1 + (Math.random() * 99) });
  }, 5000);
};

main();
