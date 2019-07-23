// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;

const interfaceId = '<INTERFACE_ID_GOES_HERE>'; // suggestion to find your environmental sensor: urn:contoso:com:EnvironmentalSensor:1

async function main() {
  const registryClient = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
  const query = registryClient.createQuery('SELECT * from devices  WHERE has_interface(\'' + interfaceId + '\')');
  while (query.hasMoreResults) {
    const queryResponse = await query.next(query.continuationToken);
    queryResponse.result.forEach((device) => console.log(device.deviceId));
  }
}

main();
