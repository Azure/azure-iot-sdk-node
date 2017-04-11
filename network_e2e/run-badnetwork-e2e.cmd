@setlocal
@echo off

set PROTOCOL=%1
set TESTNAME=%2

set SDK_ROOT=C:\\node-sdk
set TESTS_ROOT=%SDK_ROOT%\\network_e2e\\tests

pushd %TESTS_ROOT%
call node run-badnetwork-e2e.js --protocol=%PROTOCOL% --testName=%TESTNAME% --deviceConnectionString=%DEVICE_CONNECTION_STRING%
set exitcode=%errorlevel%
popd

:exitcode
exit /b %exitcode%

@endlocal
