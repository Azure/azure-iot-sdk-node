# transport_state_machine Requirements

## Overview
This module provides HTTP protocol support to communicate with the Azure device provisioning service

## Example Usage
``js
  // this is effectively an abstract class that transport implements are built upon.  It is not meant to be used directly.
``

## Public Interface

### constructor()
The constructor creates a TransportStateMachine object

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_001: [** The `constructor` shall accept no arguments **]**


### connect(callback: (err?: Error) => void): void
Connect is used to connect the transport

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_002: [** `connect` shall call `_doConnectForFsm`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_003: [** If `_doConnectForFsm` fails, then `connect` shall fail. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_004: [** If the transport is already connected, then `connect` shall do nothing and call the `callback` immediately. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_005: [** If `connect` is called while a connection is in progress, it shall wait for that connection to complete before calling `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_006: [** If `connect` is called while the transport is executing the first registration request, it shall do nothing and call `callback` immediately. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_007: [** If `connect` is called while the transport is waiting between operation status queries, it shall do nothing and call `callback` immediately. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_008: [** If `connect` is called while the transport is executing an operation status query, it shall do nothing and call `callback` immediately. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_009: [** If `connect` is called while the transport is disconnecting, it shall wait for the disconnection to complete, then initiate the connection. **]**


### register(registrationId: string, authorization: string | X509, requestBody: any, forceRegistration: boolean, callback: Provisioning.ResponseCallback): void
Register round-trips one step of the registration process, not returning until the operation is complete

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_010: [** `register` shall `connect` the transport if it is not connected. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_011: [** `register` shall fail if the connection fails. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [** `register` shall call `_doFirstRegistrationRequestForFsm`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [** If the registration request fails, `register` shall fail. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [** If the registration request returns with status==assigned, it shall call `callback` with null, the response body, and the protocol-specific result. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [** If the registration request returns with status==Assigning, it shall begin polling for operation status requests. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [** If the registration request returns with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_017: [** If the registration request returns a successful, `register` shall emit an 'operationStatus' event passing the body of the response. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [** When the polling interval elapses, `register` shall call `_doOperationStatusQueryForFsm`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [** If `_doOperationStatusQueryForFsm` fails, `register` shall fail. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [** If `_doOperationStatusQueryForFsm` succeeds with status==Assigned, `register` shall complete and pass the body of the response and the protocol-spefic result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [** If `_doOperationStatusQueryForFsm` succeeds with status==Assigned, `register` shall begin another polling interval. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [** If `_doOperationStatusQueryForFsm` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_023: [** If `_doOperationStatusQueryForFsm` succeeds, `register` shall emit an 'operationStatus' event passing the body of the response. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [** If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. **]**


### disconnect(callback: (err: Error) => void): void
Disconnect is used to disconnect the transport

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [** If `disconnect` is called while disconnected, it shall immediately call its `callback`. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_026: [** `disconnect` shall call `_doDisconnectForFsm` of it's called while the transport is connected. **]**

**SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [** If a registration is in progress, `disconnect` shall cause that registration to fail with an `OperationCancelledError`. **]**

