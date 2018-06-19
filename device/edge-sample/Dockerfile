FROM iot-hub-module-base:latest

COPY package.json /APP
RUN npm install --unsafe-perm
COPY edge_sample_module.js /APP
WORKDIR /APP
EXPOSE 9229

CMD ["node", "--inspect", "edge_sample_module.js"]
