# azure-iot-common.RetryOperation Requirements

## Overview

the `RetryOperation` class implements the necessary logic to retry operations such as connecting, receiving C2D messages, sending telemetry, twin updates, etc.

## Usage example

```js
var op = new RetryOperation(new ExponentialBackoffWithJitter(), 120000);
op.retry(function (retryCallback) {
  callSomethingAsync(someParam, retryCallback);
}, function (err, result) {
  if (err) {
    console.log('error after retrying: ' + err.toString());
  } else {
    console.log('successful operation result: ' + result.toString());
  }
});
```

## Public API

### retry(operation, finalCallback)

**SRS_NODE_COMMON_RETRY_OPERATION_16_001: [** The `operation` function should be called at every retry. **]**

**SRS_NODE_COMMON_RETRY_OPERATION_16_002: [** If the `operation` is successful the `finalCallback` function should be called with a `null` error parameter and the result of the operation.**]**

**SRS_NODE_COMMON_RETRY_OPERATION_16_003: [** If the `operation` fails with an error the `retry` method should determine whether to retry or not using the `shouldRetry` method of the policy passed to the constructor.**]**

**SRS_NODE_COMMON_RETRY_OPERATION_16_004: [** If the `operation` fails and should not be retried, the `finalCallback` should be called with the last error as the only parameter. **]**

**SRS_NODE_COMMON_RETRY_OPERATION_16_005: [** If the `operation` fails and should be retried, the time at which to try again the `operation` should be computed using the `nextRetryTimeout` method of the policy passed to the constructor. **]**

**SRS_NODE_COMMON_RETRY_OPERATION_16_006: [** The `operation` should not be retried past the `maxTimeout` parameter passed to the constructor.**]**
