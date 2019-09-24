# azure-iot-device.blobUpload.BlobUploadResult requirements

# Overview
`BlobUploadResult` describes the result of an upload to a blob, whether it succeeded or failed.

# Public API
## BlobUploadResult(isSuccess, statusCode, statusDescription) [constructor]
**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_001: [** The `isSuccess` parameter shall be assigned to the the `isSuccess` property of the newly created `BlobUploadResult` instance. **]**

**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_002: [** The `statusCode` parameter shall be assigned to the the `statusCode` property of the newly created `BlobUploadResult` instance. **]**

**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_16_003: [** The `statusDescription` parameter shall be assigned to the the `statusDescription` property of the newly created `BlobUploadResult` instance. **]**

## fromAzureStorageCallbackArgs(err, body, response) [static factory]
**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_001: [** If `err` is `null` and `uploadResponse` is falsy a `ReferenceError` shall be thrown **]**

**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_002: [** If `err` is not `null`, the `BlobUploadResult` shall have the `isSucess` property set to `false` **]**

**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_003: [** If `err` is null but `uploadResponse` is provided, and `uploadResponse.ErrorCode` is not null, `BlobUploadResult` shall have the `isSuccess` property set to `false` **]**

**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_004: [** If `err` is null but `uploadResponse` is provided, the `BlobUploadResult` shall have the `statusCode` and `statusDescription` property set to the HTTP status code of the blob upload response **]**

**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_005: [** If `uploadResponse._response.status` is a number within the HTTP Status Codes 'success' range, the `isSuccess` property will be set to `true` **]**

**SRS_NODE_DEVICE_BLOB_UPLOAD_RESULT_41_006: [** If `uploadResponse._response.status` is a number not in the HTTP Status Codes 'success' range, the `isSuccess` property will be set to `false` **]**