// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { DigitalTwinServiceClient } from 'azure-iot-digitaltwins-service';
import { IoTHubTokenCredentials } from 'azure-iot-digitaltwins-service';

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get the Digital Twin
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
const deviceId = process.env.IOTHUB_DEVICE_ID || '';
const connString = process.env.IOTHUB_CONNECTION_STRING || '';
const metadata = '$metadata';
const model = '$model';

async function asyncMain() { 
  try {
    const dtServiceClient = new DigitalTwinServiceClient(new IoTHubTokenCredentials(connString));
    const twin = await dtServiceClient.getDigitalTwin(deviceId);
    if (!!(twin)) {
      console.log(twin[metadata][model]);
    }
  }
  catch (err) {
      console.log(err);
  }
}

asyncMain();
