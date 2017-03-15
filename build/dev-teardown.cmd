@REM Copyright (c) Microsoft. All rights reserved.
@REM Licensed under the MIT license. See LICENSE file in the project root for full license infounlinkation.

@setlocal
@echo off

set node-root=%~dp0..
REM // resolve to fully qualified path
for %%i in ("%node-root%") do set node-root=%%~fi

cd %node-root%\build\tools
echo .
echo -- Removing links for build tools --
call yarn unlink azure-iothub

cd %node-root%\e2etests
echo.
echo -- Removing links for %cd% --
call yarn unlink azure-iothub
call yarn unlink azure-iot-device-mqtt
call yarn unlink azure-iot-device-http
call yarn unlink azure-iot-device-amqp
call yarn unlink azure-iot-device
call yarn unlink azure-iot-common

cd %node-root%\device\transport\mqtt
echo -- Removing links for %cd% --
call yarn unlink
call yarn unlink azure-iothub
call yarn unlink azure-iot-device
call yarn unlink azure-iot-common

cd %node-root%\device\transport\http
echo -- Removing links for %cd% --
call yarn unlink
call yarn unlink azure-iothub
call yarn unlink azure-iot-device
call yarn unlink azure-iot-common
call yarn unlink azure-iot-http-base

cd %node-root%\device\transport\amqp
echo -- Removing links for %cd% --
call yarn unlink
call yarn unlink azure-iothub
call yarn unlink azure-iot-device
call yarn unlink azure-iot-common
call yarn unlink azure-iot-amqp-base

cd %node-root%\service
echo -- Removing links for %cd% --
call yarn unlink
call yarn unlink azure-iot-http-base
call yarn unlink azure-iot-amqp-base
call yarn unlink azure-iot-common

cd %node-root%\device\core
echo -- Removing links for %cd% --
call yarn unlink
call yarn unlink azure-iot-common
call yarn unlink azure-iot-http-base

cd %node-root%\common\transport\http
echo -- Removing links for %cd% --
call yarn unlink
call yarn unlink azure-iot-common

cd %node-root%\common\transport\amqp
echo -- Removing links for %cd% --
call yarn unlink
call yarn unlink azure-iot-common

cd %node-root%\common\core
echo -- Removing links for %cd% --
call yarn unlink