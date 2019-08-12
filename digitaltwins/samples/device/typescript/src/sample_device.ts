import { Client } from 'azure-iot-device';
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { DigitalTwinClient, CommandCallback, CommandRequest, CommandResponse, PropertyChangedCallback, BaseInterface } from 'azure-iot-digitaltwins-device';
import { EnvironmentalSensor } from './environmentalinterface';
import { DeviceInformation } from './deviceinfointerface';
import { ModelDefinition } from './modelDefinition';
import { SampleExit } from './exitInterface';

const environmentalModel = `{
  "@id": "urn:constoso:EnvironmentalSensor:1",
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


const environmentCommandCallback: CommandCallback = (request: CommandRequest, response: CommandResponse) => {
  console.log('Callback for command for environment interface');
  switch (request.commandName) {
    case 'blink': {
      console.log('Got the blink command.');
      response.acknowledge(200, 'blink response', (err?: Error) => {
        if (err) {
          console.log('responding to the blink command failed.');
        }
      });
      break;
    }
    case 'turnOn': {
      console.log('Got the turnOn command.');
      response.acknowledge(200, 'turn on response', (err?: Error) => {
        if (err) {
          console.log('responding to the turnOn command failed.');
        }
      });
      break;
    }
    case 'turnOff': {
      console.log('Got the turnOff command.');
      response.acknowledge(200, 'turn off response', (err?: Error) => {
        if (err) {
          console.log('responding to the blink command failed.');
        }
      });
      break;
    }
    case 'runDiagnostics': {
      console.log('Got the runDiagnostics command.');
      response.acknowledge(200, 'runDiagnostics response', (err?: Error) => {
        if (err) {
          console.log('responding to the runDiagnostics command failed ' + err.toString());
        }
        // response.update(200, 'runDiagnostics updated response', (updateError?: Error) => {
        //   if (updateError) {
        //     console.log('got an error on the update Response ' + updateError.toString());
        //   }
        // });
        response.update(200, 'runDiagnostics updated response')
           .then(() => {
            console.log('in the then for the update.');
           })
           .catch((err: Error) => {console.log('Got an error on the update: ' + err.toString());});
      });
      break;
    }
  }
};

const environmentReadWriteCallback: PropertyChangedCallback = (interfaceObject: BaseInterface, propertyName: string, reportedValue: any, desiredValue: any, version: number) => {
  interfaceObject[propertyName].report(desiredValue + ' the boss', {responseVersion: version, statusCode: 200, statusDescription: 'a promotion'}, (err: Error) => {
    if (err) {
      console.log('did not do the update');
    } else {
      console.log('The update worked!!!!');
    }
  });
};

const modelDefinitionHandler = (request: CommandRequest, response: CommandResponse) => {
  console.log('received command: ' + request.commandName + ' for interfaceInstance: ' + request.interfaceInstanceName);
  //
  // The model definition interface only supports one command.  The
  // getModelDefinition.
  //
  // Its only argument is an 'id'.
  //
  // Make sure that the id matches what the model id is.
  //

  if (request.payload !== environmentalId) {
    response.acknowledge(404, null)
      .then(console.log('Successfully sent the not found.'))
      .catch((err: Error) => {
        console.log('The failure response to the getModelDefinition failed to send.  Error is: ' + err.toString());
      });
  } else {
    response.acknowledge(200, environmentalModel)
      .then(console.log('Successfully sent the model.'))
      .catch((err: Error) => {
        console.log('The response to the getModelDefinition failed to send.  Error is: ' + err.toString());
      });
  }
};

const exitHandler = (request: CommandRequest, response: CommandResponse) => {
  console.log('received command: ' + request.commandName + ' for interfaceInstance: ' + request.interfaceInstanceName);
  response.acknowledge(200, null, (err?: Error) => {
    if (err) {
      console.log('Acknowledge failed. Error is: ' + err.toString());
    }
    setTimeout(() => {process.exit(0);}, 2000);
  });
};

const environmentalSensor = new EnvironmentalSensor('environmentalSensor', environmentReadWriteCallback, environmentCommandCallback );
const deviceInformation = new DeviceInformation('deviceInformation');
const modelDefinition = new ModelDefinition('urn_azureiot_ModelDiscovery_ModelDefinition', undefined, modelDefinitionHandler);
const exitInterface = new SampleExit('urn_azureiotsdknode_SampleInterface_SampleExit', undefined, exitHandler);


const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING as string, Protocol);

const capabilityModel = 'urn:azureiot:samplemodel:1';

let dtClient = new DigitalTwinClient(capabilityModel, client);

const main = async () => {
  try {
    await environmentalSensor.humid.send(7.3);
    await environmentalSensor.temp.send(65.5);
    await environmentalSensor.state.report('on');
    await deviceInformation.manufacturer.report('Contoso Device Corporation');
    await deviceInformation.model.report('Contoso 4762B-turbo');
    await deviceInformation.swVersion.report('3.1');
    await deviceInformation.osName.report('ContosoOS');
    await deviceInformation.processorArchitecture.report('4762');
    await deviceInformation.processorManufacturer.report('Contoso Foundries');
    await deviceInformation.totalStorage.report('64000');
    await deviceInformation.totalMemory.report('640');
  } catch (err) {
    console.log('error from operation is: ' + err.toString());
  }
};

dtClient.addInterfaceInstance(environmentalSensor);
dtClient.addInterfaceInstance(deviceInformation);
dtClient.addInterfaceInstance(modelDefinition);
dtClient.addInterfaceInstance(exitInterface);

dtClient.register()
  .then(() => {
    console.log('registered the interfaceInstances.');
    main();
  })
  .catch(() => {console.log('the registration failed.');});
