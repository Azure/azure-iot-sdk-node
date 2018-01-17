# azure-iot-provisioning-device-mqtt

The `Mqtt` and `MqttWs` classes provides the Provisioning Device SDK with a transport for x509 registration flows over Mqtt. It is instantiated by SDK users only to be passed to the `ProvisioningDeviceClient` object and does not have a public API.

# Internal API

These methods are used by the other objects of the SDK but are not public API for the SDK user to call.

## setAuthentication(auth: X509): void

**SRS_NODE_PROVISIONING_MQTT_18_001: [** The certificate and key passed as properties of the `auth` function shall be used to connect to the Device Provisioning Service. **]**

## registrationRequest(request: RegistrationRequest, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void

**SRS_NODE_PROVISIONING_MQTT_18_002: [** If the transport is not connected, `registrationRequest` shall connect it and subscribe to the response topic. **]**

**SRS_NODE_PROVISIONING_MQTT_18_003: [** `registrationRequest` shall publish to '$dps/registrations/PUT/iotdps-register/?$rid<rid>'. **]**

**SRS_NODE_PROVISIONING_MQTT_18_004: [** If the publish fails, `registrationRequest` shall call `callback` passing in the error. **]**

**SRS_NODE_PROVISIONING_MQTT_18_010: [** When waiting for responses, `registrationRequest` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>. **]**

**SRS_NODE_PROVISIONING_MQTT_18_012: [** If `registrationRequest` receives a response with status >= 300, it shall consider the request failed and create an error using `translateError`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_013: [** When `registrationRequest` receives a successful response from the service, it shall call `callback` passing in null and the response. **]**

**SRS_NODE_PROVISIONING_MQTT_18_015: [** When `registrationRequest` receives an error from the service, it shall call `callback` passing in the error. **]**


## queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void

**SRS_NODE_PROVISIONING_MQTT_18_016: [** If the transport is not connected, `queryOperationStatus` shall connect it and subscribe to the response topic. **]**

**SRS_NODE_PROVISIONING_MQTT_18_017: [** `queryOperationStatus` shall publish to $dps/registrations/GET/iotdps-get-operationstatus/?$rid=<rid>&operationId=<operationId>. **]**

**SRS_NODE_PROVISIONING_MQTT_18_018: [** If the publish fails, `queryOperationStatus` shall call `callback` passing the error. **]**

**SRS_NODE_PROVISIONING_MQTT_18_024: [** When waiting for responses, `queryOperationStatus` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>. **]**

**SRS_NODE_PROVISIONING_MQTT_18_026: [** If `queryOperationStatus` receives a response with status >= 300, it shall consider the query failed and create an error using `translateError`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_027: [** When `queryOperationStatus` receives a successful response from the service, it shall call `callback` passing in null and the response. **]**

**SRS_NODE_PROVISIONING_MQTT_18_029: [** When `queryOperationStatus` receives an error from the service, it shall call `callback` passing in the error. **]**


## cancel(callback: (err?: Error) => void): void

**SRS_NODE_PROVISIONING_MQTT_18_030: [** If `cancel` is called while the transport is disconnected, it will call `callback` immediately. **]**

**SRS_NODE_PROVISIONING_MQTT_18_062: [** If `cancel` is called while the transport is in the process of connecting, it shell disconnect transport and cancel the operation that initiated the connection. **]**

**SRS_NODE_PROVISIONING_MQTT_18_032: [** If `cancel` is called while the transport is connected and idle, it will call `callback` immediately. **]**

**SRS_NODE_PROVISIONING_MQTT_18_033: [** If `cancel` is called while the transport is in the middle of a `registrationRequest` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error. **]**

**SRS_NODE_PROVISIONING_MQTT_18_034: [** If `cancel` is called while the transport is in the middle of a `queryOperationStatus` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error. **]**


## disconnect(callback: (err?: Error) => void): void

**SRS_NODE_PROVISIONING_MQTT_18_052: [** If `disconnect` is called while the transport is disconnected, it will call `callback` immediately. **]**

**SRS_NODE_PROVISIONING_MQTT_18_061: [** If `disconnect` is called while the transport is in the process of connecting, it shell disconnect connection and cancel the operation that initiated the connection. **]**

**SRS_NODE_PROVISIONING_MQTT_18_054: [** If `disconnect` is called while the transport is connected and idle, it shall disconnect. **]**

**SRS_NODE_PROVISIONING_MQTT_18_055: [** If `disconnect` is called while the transport is in the middle of a `registrationRequest` operation, it shall cancel the `registrationRequest` operation and disconnect the transport. **]**

**SRS_NODE_PROVISIONING_MQTT_18_056: [** If `disconnect` is called while the transport is in the middle of a `queryOperationStatus` operation, it shall cancel the `queryOperationStatus` operation and disconnect the transport. **]**


## transport connection
These requirements apply whenever the transport connection is established

**SRS_NODE_PROVISIONING_MQTT_18_035: [** When connecting, `Mqtt` shall set `clientId` in the `TransportConfig` object to the `registrationId`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_036: [** When connecting, `Mqtt` shall set the `clean` flag in the base `TransportConfig` object to true. **]**

**SRS_NODE_PROVISIONING_MQTT_18_037: [** When connecting, `Mqtt` shall pass in the `X509` certificate that was passed into `setAuthentication` in the base `TransportConfig` object. **]**

**SRS_NODE_PROVISIONING_MQTT_18_038: [** When connecting, `Mqtt` shall set the `username` in the base `TransportConfig` object to '<idScope>/registrations/<registrationId>/api-version=<apiVersion>&clientVersion=<UrlEncode<userAgent>>'. **]**

**SRS_NODE_PROVISIONING_MQTT_18_050: [** When connecting, `Mqtt` shall set `host` in the base `TransportConfig` object to the `provisioningDeviceHost`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_039: [** If a uri is specified in the request object, `Mqtt` shall set it in the base `TransportConfig` object. **]**

**SRS_NODE_PROVISIONING_MQTT_18_040: [** When connecting, `Mqtt` shall call `_mqttBase.connect`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_041: [** If an error is returned from `_mqttBase.connect`, `Mqtt`  shall call `callback` passing the error. **]**

**SRS_NODE_PROVISIONING_MQTT_18_042: [** After connecting the transport, `Mqtt` will subscribe to '$dps/registrations/res/#' by calling `_mqttBase.subscribe`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_043: [** If an error is returned from _mqttBase.subscribe, `Mqtt` shall call `callback` passing in the error.. **]**


## transport disconnection
These requirements apply whenever the transport is disonnected.

**SRS_NODE_PROVISIONING_MQTT_18_044: [** When Disconnecting, `Mqtt` shall call _`mqttBase.unsubscribe`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_045: [** When Disconnecting, `Mqtt` shall call `_mqttBase.disconnect`. **]**

**SRS_NODE_PROVISIONING_MQTT_18_048: [** If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error. **]**

**SRS_NODE_PROVISIONING_MQTT_18_051: [** If either `_mqttBase.connect` or `_mqttBase.subscribe` fails, `mqtt` will disconnect the transport. **]**

## Websockets operation

**SRS_NODE_PROVISIONING_MQTT_18_049: [** When connecting using websockets, `Mqtt`Ws shall set the uri passed into the transport to 'wss://<host>:443/$iothub/websocket'. **]**

