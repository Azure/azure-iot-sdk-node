# Azure IoT Digital Twins: Model Repository Example

This sample shows how to use the temporary auto-generated client library for the model repository.
**This is a preview version that is auto-generated and does not represent the final shape of the API**

## Prerequisite

You should have [Node.js](https://nodejs.org/en/) installed.

## How to install the sample

1. Download the files in this folder
2. Install the dependencies by opening a terminal that contains the sample you downloaded and the `package.json` file and type:

```shell
npm install
```

3. Set the following environment variable:
```shell
set AZURE_IOT_MODEL_REPOSITORY_CONNECTION_STRING=<your private repository connection string>
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