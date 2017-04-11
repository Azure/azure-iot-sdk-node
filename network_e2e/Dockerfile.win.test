FROM networke2e/node-base
ARG SDK_ROOT
COPY . $SDK_ROOT
ENV SDK_ROOT=$SDK_ROOT
RUN %SDK_ROOT%\build\dev-setup.cmd --network_e2e
