# Script for creating Azure resources needed to run E2E tests for the Azure IoT Node.js SDK

The E2E tests for the Azure IoT Node.js SDK require some Azure resources to be set up and configured.
Running [`deploy.sh`](deploy.sh) is a convenient way to get these required resources set up. **This
script will create resources that cost money**, so make sure to delete the resources if they are no longer required. To delete the resources, simply delete the resource group that was created by the
script.

## Prerequisites
- Azure CLI installed, added to the PATH, and logged in to the subscription where the resources are to be created. To login, run `az login` and follow
the prompts. To set the subscription, run
`az account set --subscription <subscription name or id>`. 
- OpenSSL installed and added to the PATH

## How it works
The script makes heavy use of [Bicep](https://github.com/Azure/bicep), a domain-specific language
for authoring ARM templates. The main bicep file is [`test-resources.bicep`](test-resources.bicep),
which depends on the modules defined in the other bicep files. The script does the following:

1. Use OpenSSL to create a (self-signed) root cert and private key. The cert is valid for 2 years.
1. Deploy the resources defined in the Bicep file using Azure CLI
1. Add the certs to the deployed IoT Hub and DPS instance

A resource group with the following resources get created by the script:

1. A storage account with a blob storage container
1. An IoT Hub with a verified cert and configured to allow for file upload notifications
1. A DPS instance with a verified cert and configured to allow for devices to be provisioned on the
Hub
1. A Key Vault with all the necessary secrets needed to run the Node.js E2E tests, including the
root cert value and private key

## Running the script
To quickly get started with the script, run `./deploy.sh -n <desired resource group name>` and
read and accept the prompt when asked. For more information on the usage, run `./deploy.sh -h`.

## Fetching secrets to run E2E tests
To fetch the secrets needed to run the E2E tests, simply run `source get-env.sh <keyvault name>`.
The name of the Key Vault should have been printed by [`deploy.sh`](deploy.sh). Alternatively,
you can use the Azure Portal or Azure CLI to find the Key Vault name.