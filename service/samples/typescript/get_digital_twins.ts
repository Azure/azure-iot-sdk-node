// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { DigitalTwinClient } from 'azure-iothub';
import { IoTHubTokenCredentials } from 'azure-iothub';

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinClient constructor
// - get the Digital Twin
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
const deviceId = process.env.IOTHUB_DEVICE_ID || '';
const connectionString = process.env.IOTHUB_CONNECTION_STRING || '';
const metadata = '$metadata';
const model = '$model';

async function asyncMain(): Promise<void> {
  const digitalTwinClient = new DigitalTwinClient(new IoTHubTokenCredentials(connectionString));
  const deviceTwin = await digitalTwinClient.getDigitalTwin(deviceId);

  // Print the response
  if (!!(deviceTwin)) {
    console.log(deviceTwin[metadata][model]);
  }
}

asyncMain().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});
