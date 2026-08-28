@echo off
setlocal
set APP_HOME=%~dp0
set CMD_LINE_ARGS=%*
if defined JAVA_HOME (
  set JAVA_PATH=%JAVA_HOME%\bin\java.exe
) else (
  for /f "delims=" %%i in ('where java') do set JAVA_PATH=%%i
)
"%JAVA_PATH%" -Xmx512m -Dfile.encoding=UTF-8 -cp "%APP_HOME%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
exit /b %ERRORLEVEL%
