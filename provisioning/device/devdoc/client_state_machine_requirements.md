cd ..# client_state_machine Requirements

## Overview
This module provides a state machine used by the ProvisioningDeviceClient to communicate with the Azure device provisioning service

## Example Usage
``js
  // this is effectively an abstract class that transport implementations are built upon.  It is not meant to be used directly.
``

## Public Interface

### register(registrationId: string, authorization: string | X509, requestBody: any, forceRegistration: boolean, callback: Provisioning.ResponseCallback): void
Register round-trips one step of the registration process, not returning until an error is returned or registration request reaches a status of "Assigned".  This function will emit "operationStatus" events for both "Assigning" and "Assigned" responses from the service.

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_011: [** `register` shall fail if the connection fails. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [** `register` shall call `TransportHandlers.registrationRequest`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [** If `TransportHandlers.registrationRequest` fails, `register` shall fail. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [** If `TransportHandlers.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and call `callback` with null, the response body, and the protocol-specific result. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [** If `TransportHandlers.registrationRequest` succeeds with status==Assigning, it shall emit an 'operationStatus' event and begin polling for operation status requests. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [** If `TransportHandlers.registrationRequest` succeeds  with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [** When the polling interval elapses, `register` shall call `TransportHandlers.queryOperationStatus`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [** If `TransportHandlers.queryOperationStatus` fails, `register` shall fail. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [** If `TransportHandlers.queryOperationStatus` succeeds with status==Assigned, `register` shall complete and pass the body of the response and the protocol-spefic result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [** If `TransportHandlers.queryOperationStatus` succeeds with status==Assigning, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [** If `TransportHandlers.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [** If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. **]**


### endSession(callback: (err: Error) => void): void
enndSession is used to end the transport session

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [** If `endSession` is called while disconnected, it shall immediately call its `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_026: [** `endSession` shall call `TransportHandlers.endSession` of it's called while the transport is connected. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [** If a registration is in progress, `endSession` shall cause that registration to fail with an `OperationCancelledError`. **]**

