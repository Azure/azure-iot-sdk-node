// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  'HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>'
const deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;

const modelId = 'dtmi:com:example:TemperatureController;1';
const messageSubjectProperty = '$.sub';
const thermostat1ComponentName = 'thermostat1';
const thermostat2ComponentName = 'thermostat2';
const deviceInfoComponentName = 'deviceInformation';
const commandComponentCommandNameSeparator = '*';
let intervalToken1;
let intervalToken2;
let intervalToken3;

const commandNameGetMaxMinReport1 = thermostat1ComponentName + commandComponentCommandNameSeparator + 'getMaxMinReport';
const commandNameGetMaxMinReport2 = thermostat2ComponentName + commandComponentCommandNameSeparator + 'getMaxMinReport';
const commandNameReboot = 'reboot';

const commandHandler = async (request, response) => {
  helperLogCommandRequest(request);
  switch (request.methodName) {
  case commandNameGetMaxMinReport1: {
    await sendCommandResponse(request, response, 200, 'max min report from thermostat 1');
    break;
  }
  case commandNameGetMaxMinReport2: {
    await sendCommandResponse(request, response, 200, 'max min report from thermostat 2');
    break;
  }
  case commandNameReboot: {
    await sendCommandResponse(request, response, 200, 'reboot response');
    break;
  }
  default:
    await sendCommandResponse(request, response, 404, 'unknown method');
    break;
  }
};

const sendCommandResponse = async (request, response, status, payload) => {
  try {
    await response.send(status, payload);
    console.log('Response to method \'' + request.methodName +
              '\' sent successfully.' );
  } catch (err) {
    console.error('An error ocurred when sending a method response:\n' +
              err.toString());
  }
};

const helperLogCommandRequest = (request) => {
  console.log('Received command request for comand name \'' + request.methodName + '\'');

  if (!!(request.payload)) {
    console.log('The command request paylaod :');
    console.log(request.payload);
  }
};


const helperCreateReportedPropertiesPatch = (propertiesToReport, componentName) => {
    let patch;
    if (!!(componentName)) {
      patch = { };
      propertiesToReport.__t = "c";
      patch[componentName] = propertiesToReport;
    }
    else {
      patch = { };
      patch = propertiesToReport;
      }
    if (!!(componentName)) {
    console.log('The following properties will be updated for component:' + componentName);
    }
    else{
      console.log('The following properties will be updated for root interface:');
    }
    console.log(patch);
    return patch;
  };

const updateComponentReportedProperties = (deviceTwin, patch, componentName) => {
  let logLine;
  if (!!(componentName))
  {
    logLine = 'Properties have been reported for component:' + componentName;
  }
  else{
    logLine = 'Properties have been reported for root interface';
  }
  deviceTwin.properties.reported.update(patch, function (err) {
    if (err) throw err;
    console.log(logLine);
  });
};

const helperAttachHandlerForDesiredPropertyPatches = (deviceTwin) => {

  deviceTwin.on('properties.desired', (delta) => {
    if (delta[thermostat1ComponentName] || delta[thermostat2ComponentName] || delta[deviceInfoComponentName]) {
    const version = delta.$version;
    const componentName = Object.keys(delta)[0];
    let logLine;
    if (!!(componentName))
    {
      logLine = 'Received an update for component: ' + componentName + ' with value: ' + JSON.stringify(delta);
    }
    else{
      logLine = 'Received an update for root interface with value: ' + JSON.stringify(delta);
    }
    console.log(logLine);
    const patch = { [componentName]: {} };
    Object.entries(delta[componentName]).forEach(([propertyName, propertyValue]) => {
      if (propertyName !== '__t'){
        const propertyContent = { value: propertyValue };
        propertyContent.ac = 200;
        propertyContent.ad = 'Successfully executed patch';
        propertyContent.av = version;
        
        patch[componentName][propertyName] = propertyContent;
    }});
    updateComponentReportedProperties(deviceTwin, patch, componentName);
 }});
};

const helperAttachExitListener = async (deviceClient) => {
  const standardInput = process.stdin;
  standardInput.setEncoding('utf-8');
  console.log('Please enter q or Q to exit sample.');
  standardInput.on('data', (data) => {
    if (data === 'q\n' || data === 'Q\n') {
      console.log('Clearing intervals and exiting sample.');
      clearInterval(intervalToken1);
      clearInterval(intervalToken2);
      clearInterval(intervalToken3);
      deviceClient.close();
      process.exit();
    } else {
      console.log('User Input was : ' + data);
      console.log('Please only enter q or Q to exit sample.');
    }
  });
};
async function sendTemperatureTelemetry(deviceClient, componentName, index) {
  console.log('Sending telemetry message %d from component %s ', index, componentName);
  
  const data = JSON.stringify({ temperature: 1 + (Math.random() * 90)});
  const pnpMsg = new Message(data);
  if (!!(componentName))
  {
    pnpMsg.properties.add(messageSubjectProperty, componentName);
  }
  pnpMsg.contentType = 'application/json';
  pnpMsg.contentEncoding = 'utf-8';
  await deviceClient.sendEvent(pnpMsg);
}

async function sendDatasizeTelemetry(deviceClient, componentName, index) {
  console.log('Sending telemetry message %d from root interface', index);
  const data = JSON.stringify({ workingset: 1 + (Math.random() * 90)});
  const pnpMsg = new Message(data);
  if (!!(componentName))
  {
    pnpMsg.properties.add(messageSubjectProperty, componentName);
  }
  pnpMsg.contentType = 'application/json';
  pnpMsg.contentEncoding = 'utf-8';
  await deviceClient.sendEvent(pnpMsg);
}

async function main() {
  // fromConnectionString must specify a transport, coming from any transport package.
  const client = Client.fromConnectionString(deviceConnectionString, Protocol);
  console.log('Connecting using connection string ' + deviceConnectionString);
  let resultTwin;

  try {
    // Add the modelId here
    await client.setOptions({ modelId: modelId });
    await client.open();
    console.log('Enabling the commands on the client');
    client.onDeviceMethod(commandNameGetMaxMinReport1, commandHandler);
    client.onDeviceMethod(commandNameGetMaxMinReport2, commandHandler);
    client.onDeviceMethod(commandNameReboot, commandHandler);

    // Send Telemetry after some interval
    let index1 = 0;
    let index2 = 0;
    let index3 = 0;
    intervalToken1 = setInterval(() => {
      sendTemperatureTelemetry(client, thermostat1ComponentName, index1).catch((err) => console.log('error', err.toString()));
      index1 += 1;
    }, 5000);

    intervalToken2 = setInterval(() => {
      sendTemperatureTelemetry(client, thermostat2ComponentName, index2).catch((err) => console.log('error', err.toString()));
      index2 += 1;
    }, 5500);


    intervalToken3 = setInterval(() => {
      sendDatasizeTelemetry(client, null, index3).catch((err) => console.log('error', err.toString()));
      index3 += 1;
    }, 6000);

    // attach a standard input exit listener
    helperAttachExitListener(client);

    try {
      resultTwin = await client.getTwin();
      const patchRoot = helperCreateReportedPropertiesPatch({serialNumber:"alohomora"}, null, false);
      const patchThermostat1Info = helperCreateReportedPropertiesPatch({
        targetTemperature: {"value": 56.78, "ac": 200, "ad": "wingardium leviosa", "av": 1},
        maxTempSinceLastReboot: 67.89,
      }, thermostat1ComponentName);

      const patchThermostat2Info = helperCreateReportedPropertiesPatch({
        targetTemperature: {"value": 35.67, "ac": 200, "ad": "expecto patronum", "av": 1},
        maxTempSinceLastReboot: 98.65,
      }, thermostat2ComponentName);
      // console.log(resultTwin)
      const patchDeviceInfo = helperCreateReportedPropertiesPatch({
        manufacturer: 'Contoso Device Corporation',
        model: 'Contoso 47-turbo',
        swVersion: '10.89',
        osName: 'Contoso_OS',
        processorArchitecture: 'Contoso_x86',
        processorManufacturer: 'Contoso Industries',
        totalStorage: 65000,
        totalMemory: 640,
      }, deviceInfoComponentName);

      // the below things can only happen once the twin is there
      updateComponentReportedProperties(resultTwin, patchRoot, null);
      updateComponentReportedProperties(resultTwin, patchThermostat1Info, thermostat1ComponentName);
      updateComponentReportedProperties(resultTwin, patchThermostat2Info, thermostat2ComponentName);
      updateComponentReportedProperties(resultTwin, patchDeviceInfo, deviceInfoComponentName);
      helperAttachHandlerForDesiredPropertyPatches(resultTwin);
    } catch (err) {
      console.error('could not retrieve twin or report twin properties\n' + err.toString());
    }
  } catch (err) {
    console.error('could not connect pnp client or could not attach interval function for telemetry\n' + err.toString());
  }
}

main().then(()=> console.log('executed sample')).catch((err) => console.log('error', err));
