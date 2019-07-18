# Azure IoT Digital Twins: Model Repository Example

This sample shows how to use the temporary auto-generated client library for the model repository.
**This is a preview version that is auto-generated and does not represent the final shape of the API**

## Prerequisite

You should have [Node.js](https://nodejs.org/en/) installed.

## How to install the sample

1. Download the files in this folder
2. Install the dependencies:
  - To download the client libraries from NPM, simply run `npm install`
  - if you've downloaded the client libraries manually, simply run:
      (dont't forget to replace <path-to> with the actual path to the package and <preview-version> with the version of the packages you downloaded)
      ```
      $ npm install <path-to>/azure-iot-digitaltwins-model-repository-<preview-version>
      ```
3. Set the following environment variables:
```shell
set AZURE_IOT_MODEL_REPO_ID=<your private repository id>
set AZURE_IOT_MODEL_REPO_KEY_ID=<your private repository key id>
set AZURE_IOT_MODEL_REPO_KEY_SECRET=<your private repository key>
set AZURE_IOT_MODEL_REPO_HOSTNAME=<the repository hostname in your region>
```
*use `export` instead of `set` if you're running MacOS or Linux.*


4. Run the sample with the following command:

```
$ node model_repo.js
```

## What does this sample do?

The first part of the sample shows a really simplistic implementation of a class that generates an authentication token for the model repository client.

The second part shows how to use the client to run a full text search on existing models.

The third part shows how to get an existing model for which you know the unique identifier.