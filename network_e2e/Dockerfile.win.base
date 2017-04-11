FROM microsoft/windowsservercore
RUN @powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET PATH=%PATH%;%ALLUSERPROFILE%\chocolatey\bin
RUN choco install nodejs -yfd
RUN choco install git -yfd
RUN choco install docker -yfd
RUN choco install yarn -yfd
