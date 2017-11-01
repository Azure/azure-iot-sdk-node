@REM Copyright (c) Microsoft. All rights reserved.
@REM Licensed under the MIT license. See LICENSE file in the project root for full license information.

@setlocal
@echo off

set node-root=%~dp0..
rem // resolve to fully qualified path
for %%i in ("%node-root%") do set node-root=%%~fi

rem ---------------------------------------------------------------------------
rem -- parse script arguments
rem ---------------------------------------------------------------------------

set min-output=0
set integration-tests=0

:args-loop
if "%1" equ "" goto args-done
if "%1" equ "--min" goto arg-min-output
if "%1" equ "--integration-tests" goto arg-integration-tests
call :usage && exit /b 1

:arg-min-output
set min-output=1
goto args-continue

:arg-integration-tests
set integration-tests=1
goto args-continue

:args-continue
shift
goto args-loop

:args-done

rem ---------------------------------------------------------------------------
rem -- create x509 test device
rem ---------------------------------------------------------------------------
if "%OPENSSL_CONF%"=="" (
  echo The OPENSSL_CONF environment variable must be defined in order to generate the x509 certificate for the test device.
  set ERRORLEVEL=1
  goto :eof
)

set IOTHUB_X509_DEVICE_ID=x509device-node-%RANDOM%
call node %node-root%\build\tools\create_device_certs.js --connectionString %IOTHUB_CONNECTION_STRING% --deviceId %IOTHUB_X509_DEVICE_ID%
set IOTHUB_X509_CERTIFICATE=%cd%\%IOTHUB_X509_DEVICE_ID%-cert.pem
set IOTHUB_X509_KEY=%cd%\%IOTHUB_X509_DEVICE_ID%-key.pem

rem ---------------------------------------------------------------------------
rem -- lint and run tests
rem ---------------------------------------------------------------------------

pushd  "%node-root%\build\tools"
echo.
if %integration-tests%==0 (
  echo -- Linting and running unit tests --
  call node build_parallel.js test
)
if %integration-tests%==1 (
  echo -- Linting and running unit + integration tests --
  call node build_parallel.js ci
)
echo.
popd

goto :cleanup

rem ---------------------------------------------------------------------------
rem -- helper subroutines
rem ---------------------------------------------------------------------------

:usage
echo Lint code and run tests.
echo build.cmd [options]
echo options:
echo  --min                 minimize display output
echo  --integration-tests   run integration tests too (unit tests always run)
goto :eof

:cleanup
set EXITCODE=%ERRORLEVEL%
call node %node-root%\build\tools\delete_device.js --connectionString %IOTHUB_CONNECTION_STRING% --deviceId %IOTHUB_X509_DEVICE_ID%
del %IOTHUB_X509_CERTIFICATE%
del %IOTHUB_X509_KEY%
exit /b %EXITCODE%

