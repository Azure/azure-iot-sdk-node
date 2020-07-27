# Azure IoT Device Client Library

The Azure IoT Device Client Library provides an efficient and well tested API for connecting and using devices with the Azure IoT Hub.

## client.setOptions(options, [callback])

Used directly after creating the Device Client to set options on the client. These should not be dynamically altered during runtime of the device client.

### Available Options

- `ca`: Public certificate in PEM form for certificate authority being used by the Hub service.  This is the CA that the hub is using to secure TLS connections and the client validates the connection using this public cert in order to validate the identity of the hub.  If you are connecting to an Azure IoT Hub inside of an Azure data center, you do not need to set this.  If you are connecting to some other hub (e.g. an EdgeHub), then you may need to set this to the server cert that the hub uses for TLS.
- `keepalive`: Keepalive interval in numeric format (seconds). This controls the keepalive ping for MQTT specifically. If you are using AMQP or HTTP, this will do nothing.
- `productInfo`: Custom user defined information to be appended to existing User Agent information. The User Agent Identification information is used predominantly by Microsoft internally for identifying metadata related to Device Client usage for Azure IoT.
- `modelId`: !!Digital Twin Use Only!! String used in MQTT username setting the Digital Twin modelId.
- `tokenRenewal`: Optional object with token renewal values.  Only use with authentication that uses pre shared keys.
- `mqtt`: Options object specific to the MQTT transport
    - `webSocketAgent`: [Agent](https://nodejs.org/api/https.html#https_class_https_agent) object to use with MQTT-WS connections. Can be used for tunneling proxies.
- `http`: Options object specific to the HTTP transport
    - `agent`: [Agent](https://nodejs.org/api/https.html#https_class_https_agent) object to use with HTTP connections. Can be used for tunneling proxies.
    - `receivePolicy`: Configuration parameters to use for receive polling.
        - `interval`: Interval **in seconds** at which the Azure IoT hub is going to be polled.
        - `at`: Use this option to configure the receiver to receive only once at a specific time.
        - `cron`: Use a cron-formatted string.
        - `manualPolling`: Does not poll and instead rely on the user calling the `receive` method.
        - `drain`: Boolean indicating whether only one message should be received all messages should be drained.
- `amqp`: Options object specific to the AMQP transport
    - `webSocketAgent`: [Agent](https://nodejs.org/api/https.html#https_class_https_agent) object to use with AMQP-WS connections. Can be used for tunneling proxies.
- `cert`: X.509 Certificate.
- `key`: Key associated with the X.509 certificate.
- `passphrase`: Passphrase used to decode the key associated with the X.509 certificate.
- `clientCertEngine`: Name of an OpenSSL engine which can provide the client certificate.

**Note:** For nested options (i.e. `webSocketAgent`), this indicates they are contained within the object they are under. Ex:

```js
await client.setOption({mqtt: {webSocketAgent: myCustomHTTPSAgent}})
```