# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for
# full license information.
script_dir=$(cd "$(dirname "$0")" && pwd)
which az > /dev/null 2>&1
if [ $? -ne 0 ]; then
   printf "Azure CLI must be installed and added to PATH\n"
   exit 1
fi
set -e

function usage {
    printf "usage: $0 [flags]\n\n"
    printf "flags:\n"
    printf "    --help, -h        Show this help message\n"
    printf "    --rg-name, -n     Name of the resource group to use. Will be created if needed. (required)\n"
    printf "                      Note: A resource group can only hold a single set of E2E resources.\n"
    printf "    --location, -l    Deploy to specific Azure region (optional, default is westus2)\n"
}


# process args
location=westus2

while [ "$1" != "" ]; do
    case $1 in
        -l | --location)
            location=$2
            shift; shift;
            ;;

        -n | --rg-name)
            rgName=$2
            shift; shift;
            ;;

        -h | --help)
            usage
            exit 0
            ;;

        *)
            printf "Unexpected argument: $1\n"
            usage
            exit 1
            ;;
    esac
done

if [ "$rgName" == "" ]; then
    printf "Expected argument rg-name is missing\n"
    usage
    exit 1
fi


# print warning
printf "WARNING\n"
printf "This script will deploy Azure resources into\n"
printf "Subscription: $(az account show --query "name" -o tsv)\n"
printf "Resource Group: $rgName\n"
printf "Region: $location\n"
printf "(Use 'az account list' and 'az account set' to change the subscription.)\n"
read -p 'Press [Enter] to continue or ctrl-c to break'


# create certs
printf "Creating certs...\n"
mkdir -p ${script_dir}/secrets/{certs,env}
openssl req \
    -new \
    -newkey rsa:4096 \
    -days 730 \
    -nodes \
    -x509 \
    -subj '/CN=Azure IoT Test Only' \
    -keyout ${script_dir}/secrets/certs/azure-iot-test-only.key \
    -out ${script_dir}/secrets/certs/azure-iot-test-only.cert.pem > /dev/null 2>&1
root_cert=$(printf "%s" $(base64 -i ${script_dir}/secrets/certs/azure-iot-test-only.cert.pem))
private_key=$(printf "%s" $(base64 -i ${script_dir}/secrets/certs/azure-iot-test-only.key))


# start deployment
deploymentName="IoT-E2E-$(printf $RANDOM)"

printf "Deploying Azure resources...\n"
deployment_out=$(az deployment sub create --only-show-errors \
    -f ${script_dir}/test-resources.bicep \
    -l $location \
    -n $deploymentName \
    -p \
        rgName=$rgName \
        alias=$(az account show --query '{user:user.name}' -o tsv) \
        userObjectId=$(az ad signed-in-user show --query id -o tsv) \
        rootCertValue=$root_cert \
        rootCertPrivateKey=$private_key)

iot_hub_name=$(printf "$deployment_out" | jq -r .properties.outputs.iotHubName.value)
dps_name=$(printf "$deployment_out" | jq -r .properties.outputs.dpsName.value)
key_vault_name=$(printf "$deployment_out" | jq -r .properties.outputs.keyVaultName.value)
iot_provisioning_device_idscope=$(printf "$deployment_out" | jq -r .properties.outputs.iotProvisioningDeviceIdScope.value)
iot_provisioning_service_connection_string=$(printf "$deployment_out" | jq -r .properties.outputs.iotProvisioningServiceConnectionString.value)
iothub_connection_string=$(printf "$deployment_out" | jq -r .properties.outputs.iotHubConnectionString.value)
eventhub_connection_string=$(printf "$deployment_out" | jq -r .properties.outputs.eventHubConnectionString.value)
storage_connection_string=$(printf "$deployment_out" | jq -r .properties.outputs.storageConnectionString.value)


# add cert to IoT Hub
printf "Adding cert to IoT Hub...\n"
az iot hub certificate create --only-show-errors -v \
    --hub-name $iot_hub_name \
    -g $rgName \
    -n azure-iot-test-only \
    -p ${script_dir}/secrets/certs/azure-iot-test-only.cert.pem


# add cert to DPS
printf "Adding cert to DPS...\n"
az iot dps certificate create --only-show-errors -v \
    --dps-name $dps_name \
    -g $rgName \
    -n azure-iot-test-only \
    -p ${script_dir}/secrets/certs/azure-iot-test-only.cert.pem


# create activation scripts
printf "Creating activation scripts...\n"

# fake secrets
iot_provisioning_device_endpoint="global.azure-devices-provisioning.net"
dps_conn_string_invalid_cert="HostName=invalidcertdps1.westus.cloudapp.azure.com;SharedAccessKeyName=provisioningserviceowner;SharedAccessKey=lGO7OlXNhXlFyYV1rh9F/lUCQC1Owuh5f/1P0I1AFSY="
dps_global_device_endpoint_invalid_cert="invalidcertgde1.westus.cloudapp.azure.com"
iothub_conn_string_invalid_cert="HostName=invalidcertiothub1.westus.cloudapp.azure.com;SharedAccessKeyName=iothubowner;SharedAccessKey=Fk1H0asPeeAwlRkUMTybJasksTYTd13cgI7SsteB05U="
iothub_device_conn_string_invalid_cert="HostName=invalidcertiothub1.westus.cloudapp.azure.com;DeviceId=DoNotDelete1;SharedAccessKey=zWmeTGWmjcgDG1dpuSCVjc5ZY4TqVnKso5+g1wt/K3E="

pushd ${script_dir}/secrets/env/ > /dev/null 2>&1
# PS
printf "Set-Item -Path Env:IOT_PROVISIONING_DEVICE_ENDPOINT -Value '$iot_provisioning_device_endpoint'\r\n" > activate.ps1
printf "Set-Item -Path Env:IOTHUB_CA_ROOT_CERT -Value '$root_cert'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOTHUB_CA_ROOT_CERT_KEY -Value '$private_key'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOT_PROVISIONING_DEVICE_IDSCOPE -Value '$iot_provisioning_device_idscope'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOT_PROVISIONING_ROOT_CERT -Value '$root_cert'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOT_PROVISIONING_ROOT_CERT_KEY -Value '$private_key'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOT_PROVISIONING_SERVICE_CONNECTION_STRING -Value '$iot_provisioning_service_connection_string'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOTHUB_CONNECTION_STRING -Value '$iothub_connection_string'\r\n" >> activate.ps1
printf "Set-Item -Path Env:EVENTHUB_CONNECTION_STRING -Value '$eventhub_connection_string'\r\n" >> activate.ps1
printf "Set-Item -Path Env:STORAGE_CONNECTION_STRING -Value '$storage_connection_string'\r\n" >> activate.ps1
printf "Set-Item -Path Env:DPS_CONN_STRING_INVALID_CERT -Value '$dps_conn_string_invalid_cert'\r\n" >> activate.ps1
printf "Set-Item -Path Env:DPS_GLOBAL_DEVICE_ENDPOINT_INVALID_CERT -Value '$dps_global_device_endpoint_invalid_cert'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOTHUB_CONN_STRING_INVALID_CERT -Value '$iothub_conn_string_invalid_cert'\r\n" >> activate.ps1
printf "Set-Item -Path Env:IOTHUB_DEVICE_CONN_STRING_INVALID_CERT -Value '$iothub_device_conn_string_invalid_cert'\r\n" >> activate.ps1

# CMD
printf "set IOT_PROVISIONING_DEVICE_ENDPOINT=$iot_provisioning_device_endpoint\r\n" > activate.cmd
printf "set IOTHUB_CA_ROOT_CERT=$root_cert\r\n" >> activate.cmd
printf "set IOTHUB_CA_ROOT_CERT_KEY=$private_key\r\n" >> activate.cmd
printf "set IOT_PROVISIONING_DEVICE_IDSCOPE=$iot_provisioning_device_idscope\r\n" >> activate.cmd
printf "set IOT_PROVISIONING_ROOT_CERT=$root_cert\r\n" >> activate.cmd
printf "set IOT_PROVISIONING_ROOT_CERT_KEY=$private_key\r\n" >> activate.cmd
printf "set IOT_PROVISIONING_SERVICE_CONNECTION_STRING=$iot_provisioning_service_connection_string\r\n" >> activate.cmd
printf "set IOTHUB_CONNECTION_STRING=$iothub_connection_string\r\n" >> activate.cmd
printf "set EVENTHUB_CONNECTION_STRING=$eventhub_connection_string\r\n" >> activate.cmd
printf "set STORAGE_CONNECTION_STRING=$storage_connection_string\r\n" >> activate.cmd
printf "set DPS_CONN_STRING_INVALID_CERT=$dps_conn_string_invalid_cert\r\n" >> activate.cmd
printf "set DPS_GLOBAL_DEVICE_ENDPOINT_INVALID_CERT=$dps_global_device_endpoint_invalid_cert\r\n" >> activate.cmd
printf "set IOTHUB_CONN_STRING_INVALID_CERT=$iothub_conn_string_invalid_cert\r\n" >> activate.cmd
printf "set IOTHUB_DEVICE_CONN_STRING_INVALID_CERT=$iothub_device_conn_string_invalid_cert\r\n" >> activate.cmd

# BASH
printf "#!/bin/bash\n" > activate
printf "export IOT_PROVISIONING_DEVICE_ENDPOINT='$iot_provisioning_device_endpoint'\n" >> activate
printf "export IOTHUB_CA_ROOT_CERT='$root_cert'\n" >> activate
printf "export IOTHUB_CA_ROOT_CERT_KEY='$private_key'\n" >> activate
printf "export IOT_PROVISIONING_DEVICE_IDSCOPE='$iot_provisioning_device_idscope'\n" >> activate
printf "export IOT_PROVISIONING_ROOT_CERT='$root_cert'\n" >> activate
printf "export IOT_PROVISIONING_ROOT_CERT_KEY='$private_key'\n" >> activate
printf "export IOT_PROVISIONING_SERVICE_CONNECTION_STRING='$iot_provisioning_service_connection_string'\n" >> activate
printf "export IOTHUB_CONNECTION_STRING='$iothub_connection_string'\n" >> activate
printf "export EVENTHUB_CONNECTION_STRING='$eventhub_connection_string'\n" >> activate
printf "export STORAGE_CONNECTION_STRING='$storage_connection_string'\n" >> activate
printf "export DPS_CONN_STRING_INVALID_CERT='$dps_conn_string_invalid_cert'\n" >> activate
printf "export DPS_GLOBAL_DEVICE_ENDPOINT_INVALID_CERT='$dps_global_device_endpoint_invalid_cert'\n" >> activate
printf "export IOTHUB_CONN_STRING_INVALID_CERT='$iothub_conn_string_invalid_cert'\n" >> activate
printf "export IOTHUB_DEVICE_CONN_STRING_INVALID_CERT='$iothub_device_conn_string_invalid_cert'\n" >> activate

# JSON
printf "{\n" > env.json
printf "    \"IOT_PROVISIONING_DEVICE_ENDPOINT\": \"$iot_provisioning_device_endpoint\",\n" >> env.json
printf "    \"IOTHUB_CA_ROOT_CERT\": \"$root_cert\",\n" >> env.json
printf "    \"IOTHUB_CA_ROOT_CERT_KEY\": \"$private_key\",\n" >> env.json
printf "    \"IOT_PROVISIONING_DEVICE_IDSCOPE\": \"$iot_provisioning_device_idscope\",\n" >> env.json
printf "    \"IOT_PROVISIONING_ROOT_CERT\": \"$root_cert\",\n" >> env.json
printf "    \"IOT_PROVISIONING_ROOT_CERT_KEY\": \"$private_key\",\n" >> env.json
printf "    \"IOT_PROVISIONING_SERVICE_CONNECTION_STRING\": \"$iot_provisioning_service_connection_string\",\n" >> env.json
printf "    \"IOTHUB_CONNECTION_STRING\": \"$iothub_connection_string\",\n" >> env.json
printf "    \"EVENTHUB_CONNECTION_STRING\": \"$eventhub_connection_string\",\n" >> env.json
printf "    \"STORAGE_CONNECTION_STRING\": \"$storage_connection_string\",\n" >> env.json
printf "    \"DPS_CONN_STRING_INVALID_CERT\": \"$dps_conn_string_invalid_cert\",\n" >> env.json
printf "    \"DPS_GLOBAL_DEVICE_ENDPOINT_INVALID_CERT\": \"$dps_global_device_endpoint_invalid_cert\",\n" >> env.json
printf "    \"IOTHUB_CONN_STRING_INVALID_CERT\": \"$iothub_conn_string_invalid_cert\",\n" >> env.json
printf "    \"IOTHUB_DEVICE_CONN_STRING_INVALID_CERT\": \"$iothub_device_conn_string_invalid_cert\"\n" >> env.json
printf "}\n" >> env.json

popd > /dev/null 2>&1

printf "Done!\n"
printf "WARNING: The secrets directory contains secret values. Do not check-in this directory.\n"
printf "Depending on your environment, activate the E2E test environment by running the following\n"
printf "Bash: source secrets/env/activate\n"
printf "PowerShell: secrets/env/activate.ps1\n"
printf "CMD: secrets/env/activate.cmd\n"
printf "Alternatively, you can retreive the environment variables from secrets/env/env.json\n"
printf "or from the Key Vault named $key_vault_name.\n"
