var util = require('util');
var exec = require('child_process').exec;
var os = require('os');

var WIN_DISABLE_NIC_CMD = 'powershell "Get-NetAdapter | Disable-NetAdapter -Confirm:$false"';
var WIN_ENABLE_NIC_CMD = 'powershell "Get-NetAdapter | Enable-NetAdapter -Confirm:$false"';
var LINUX_DISABLE_NIC_CMD = 'ifdown eth0';
var LINUX_ENABLE_NIC_CMD = 'ifup eth0';
var DOCKER_DISCONNECT_NETWORK = 'docker -H %s network disconnect %s %s';
var DOCKER_CONNECT_NETWORK = 'docker -H %s network connect %s %s';
var WIN_DOCKER_SOCKET = process.env.DOCKER_HOST;
var LINUX_DOCKER_SOCKET = '/var/run/docker.sock';
var WIN_ADD_FIREWALL_RULE = 'powershell "New-NetFirewallRule -DisplayName %s -Direction Outbound -Protocol Tcp -Action Block -RemotePort %s"';
var WIN_DEL_FIREWALL_RULE = 'powershell "Remove-NetFirewallRule -DisplayName %s"';
var LINUX_ADD_FIREWALL_RULE = '';
var LINUX_DEL_FIREWALL_RULE = '';
var AMQP_FIREWALL_RULE_NAME = 'BlockAmqp';
var MQTT_FIREWALL_RULE_NAME = 'BlockMqtt';
var HTTPS_FIREWALL_RULE_NAME = 'BlockHttps';
var AMQP_PORT = 5671;
var MQTT_PORT = 8883;
var HTTPS_PORT = 443;

module.exports = {
  docker: {
    disconnectNetwork: function(callback) {
      var socket =  module.exports[process.platform].getDockerSocket();
      var natName = 'nat';
      var hostname = module.exports[process.platform].getContainerId();
      exec(util.format(DOCKER_DISCONNECT_NETWORK, socket, natName, hostname), callback);
    }
  },
  win32: {
    disableNic: function (callback) {
      exec(WIN_DISABLE_NIC_CMD, callback);
    },
    getContainerId: function() {
      return os.hostname();
    },
    getDockerSocket: function(callback) {
      return WIN_DOCKER_SOCKET;
    },
    blockAmqp: function(callback) {
      exec(util.format(WIN_ADD_FIREWALL_RULE, AMQP_FIREWALL_RULE_NAME, AMQP_PORT), callback);
    },
    blockMqtt: function(callback) {
      exec(util.format(WIN_ADD_FIREWALL_RULE, MQTT_FIREWALL_RULE_NAME, MQTT_PORT), callback);
    },
    blockHttps: function(callback) {
      exec(util.format(WIN_ADD_FIREWALL_RULE, HTTPS_FIREWALL_RULE_NAME, HTTPS_PORT), callback);
    }
  },
  linux: {
    disableNic: function (callback) {
      exec(LINUX_DISABLE_NIC_CMD, callback);
    },
    getContainerId: function() {
      return process.env.HOSTNAME;
    },
    getDockerSocket: function(callback) {
      return LINUX_DOCKER_SOCKET;
    },
    blockAmqp: function(callback) {
      exec(util.format(LINUX_ADD_FIREWALL_RULE, AMQP_FIREWALL_RULE_NAME, AMQP_PORT), callback);
    },
    blockMqtt: function(callback) {
      exec(util.format(LINUX_ADD_FIREWALL_RULE, MQTT_FIREWALL_RULE_NAME, MQTT_PORT), callback);
    },
    blockHttps: function(callback) {
      exec(util.format(LINUX_ADD_FIREWALL_RULE, HTTPS_FIREWALL_RULE_NAME, HTTPS_PORT), callback);
    }
  }
};