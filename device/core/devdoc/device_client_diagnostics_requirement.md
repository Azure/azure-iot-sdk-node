# azure-iot-device.Diagnostics Requirements

## Overview
azure-iot-device.Diagnostics provide the data structure to store diagnostic property data

## Public Interface

### Constructors
#### Diagnostics(id, creationTimeUtc) constructor

**SRS_NODE_DEVICE_DIAGNOSTICS_01_001: [** The `Diagnostics` constructor shall accept a correlation id of message.**]**

**SRS_NODE_DEVICE_DIAGNOSTICS_01_002: [** The `Diagnostics` constructor shall accept a correlation context including creation time of message.**]**

### Public Methods

#### getEncodedCorrelationContext()

**SRS_NODE_DEVICE_DIAGNOSTICS_01_003: [** The `getEncodedCorrelationContext` function returned the encoded string of correlation context.**]**

# azure-iot-device.DiagnosticClient Requirements

## Overview
azure-iot-device.DiagnosticClient provide the function to configure the diagnostic settings and attach diagnostic information to the message.

## Public Interface

### Constructors
#### DiagnosticClient() constructor

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_001: [** The `Client` constructor shall initial the percentage and message counter.**]**

### Public Methods

#### getDiagSamplingPercentage()

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_002: [** The `getDiagSamplingPercentage` function shall return the value of sampling percentage.**]**

#### setDiagSamplingPercentage(diagSamplingPercentage)

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_003: [** The `setDiagSamplingPercentage` function shall set the value of sampling percentage.**]**

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_004: [** The `setDiagSamplingPercentage` function shall throw an exception when input parameter is not an integer.**]**

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_005: [** The `setDiagSamplingPercentage` function shall throw an exception when input parameter is not in range [0,100].**]**

#### addDiagnosticInfoIfNecessary(message)

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_006: [** The `addDiagnosticInfoIfNecessary` function shall attach diagnostic information to the message if necessary.**]**

#### onDesiredTwinUpdate(twin, desiredTwin)

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_007: [** The `onDesiredTwinUpdate` function shall be a callback when client receive a desired twin update.**]**

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_009: [** The `onDesiredTwinUpdate` function shall set the sampling percentage.**]**

**SRS_NODE_DEVICE_DIAGNOSTICCLIENT_01_010: [** The `onDesiredTwinUpdate` function shall send a reported twin to give feedback to diagnostic update.**]**