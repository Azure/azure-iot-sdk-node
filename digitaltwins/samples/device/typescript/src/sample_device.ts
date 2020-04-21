import { DigitalTwinClient, CommandCallback, CommandRequest, CommandResponse, PropertyChangedCallback, BaseInterface } from 'azure-iot-digitaltwins-device';
import { EnvironmentalSensor } from './environmentalinterface';
import { DeviceInformation } from './deviceInformationInterface';
import { SampleExit } from './exitInterface';


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
      });
      break;
    }
  }
};

const environmentReadWriteCallback: PropertyChangedCallback = (interfaceObject: BaseInterface, propertyName: string, reportedValue: any, desiredValue: any, version: number) => {
  dtClient.report(interfaceObject, { [propertyName]: desiredValue + ' the boss' }, {version: version, code: 200, description: 'a promotion'}, (err?: Error) => {
    if (err) {
      console.log('did not do the update');
    } else {
      console.log('The update worked!!!!');
    }
  });
};

const exitHandler = (request: CommandRequest, response: CommandResponse) => {
  console.log('received command: ' + request.commandName + ' for component: ' + request.componentName);
  response.acknowledge(200, null, (err?: Error) => {
    if (err) {
      console.log('Acknowledge failed. Error is: ' + err.toString());
    }
    setTimeout(() => {process.exit(0);}, 2000);
  });
};

const environmentalSensor = new EnvironmentalSensor('environmentalSensor', environmentReadWriteCallback, environmentCommandCallback );
const deviceInformation = new DeviceInformation('deviceInformation');
const exitInterface = new SampleExit('dtmi_azureiot_azureiotsdknode_SampleInterface_SampleExit', undefined, exitHandler);

const rootInterfaceId = 'dtmi:contoso_device_corp:samplemodel;1';
let dtClient = DigitalTwinClient.fromConnectionString(rootInterfaceId, process.env.DEVICE_CONNECTION_STRING as string);

const main = async () => {
  try {
    await dtClient.report(environmentalSensor, {state: true});
    await dtClient.report(deviceInformation, {
      manufacturer: 'Contoso Device Corporation',
      model: 'Contoso 4762B-turbo',
      swVersion: '3.1',
      osName: 'ContosoOS',
      processorArchitecture: '4762',
      processorManufacturer: 'Contoso Foundries',
      totalStorage: '64000',
      totalMemory: '640'
    });

    // send telemetry every 5 seconds
    setInterval( async () => {
      await dtClient.sendTelemetry( environmentalSensor, { temp: 10 + (Math.random() * 90), humid: 1 + (Math.random() * 99) } );
    }, 5000);
  } catch (err) {
    console.log('error from operation is: ' + err.toString());
  }
};

dtClient.addComponents(environmentalSensor, deviceInformation, exitInterface);

dtClient.enableCommands();

dtClient.enablePropertyUpdates()
  .then(() => {
    console.log('enabled the property updates.');
    main();
  })
  .catch(() => {console.log('the registration failed.');});
