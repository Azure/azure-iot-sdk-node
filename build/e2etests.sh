#!/bin/bash

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

min_output=
npm_command=

node_root=$(cd "$(dirname "$0")/.." && pwd)
cd $node_root

usage ()
{
    echo "Lint code and run tests."
    echo "build.sh [options]"
    echo "options"
    echo " --min                 minimize display output"
    exit 1
}

process_args ()
{
    min_output=0

    for arg in $*
    do
        case "$arg" in
            "--min" ) min_output=1;;
            * ) usage;;
        esac
    done

    case "$min_output" in
        "0" ) npm_command="npm -s run lint && npm -s run alltest";;
        "1" ) npm_command="npm -s run ci";;
    esac
}

process_args $*

cd $node_root/e2etests
pwd
eval $npm_command

exit $?
