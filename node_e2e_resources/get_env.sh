# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for
# full license information.

export IOT_PROVISIONING_DEVICE_ENDPOINT=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOT-PROVISIONING-DEVICE-ENDPOINT)
export IOTHUB_CA_ROOT_CERT=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOTHUB-CA-ROOT-CERT)
export IOTHUB_CA_ROOT_CERT_KEY=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOTHUB-CA-ROOT-CERT-KEY)
export IOT_PROVISIONING_DEVICE_IDSCOPE=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOT-PROVISIONING-DEVICE-IDSCOPE)
export IOT_PROVISIONING_ROOT_CERT=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOT-PROVISIONING-ROOT-CERT)
export IOT_PROVISIONING_ROOT_CERT_KEY=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOT-PROVISIONING-ROOT-CERT-KEY)
export IOT_PROVISIONING_SERVICE_CONNECTION_STRING=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOT-PROVISIONING-SERVICE-CONNECTION-STRING)
export IOTHUB_CONNECTION_STRING=$(az keyvault secret show --query '{value:value}' --output tsv --vault-name $1 --name IOTHUB-CONNECTION-STRING)
export STORAGE_CONNECTION_STRING=$(az keyvault secret show --query '{value:value}' --output tsv  --vault-name $1 --name STORAGE-CONNECTION-STRING)
export DPS_CONN_STRING_INVALID_CERT=$(az keyvault secret show --query '{value:value}' --output tsv  --vault-name $1 --name DPS-CONN-STRING-INVALID-CERT)
export DPS_GLOBAL_DEVICE_ENDPOINT_INVALID_CERT=$(az keyvault secret show --query '{value:value}' --output tsv  --vault-name $1 --name DPS-GLOBAL-DEVICE-ENDPOINT-INVALID-CERT)
export IOTHUB_CONN_STRING_INVALID_CERT=$(az keyvault secret show --query '{value:value}' --output tsv  --vault-name $1 --name IOTHUB-CONN-STRING-INVALID-CERT)
export IOTHUB_DEVICE_CONN_STRING_INVALID_CERT=$(az keyvault secret show --query '{value:value}' --output tsv  --vault-name $1 --name IOTHUB-DEVICE-CONN-STRING-INVALID-CERT)