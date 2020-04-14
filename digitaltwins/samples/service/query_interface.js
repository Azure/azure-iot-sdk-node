// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const componentName = process.env.IOTHUB_COMPONENT_NAME; // suggestion to find your environmental sensor: 'urn:contoso:com:EnvironmentalSensor'
const componentVersion = 1; // replace this with the version number you want. we suggest to start with 1 :);

async function main() {
  const registryClient = Registry.fromConnectionString(connectionString);
  console.log('querying devices that have interface ' + componentName + '...');
  const query = registryClient.createQuery(`SELECT * from devices  WHERE has_interface('${componentName}', ${componentVersion})`);
  while (query.hasMoreResults) {
    const queryResponse = await query.next(query.continuationToken);
    queryResponse.result.forEach((device) => console.log(device.deviceId));
  }
}

main();
