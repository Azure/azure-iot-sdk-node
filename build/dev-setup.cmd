@REM Copyright (c) Microsoft. All rights reserved.
@REM Licensed under the MIT license. See LICENSE file in the project root for full license information.

@setlocal
@echo off

set node-root=%~dp0..
REM // resolve to fully qualified path
for %%i in ("%node-root%") do set node-root=%%~fi

cd %node-root%\common\core
echo.
echo -- Creating links for %cd% --
call yarn link
call yarn install

cd %node-root%\common\transport\amqp
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-common
call yarn link
call yarn install

cd %node-root%\common\transport\http
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-common
call yarn link
call yarn install

cd %node-root%\device\core
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-http-base
call yarn link azure-iot-common
call yarn link
call yarn install

cd %node-root%\service
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-common
call yarn link azure-iot-amqp-base
call yarn link azure-iot-http-base
call yarn link
call yarn install

cd %node-root%\device\transport\amqp
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-amqp-base
call yarn link azure-iot-common
call yarn link azure-iot-device
call yarn link azure-iothub
call yarn link
call yarn install

cd %node-root%\device\transport\http
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-http-base
call yarn link azure-iot-common
call yarn link azure-iot-device
call yarn link azure-iothub
call yarn link
call yarn install

cd %node-root%\device\transport\mqtt
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-common
call yarn link azure-iot-device
call yarn link azure-iothub
call yarn link
call yarn install

cd %node-root%\e2etests
echo.
echo -- Creating links for %cd% --
call yarn link azure-iot-common
call yarn link azure-iot-device
call yarn link azure-iot-device-amqp
call yarn link azure-iot-device-http
call yarn link azure-iot-device-mqtt
call yarn link azure-iothub
call yarn install

cd %node-root%\build\tools
echo .
echo -- Setting up links for build tools --
call yarn link azure-iothub
call yarn install