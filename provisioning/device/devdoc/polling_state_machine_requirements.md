# polling_state_machine Requirements

## Overview
This module provides a state machine used by the ProvisioningDeviceClient to communicate with the Azure device provisioning service

## Example Usage
``js
  // this is effectively an abstract class that transport implementations are built upon.  It is not meant to be used directly.
``

## Public Interface

### register(request: RegistrationRequest, auth: string | X509, requestBody: any, callback: Provisioning.ResponseCallback): void
Register round-trips one step of the registration process, not returning until an error is returned or registration request reaches a status of "Assigned".  This function will emit "operationStatus" events for both "Assigning" and "Assigned" responses from the service.

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_011: [** `register` shall fail if the connection fails. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [** `register` shall call `PollingTransport.registrationRequest`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [** If `PollingTransport.registrationRequest` fails, `register` shall fail. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [** If `PollingTransport.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and call `callback` with null, the response body, and the protocol-specific result. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [** If `PollingTransport.registrationRequest` succeeds with status==Assigning, it shall emit an 'operationStatus' event and begin polling for operation status requests. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [** If `PollingTransport.registrationRequest` succeeds  with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_028: [** If `PollingTransport.registrationRequest` succeeds with status==Failed, it shall fail with a `ProvisioningRegistrationFailedError` error **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_036: [** If `PollingTransport.registrationRequest` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [** When the polling interval elapses, `register` shall call `PollingTransport.queryOperationStatus`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [** If `PollingTransport.queryOperationStatus` fails, `register` shall fail. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [** If `PollingTransport.queryOperationStatus` succeeds with status==Assigned, `register` shall complete and pass the body of the response and the protocol-spefic result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [** If `PollingTransport.queryOperationStatus` succeeds with status==Assigning, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_029: [** If `PollingTransport.queryOperationStatus` succeeds with status==Failed, it shall fail with a `ProvisioningRegistrationFailedError` error **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [** If `PollingTransport.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_037: [** If `PollingTransport.queryOperationStatus` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [** If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. **]**


### cancel(callback: (err: Error) => void): void
`cancel` is used to cancel the current operation

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [** If `cancel` is called while disconnected, it shall immediately call its `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [** If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_030: [** If `cancel` is called while the transport is connected but idle, it shall immediately call its `callback`. **]**


### disconnect(callback: (err: Error) => void): void
`disconnect` is used to end the current transport session

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_031: [** If `disconnect` is called while disconnected, it shall immediately call its `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_032: [** If `disconnect` is called while while the transport is connected but idle, it shall call `PollingTransport.disconnect` and call it's `callback` passing the results of the transport operation. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_033: [** If `disconnect` is called while in the middle of a `registrationRequest` operation, the operation shall be cancelled and the transport shall be disconnected. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_034: [** If `disconnect` is called while the state machine is waiting to poll, the current operation shall be cancelled and the transport shall be disconnected. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_035: [** If `disconnect` is called while in the middle of a `queryOperationStatus` operation, the operation shall be cancelled and the transport shall be disconnected. **]**

