# azure-iot-provisioning-http Requirements

## Overview
This module provides HTTP protocol support to communicate with the Azure device provisioning service

```js
'use strict';

export class Http extends EventEmitter implements DeviceProvisioningTransport {
  api-version: string;
  operationStatusPollingInterval: number
  constructor(idScope: string, registrationId: string) : void;
  register(authorization: string, forceRegistration: boolean, callback: (err: Error, result?: Any) => void) : void;
  disconnect(callback: (err) => void);
}
```

## Example Usage
```js
'use strict';
var Http = require('azure-iot-provisioning-http').Http;

var http = new Http('__MYSCOPE__', '__MY_DEVICE_ID__');

http.on('operationStatusPollingInterval', (body) => {
  console.log('operation id ' + body.operationId + ' is currently in state ' + body.state);
);

http.register(undefined, false, function(err, body)) {
  if (err) {
    if (err instanceof 'UnauthorizedError') {
      console.log('Unauthorized: ' + body.message); // expect to see 'Authorization required, resend request using supplied key'
    } else {
  s    console.log('unknown error: ' + err.toString());
    }
  } else {
    console.log('Success: status = ' + body.status);
  }
}



```

## Public Interface

### constructor(idScope: string, registrationId: string) : void
The `constructor` creates an Http transport object used to communicate with the Azure device provisioning service

**SRS_NODE_PROVISIONING_HTTP_18_001: [** The `Http` constructor shall accept the following properties:
- `idScope` - a string specifiying the scope of the provisioning operations,
- `registrationId` - the registration id for the specific device **]**


### register(authorization: string, forceRegistration: boolean, callback: (err: Error, result?: Any) => void) : void;
`register` calls into the service to register the given device with the provisioning service.

**SRS_NODE_PROVISIONING_HTTP_18_036: [** `register` shall call the `callback` with an `InvalidOperationError` if it is called while a previous registration is in progress. **]**


**SRS_NODE_PROVISIONING_HTTP_18_005: [** The registration request shall include the current `api-version` as a URL query string value named 'api-version'. **]**

**SRS_NODE_PROVISIONING_HTTP_18_006: [** The registration request shall specify the following in the Http header:
  Accept: application/json
  Content-Type: application/json; charset=utf-8 **]**

**SRS_NODE_PROVISIONING_HTTP_18_007: [** If an `authorization` string is specifed, it shall be URL encoded and included in the Http Authorization header. **]**

**SRS_NODE_PROVISIONING_HTTP_18_008: [** If `forceRegistration` is specified, the registration request shall include this as a query string value named 'forceRegistration' **]**

**SRS_NODE_PROVISIONING_HTTP_18_009: [** `register` shall PUT the registration request to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/register' **]**

**SRS_NODE_PROVISIONING_HTTP_18_010: [** `register` shall wait for the response to the PUT request. **]**

**SRS_NODE_PROVISIONING_HTTP_18_011: [** If the registration request times out, `register` shall call the `callback` with with the lower level error **]**

**SRS_NODE_PROVISIONING_HTTP_18_031: [** If `disconnect` is called while the registration request is in progress, `register` shall call the `callback` with an `OperationCancelledError` error. **]**

**SRS_NODE_PROVISIONING_HTTP_18_012: [** If the registration response contains a body, `register` shall deserialize this into an object. **]**

**SRS_NODE_PROVISIONING_HTTP_18_013: [** If registration response body fails to deserialize, `register` will throw an `InternalServerError` error. **]**

**SRS_NODE_PROVISIONING_HTTP_18_014: [** If the registration response has a failed status code, `register` shall use `translateError` to translate this to a common error object and pass this into the `callback` function along with the deserialized body of the response. **]**

**SRS_NODE_PROVISIONING_HTTP_18_015: [** If the registration response has a success code with a 'status' of 'Assigned', `register` call the `callback` with `err` == `null` and result `containing` the deserialized body **]**

**SRS_NODE_PROVISIONING_HTTP_18_016: [** If the registration response has a success code with a 'status' of 'Assigning', `register` shall fire an `operationStatus` event with the deserialized body **]**

**SRS_NODE_PROVISIONING_HTTP_18_017: [** If the registration response has a success code with a 'status' of 'Assigning', `register` shall start polling for operation updates **]**

**SRS_NODE_PROVISIONING_HTTP_18_029: [** If the registration response has a success code with a 'status' that is any other value', `register` shall call the callback with a `SyntaxError` error. **]**

**SRS_NODE_PROVISIONING_HTTP_18_018: [** `register` shall poll for operation status every `operationStatusPollingInterval` milliseconds **]**

**SRS_NODE_PROVISIONING_HTTP_18_032: [** If `disconnect` is called while the operation status request is in progress, `register` shall call the `callback` with an `OperationCancelledError` error. **]**

**SRS_NODE_PROVISIONING_HTTP_18_033: [** If `disconnect` is called while the register is waiting between polls, `register` shall call the `callback` with an `OperationCancelledError` error. **]**

**SRS_NODE_PROVISIONING_HTTP_18_037: [** The operation status request shall include the current `api-version` as a URL query string value named 'api-version'. **]**

**SRS_NODE_PROVISIONING_HTTP_18_020: [** The operation status request shall have the following in the Http header:
  Accept: application/json
  Content-Type: application/json; charset=utf-8 **]**

**SRS_NODE_PROVISIONING_HTTP_18_021: [** If an `authorization` string is specifed, it shall be URL encoded and included in the Http Authorization header of the operation status request. **]**

**SRS_NODE_PROVISIONING_HTTP_18_022: [** operation status request polling shall be a GET operation sent to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/operations/{operationId}' **]**

**SRS_NODE_PROVISIONING_HTTP_18_023: [** If the operation status request times out, `register` shall stop polling and call the `callback` with with the lower level error **]**

**SRS_NODE_PROVISIONING_HTTP_18_024: [** `register` shall deserialize the body of the operation status response into an object. **]**

**SRS_NODE_PROVISIONING_HTTP_18_025: [** If the body of the operation status response fails to deserialize, `register` will throw a `SyntaxError` error. **]**

**SRS_NODE_PROVISIONING_HTTP_18_026: [** If the operation status response contains a failure status code, `register` shall stop polling and call the `callback` with an error created using `translateError`. **]**

**SRS_NODE_PROVISIONING_HTTP_18_027: [** If the operation status response contains a success status code with a 'status' of 'Assigned', `register` shall stop polling and call the `callback` with `err` == null and the body containing the deserialized body. **]**

**SRS_NODE_PROVISIONING_HTTP_18_028: [** If the operation status response contains a success status code with a 'status' that is 'Assigning', `register` shall fire an `operationStatus` event with the deserialized body and continue polling. **]**

**SRS_NODE_PROVISIONING_HTTP_18_030: [** If the operation status response has a success code with a 'status' that is any other value, `register` shall call the callback with a `SyntaxError` error and stop polling. **]**


### disconnect(callback: (err) => void);

**SRS_NODE_PROVISIONING_HTTP_18_035: [** disconnect will cause polling to cease **]**

