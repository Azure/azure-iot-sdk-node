'use strict';


var ModuleClient = require('azure-iot-device').ModuleClient;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;

ModuleClient.fromEnvironment(Mqtt, (err, client) => {
    if (err) {
        console.error(err.toString());
        process.exit(-1);
    } else {
        client.invokeMethod('pierreca-edge-test', 'methodTarget', {
            methodName: 'doSomethingInteresting',
            payload: 'foo',
            responseTimeoutInSeconds: 5,
            connectTimeoutInSeconds: 2
        }, (err, resp) => {
            if (err) {
                console.error(err.toString());
                process.exit(-1);
            } else {
                console.log(JSON.stringify(resp, null, 2));
                process.exit(0);
            }
        });
    }
});