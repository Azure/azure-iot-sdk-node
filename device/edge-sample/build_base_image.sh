#!/bin/bash

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

tar -czh . | docker build -t iot-hub-module-base:latest -f Dockerfile.base -
exit $?


