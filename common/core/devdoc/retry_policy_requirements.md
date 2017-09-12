# azure-iot-common.RetryPolicy Requirements

## Overview

The `RetryPolicy` interface and classes implement the necessary logic to compute retry intervals using different algorithms and parameters when an operation (such as sending a D2C message) fails.

## Example

```js
var policy = new ExponentialBackoffWithJitter(new DefaultErrorFilter());
var firstTimeout = policy.nextRetryTimeout(1, false);
var secondTimeout = policy.nextRetryTimeout(2, false);

// the second parameter indicates whether the algorithm should use normal parameters (false)
// or parameters adapted to situations where the Azure IoT hub is throttling
var timeoutWhenThrottled = policy.nextRetryTimeout(1, true);
// timeoutWhenThrottled will be longer than firstTimeout.

var errorFilter: {
  TimeoutError: false
};

var policy = new ExponentialBackoffWithJitter(errorFilter);
var shouldBeFalse = policy.shouldRetry(new errors.TimeoutError());
```

## Public API:

### RetryPolicy interface

**SRS_NODE_COMMON_RETRY_POLICY_16_001: [** Any implementation of the `RetryPolicy` interface shall have a `shouldRetry` method used to evaluate if an error is "retryable" or not. **]**

**SRS_NODE_COMMON_RETRY_POLICY_16_002: [** Any implementation of the `RetryPolicy` interface shall have a `getNextTimeout` method used to return the timeout value corresponding to the current retry count. **]**

### NoRetry

#### shouldRetry(error)

**SRS_NODE_COMMON_RETRY_POLICY_16_03: [** The `shouldRetry` method shall always return `false`. **]**

#### getNextTimeout(currentRetryCount, isThrottled)

**SRS_NODE_COMMON_RETRY_POLICY_16_004: [** The `getNextTimeout` method shall always return `-1`. **]**

### ExponentialBackoffWithJitter

#### shouldRetry(error)

**SRS_NODE_COMMON_RETRY_POLICY_16_006: [** The `shouldRetry` method of the new instance shall use the error filter passed to the constructor when the object was instantiated. **]**

#### getNextTimeout(currentRetryCount, isThrottled)

**SRS_NODE_COMMON_RETRY_POLICY_16_007: [** The `getNextTimeout` method shall implement the following math formula to determine the next timeout value: `F(x) = min(Cmin+ (2^(x-1)-1) * rand(C * (1 – Jd), C*(1-Ju)), Cmax` **]**

**SRS_NODE_COMMON_RETRY_POLICY_16_008: [** The `getNextTimeout` method shall return `0` instead of the result of the math formula if the following 3 conditions are met:
- the `constructor` was called with the `immediateFirstTimeout` boolean set to `true`
- the `isThrottled` boolean is `false`.
- the `currentRetryCount` is `0` (meaning it's the first retry). **]**

**SRS_NODE_COMMON_RETRY_POLICY_16_009: [** The default constants to use with the Math formula for the normal conditions retry are:
```
c = 100
cMin = 100
cMax = 10000
ju = 0.25
jd = 0.5
``` **]**

**SRS_NODE_COMMON_RETRY_POLICY_16_010: [** The default constants to use with the Math formula for the throttled conditions retry are:
```
c = 5000
cMin = 10000
cMax = 60000
ju = 0.5
jd = 0.25
``` **]**
