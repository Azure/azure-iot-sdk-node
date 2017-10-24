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

:args-loop
if "%1" equ "" goto args-done
if "%1" equ "--min" goto arg-min-output
call :usage && exit /b 1

:arg-min-output
set min-output=1
goto args-continue

:args-continue
shift
goto args-loop

:args-done

if %min-output%==0 set "npm-command=npm -s run lint && npm -s run alltest"
if %min-output%==1 set "npm-command=npm -s run ci"

rem ---------------------------------------------------------------------------
rem -- create x509 test device
rem ---------------------------------------------------------------------------
if "%OPENSSL_CONF%"=="" (
  echo The OPENSSL_CONF environment variable must be defined in order to generate the x509 certificate for the test device.
  set ERRORLEVEL=1
  goto :eof
)

rem ---------------------------------------------------------------------------
rem -- lint and run tests
rem ---------------------------------------------------------------------------

if %e2e-tests%==1 (
  call :lint-and-test %node-root%\e2etests
  if errorlevel 1 goto :cleanup
)

goto :cleanup


rem ---------------------------------------------------------------------------
rem -- helper subroutines
rem ---------------------------------------------------------------------------

:usage
echo Run e2e tests.
echo e2etests.cmd [options]
echo options:
echo  --min                 minimize display output
goto :eof

:lint-and-test
cd "%1"
echo %cd%
call %npm-command%
goto :eof

:cleanup
exit /b %ERRORLEVEL%

