// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;

const Client = require('azure-iot-device').Client;
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;

// create the IoTHub client
const client = Client.fromConnectionString(deviceConnectionString, Protocol);
console.log('got client');

// connect to the hub
// eslint-disable-next-line security/detect-non-literal-fs-filename
client.open(function (err) {
  if (err) {
    console.error('could not open IotHub client');
  }  else {
    console.log('client opened');

    // Create device Twin
    client.getTwin(function (err, twin) {
      if (err) {
        console.error('could not get twin');
      } else {
        console.log('twin created');

        // First, set up code to handle desired property changes.

        // Important note: when the twin is done being created, the desired
        // properties have already been retrieved from the service.  When we
        // add these handlers, there is a chance that the handlers will be called
        // almost immediately if the relevant properties have already been
        // retrieved from the service. In this way "property change" could mean
        // "the property is changing from one value to another value", or it could
        // mean "the property is changing from being unset to being set."
        //
        // There are 4 examples here. The app developer has the option to chose
        // which sample style to use (or mix and match). All of the events
        // shown here will fire and it's up to the app developer to decide what
        // to listen for.
        //
        // If there is a collision between different handlers, it is up to the
        // app developer to resolve the collisions.  In other words, there is
        // nothing that stops the developer from writing two different handlers
        // that process the same properties at different levels.
        //

        // ATTENTION!
        // You will need to send the desired properties updates from a separate
        // backend service. We have created a helper service for you in the
        // 'helpers/device-twin-service' directory. See readme for instructions.

        // Usage example #1: receiving all patches with a single event handler.
        //
        // This code will output any properties that are received from the
        // service.
        //
        twin.on('properties.desired', function (delta) {
            console.log('new desired properties received:');
            console.log(JSON.stringify(delta));
        });

        // Usage example #2: receiving an event if anything under
        // properties.desired.climate changes
        //
        // This code will output desired min and max temperature every time
        // the service updates either one.
        //
        // Example patch document for service API code:
        // const twinPatch1 = {
        //  properties: {
        //    desired: {
        //      climate: { minTemperature: 68, maxTemperature: 76, },
        //    },
        //  },
        // };
        //
        twin.on('properties.desired.climate', function (delta) {
            //
            // Notice that twin.properties.desired has already been updated before
            // this function was called.
            //
            // If the delta contains a minTemp or a maxTemp, then update the
            // hardware with the values stored in the twin.  The twin has all the
            // same values as the delta, but the delta only has values that
            // have changed.  When we need the "current values", we don't use the
            // values stored in the delta because it's possible that the delta has
            // one or the other, but not both.
            //
            if (delta.minTemperature || delta.maxTemperature) {
              console.log('updating desired temp:');
              console.log('min temp = ' + twin.properties.desired.climate.minTemperature);
              console.log('max temp = ' + twin.properties.desired.climate.maxTemperature);
            }
        });

        // Usage example #3: receiving an event for a single (scalar) property
        // value. This event is only fired if the fanOn boolean value is part
        // of the patch.
        //
        // This code will output the new desired fan state whenever the service
        // updates it.
        //
        // Example patch document for service API code:
        // const twinPatch2 = {
        //  properties: {
        //    desired: {
        //      climate: {
        //        hvac: {
        //          systemControl: { fanOn: true, },
        //        },
        //      },
        //    },
        //  },
        //};

        twin.on('properties.desired.climate.hvac.systemControl', function (fanOn) {
            console.log('setting fan state to ' + fanOn);
        });

        // Usage example #4: handle add or delete operations. The app developer
        // is responsible for inferring add/update/delete operations based on
        // the contents of the patch.
        //
        // This code will output the results of adding, updating, or deleting
        // modules.
        //
        // Add example - patch document for service API code:
        // const twinPatch3 = {
        //  properties: {
        //    desired: {
        //      modules : {
        //        wifi : { channel: 6, ssid: 'my_network' },
        //        climate : { id: 17, units: 'fahrenheit' }
        //      }
        //    }
        //  }
        // }
        //
        // Update example - patch document for service API code:
        // const twinPatch4 = {
        //  properties: {
        //    desired: {
        //      modules : {
        //        wifi : { channel: 7, encryption: 'wpa', passphrase: 'foo' }
        //      }
        //    }
        //  }
        //}
        //
        // Delete example - patch document for service API code:
        // const twinPatch5 = {
        //  properties: {
        //    desired: {
        //      modules : { climate: null }
        //    }
        //  }
        // }

        // To do this, first we have to keep track of "all modules that we know
        // about".
        let moduleList = {};

        // Then we use this internal list and compare it to the delta to know
        // if anything was added, removed, or updated.
        twin.on('properties.desired.modules', function (delta) {
          Object.keys(delta).forEach(function (key) {

            if (delta[key] === null && moduleList[key]) {
              // If our patch contains a null value, but we have a record of
              // this module, then this is a delete operation.
              console.log('deleting module ' + key);
              delete moduleList[key];

            } else if (delta[key]) {
              if (moduleList[key]) {
                // Our patch contains a module, and we've seen this before.
                // Must be an update operation.
                console.log('updating module ' + key + ':');
                console.log(JSON.stringify(delta[key]));
                // Store the complete object instead of just the delta
                moduleList[key] = twin.properties.desired.modules[key];

              } else {
                // Our patch contains a module, but we've never seen this
                // before.  Must be an add operation.
                console.log('adding module ' + key + ':');
                console.log(JSON.stringify(delta[key]));
                // Store the complete object instead of just the delta
                moduleList[key] = twin.properties.desired.modules[key];
              }
            }
          });
        });

        // create a patch to send to the hub
        const patch = {
          firmwareVersion:'1.2.1',
          weather:{ temperature: 72, humidity: 17 }
        };

         // send the patch to update reported properties
        twin.properties.reported.update(patch, function (err) {
          if (err) throw err;
          console.log('twin state reported');
        });
      }
    });
  }
});
