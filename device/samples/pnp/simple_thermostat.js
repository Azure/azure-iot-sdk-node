// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
var ProvProtocol = require('azure-iot-provisioning-device-mqtt').Mqtt;

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

// To see the dtdl of for this https://github.com/Azure/opendigitaltwins-dtdl

// String containing Hostname, Device Id & Device Key in the following formats:
//  'HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>'
var deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;

// DPS connection information
var provisioningHost = process.env.PROVISIONING_HOST;
var idScope = process.env.PROVISIONING_IDSCOPE;
var registrationId = process.env.PROVISIONING_REGISTRATION_ID;
var symmetricKey = process.env.PROVISIONING_SYMMETRIC_KEY;

const modelId = 'dtmi:com:example:Thermostat;1';
const telemetrySendInterval = 10000;
let intervalToken;
let currTemp = 1 + (Math.random() * 90);
let targetTemp = currTemp;
let maxTemp = currTemp+10;

const commandNameReboot = 'reboot';

const propertyUpdateHandler = (deviceTwin, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for component and property: ' + propertyName + ' with value: ' + JSON.stringify(desiredValue));
  const patch = helperCreateReportedPropertiesPatch(
    { [propertyName]: desiredValue },
    {
      code: 200,
      description: 'Successfully executed patch for ' + propertyName,
      version: version
    }
  );
  updateComponentReportedProperties(deviceTwin, patch);
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
      propertyUpdateHandler(deviceTwin, propertyName, null, propertyValue.value, deviceTwin.properties.desired[versionProperty]);
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

async function provisionDevice(payload) {
  var provSecurityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey);
  var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvProtocol(), provSecurityClient);

  if (!!(payload)) {
    provisioningClient.setProvisioningPayload(payload);
  }

  provisioningClient.register(function(err, result) {
    if (err) {
      console.log("error registering device: " + err);
    } else {
      deviceConnectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
      console.log('registration succeeded');
      console.log('assigned hub=' + result.assignedHub);
      console.log('deviceId=' + result.deviceId);
      console.log('payload=' + JSON.stringify(result.payload));
    }
  });
  console.log('conn string: '+deviceConnectionString);

  // try {
  //   let result = provisioningClient.register();
  //   deviceConnectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
  //   console.log('registration succeeded');
  //   console.log('assigned hub=' + result.assignedHub);
  //   console.log('deviceId=' + result.deviceId);
  //   console.log('payload=' + JSON.stringify(result.payload));
  // } catch (err) {
  //   console.error("error registering device: " + err.toString());
  // }
}

async function main() {
  // If the user include a provision host then use DPS
  if (!!(provisioningHost)) {
    await provisionDevice();
  }

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

    // Deal with twin
    try {
      resultTwin = await client.getTwin();
      const patchRoot = helperCreateReportedPropertiesPatch({serialNumber:'alohomora'}, null);
      const patchThermostat = helperCreateReportedPropertiesPatch({
        targetTemperature: {'value': targetTemp, 'ac': 200, 'ad': '', 'av': 1},
        maxTempSinceLastReboot: maxTemp,
      }, null);

      // the below things can only happen once the twin is there
      updateComponentReportedProperties(resultTwin, patchRoot);
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