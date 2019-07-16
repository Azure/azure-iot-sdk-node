import { Client } from 'azure-iot-device';
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { DigitalTwinClient, CommandCallback, ReadWritePropertyChangedCallback, BaseInterface } from 'azure-iot-digitaltwin-device';
import { DigitalTwinInterface as EnvironmentalSensor } from './environmentalinterface';
import { DigitalTwinInterface as SampleDeviceInfo } from './deviceinfointerface';

let environmentCommandCallback: CommandCallback = (request, response) => {
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

let environmentReadWriteCallback: ReadWritePropertyChangedCallback = (interfaceObject: BaseInterface, propertyName: string, reportedValue: any, desiredValue: any, version: number) => {
  interfaceObject[propertyName].update(desiredValue + ' the boss', {responseVersion: version, statusCode: 200, statusDescription: 'a promotion'}, (err: Error) => {
    if (err) {
      console.log('did not do the update');
    } else {
      console.log('The update worked!!!!');
    }
  });
};

let environmentalSensor = new EnvironmentalSensor('environmentalSensor', environmentReadWriteCallback, environmentCommandCallback );
let sampleDeviceInfo = new SampleDeviceInfo('sampleDeviceInfo');

const client = Client.fromConnectionString(process.argv[2], Protocol);

const dcm = 'urn:azureiot:testdevicecapabilitymodel:1';

let dtClient = new DigitalTwinClient(dcm, client);

const main = async () => {
  try {
    await environmentalSensor.humid.send(7.3);
    await environmentalSensor.temp.send(65.5);
    await environmentalSensor.state.report('on');
    await sampleDeviceInfo.fwVersion.report('firmware-revision-1.0.2f');
    await sampleDeviceInfo.manufacturer.report('Sample Manufacturer for Azure IoT C SDK enabled device');
    await sampleDeviceInfo.model.report('Sample Model 123');
    await sampleDeviceInfo.oem.report('Contoso');
    await sampleDeviceInfo.osName.report('sample-OperatingSystem-name');
    await sampleDeviceInfo.osVersion.report('10.0.4c');
    await sampleDeviceInfo.processorArchitecture.report('Contoso-Arch-64bit');
    await sampleDeviceInfo.processorType.report('Contoso-100.x');
    await sampleDeviceInfo.processorManufacturer.report('Processor Manufacturer(TM)');
    await sampleDeviceInfo.totalStorage.report('81920');
    await sampleDeviceInfo.totalMemory.report('32');
    await sampleDeviceInfo.boardManufacturer.report('Board Manufacturer(TM)');
    await sampleDeviceInfo.boardPart.report('boardPart-555');
    await sampleDeviceInfo.serialNumber.report('123-456');
    await sampleDeviceInfo.connectivity.report('LTE, WiFi');
    await sampleDeviceInfo.hwInterface.report('hwInterface-1.4.8c');
    await sampleDeviceInfo.secureHardware.report('TPM');
    await sampleDeviceInfo.batteryRuntime.report('86400');
    await sampleDeviceInfo.batteryRemaining.report('3600');
    // process.exit(1); // Stay running for commands to be processed.
  } catch (err) {
    console.log('error from operation is: ' + err.toString());
  }

};

dtClient.addComponent(environmentalSensor);
dtClient.addComponent(sampleDeviceInfo);

dtClient.register()
  .then(() => {
    console.log('registered the components.');
    main();
  })
  .catch(() => {console.log('the registration failed.');});
