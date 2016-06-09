@echo off
SETLOCAL enableextensions ENABLEDELAYEDEXPANSION

rem Example script to start OpenFinRVM from ChromeDriver.  Basically it needs to catch --remote-debugging-port set by ChromeDriver and pass to RVM as runtime arguments

Set filename=%0
set filename=%filename:"=%

For %%A in ("%filename%") do (
    Set Folder=%%~dpA
)

:again
if not "%1" == "" (
    if "%1" == "--remote-debugging-port" (
        set remoteDebugAddress=%2
    )
    if "%1" == "--config" (
        set appConfig=%2
    )
    shift
    goto again
)


cd %Folder%
start %Folder%OpenFinRVM.exe --config=%appConfig% --runtime-arguments="--remote-debugging-port=%remoteDebugAddress%"

endlocal