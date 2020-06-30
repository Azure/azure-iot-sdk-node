// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  'HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>'
const deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;

const modelId = 'dtmi:com:example:simplethermostat;1';
const messageSubjectProperty = '$.sub';
//const commandSeparator = '*';
const telemetrySendInterval = 10000;
let intervalToken;
let currTemp = 1 + (Math.random() * 90);
let targetTemp = currTemp;

const commandNameReboot = 'reboot';

const propertyUpdateHandler = (deviceTwin, componentName, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for component: ' + componentName + ' and property: ' + propertyName + ' with value: ' + JSON.stringify(desiredValue));
  const patch = helperCreateReportedPropertiesPatch(
    { [propertyName]: desiredValue },
    componentName,
    {
      code: 200,
      description: 'Successfully executed patch for ' + propertyName,
      version: version
    }
  );
  updateComponentReportedProperties(deviceTwin, patch, componentName);
  console.log('updated the property');
};

const commandHandler = async (request, response) => {
  helperLogCommandRequest(request);
  switch (request.methodName) {
  case commandNameReboot: {
    console.log('Rebooting after ' + request.payload);
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

const helperCreateReportedPropertiesPatch = (propertiesToReport) => {
  const patch = { };

  // Construct the Patch json
  Object.keys(propertiesToReport).forEach((propertyName) => {
    patch[propertyName] = propertiesToReport[propertyName];
  });
  console.log('The following properties will be updated for component');
  console.log(patch);
  return patch;
};

const updateComponentReportedProperties = (deviceTwin, patch) => {
  deviceTwin.properties.reported.update(patch, function (err) {
    if (err) throw err;
    console.log('Properties have been reported for component');
  });
};

const helperAttachHandlerForDesiredPropertyPatches = (deviceTwin) => {
  const versionProperty = '$version';
  deviceTwin.on('properties.desired.', (delta) => {
    Object.entries(delta).forEach(([propertyName, propertyValue]) => {
      propertyUpdateHandler(deviceTwin, componentName, propertyName, null, propertyValue.value, deviceTwin.properties.desired[versionProperty]);
    });
  });
};

const helperAttachExitListener = async (deviceClient) => {
  const standardInput = process.stdin;
  standardInput.setEncoding('utf-8');
  console.log('Please enter q or Q to exit sample.');
  standardInput.on('data', (data) => {
    if (data === 'q\n' || data === 'Q\n') {
      console.log('Clearing intervals and exiting sample.');
      clearInterval(intervalToken);
      deviceClient.close();
      process.exit();
    } else {
      console.log('User Input was : ' + data);
      console.log('Please only enter q or Q to exit sample.');
    }
  });
};

async function sendTelemetry(deviceClient, index) {
  console.log('Sending telemetry message %d...', index);
  currTemp = 1 + (Math.random() * 90);
  const data = JSON.stringify({ temperature: currTemp });
  const pnpMsg = new Message(data);
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
    client.onDeviceMethod(commandNameReboot, commandHandler);

    // Send Telemetry every 5.5 secs
    let index = 0;
    intervalToken = setInterval(() => {
      sendTelemetry(client, index).catch((err) => console.log('error', err.toString()));
      index += 1;
    }, telemetrySendInterval);

    // attach a standard input exit listener
    helperAttachExitListener(client);

    try {
      resultTwin = await client.getTwin();
      const patchThermostat = helperCreateReportedPropertiesPatch({
        targetTemperature: targetTemp,
        currentTemperature: currTemp,
      });

      // the below things can only happen once the twin is there
      updateComponentReportedProperties(resultTwin, patchThermostat);
      helperAttachHandlerForDesiredPropertyPatches(resultTwin);
    } catch (err) {
      console.error('could not retrieve twin or report twin properties\n' + err.toString());
    }
  } catch (err) {
    console.error('could not connect pnp client or could not attach interval function for telemetry\n' + err.toString());
  }
}

main().then(()=> console.log('executed sample')).catch((err) => console.log('error', err));