// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

require('dotenv').config()
const { Mqtt } = require('azure-iot-device-mqtt');
const { Client } = require('azure-iot-device');


//before finalizing the example I would like to get my questions answered to see if there is truly an issue


const run = async() => {
  try {
    const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Mqtt);

    //get the device twin
    const twin = await client.getTwin()

    console.log('twin properties', twin.properties)

    //Note: When the twin is done being created the desired properties have already been retrieved
    
    //here we listen for updates to the properties.desired
    twin.on('properties.desired', (props) => {
      console.log('on properties.desired', props)
    });

    twin.on('properties.reported', props => {
      console.log('on properties.reported', props)
    });


    //now lets update the reported properties
    const patch = {
      animal : 'cow',
      firmwareAnimalVersion : Math.random().toString()
    }

    twin.properties.reported.update(patch, err => err ? console.error(err) : console.log('properties.reported updated!') )
    

    process.exit(0)
  } catch(err) {
    console.error('Error: ', err)
  }
}

run()
