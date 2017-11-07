#!/bin/bash

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

min_output=
integration_tests=

node_root=$(cd "$(dirname "$0")/.." && pwd)
cd $node_root

usage ()
{
    echo "Lint code and run tests."
    echo "build.sh [options]"
    echo "options"
    echo " --min                 minimize display output"
    echo " --integration-tests   run integration tests too (unit tests always run)"
    exit 1
}

process_args ()
{
    min_output=0
    integration_tests=0

    for arg in $*
    do
        case "$arg" in
            "--min" ) min_output=1;;
            "--integration-tests" ) integration_tests=1;;
            * ) usage;;
        esac
    done
}

create_test_device()
{
    export IOTHUB_X509_DEVICE_ID=x509device-node-$RANDOM
    node $node_root/build/tools/create_device_certs.js --connectionString $IOTHUB_CONNECTION_STRING --deviceId $IOTHUB_X509_DEVICE_ID
    export IOTHUB_X509_CERTIFICATE=$(pwd)/$IOTHUB_X509_DEVICE_ID-cert.pem
    export IOTHUB_X509_KEY=$(pwd)/$IOTHUB_X509_DEVICE_ID-key.pem
}

delete_test_device()
{
    node $node_root/build/tools/delete_device.js --connectionString $IOTHUB_CONNECTION_STRING --deviceId $IOTHUB_X509_DEVICE_ID
    rm $IOTHUB_X509_CERTIFICATE
    rm $IOTHUB_X509_KEY
}

cleanup_and_exit()
{
    delete_test_device
    exit $1
}

process_args $*

echo ""
echo "-- create test device --"
create_test_device

pushd $node_root/build/build_parallel
echo ""
if [ $integration_tests -eq 0 ]
then
    echo "-- Linting and running unit tests --"
    node build_parallel.js test
    [ $? -eq 0 ] || cleanup_and_exit $?
else
    echo "-- Linting and running unit + integration tests --"
    node build_parallel.js ci
    [ $? -eq 0 ] || cleanup_and_exit $?
fi
popd
echo ""

cleanup_and_exit $?
