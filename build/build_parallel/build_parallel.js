// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

const path = require('path');
const fs = require('fs');
const findRoot = require('find-root');
const runAll = require('npm-run-all');
const async = require('async');
const promisify = require('es6-promisify');
var EventEmitter = require('events');
var config = require('./config.json');
const debug = require('debug')('azure-iot-tools-build-parallel');

// See section titled "About MaxListenersExceededWarning" in https://github.com/mysticatea/npm-run-all/blob/HEAD/docs/node-api.md
EventEmitter.defaultMaxListeners = 30;

/**
 * Print usage information
 */
var usage = function () {
  console.log('usage: node ' + __filename + ' task');
  console.log('where task is one of:');
  for (var taskName in config.tasks) {
    if (config.tasks.hasOwnProperty(taskName)) {
      console.log("  " + taskName + " - " + config.tasks[taskName].description);
    }
  }
};

/**
 * Do miscellaneous work necessary to set up the running of this script.
 */
var initializeEnvironment = promisify(function (callback) {
  let taskName = (process.argv.length > 2 && process.argv[2]) || 'teardown';
  config.task = config.tasks[taskName];
  if (!config.task) {
    usage();
    process.exit(1);
  }
  config.task.name = taskName;

  config.gitRoot = findRoot(__dirname, function (dir) {
    return fs.existsSync(path.resolve(dir, '.gitattributes'));
  });

  let tempDir = path.join(__dirname, 'temp');
  try {
    fs.statSync(tempDir).isDirectory();
  } catch (err) {
    fs.mkdirSync(tempDir);
  }
  process.chdir(tempDir);

  config.tempPackageJsonFilename = path.join(tempDir, 'package.json');

  callback();
});

/**
 * Loop through the project array in the config file and build structure to make the script easier to run (such as adding dependency links directly to project objects)
 */
var preprocessConfigFile = promisify(function (callback) {
  let tempProjectObject = {}; // for easy lookup

  // In the first sweep, we set the path, populate package.json, set the name property and build the tempProjectObject object
  for (let i = 0; i < config.projects.length; i++) {
    let project = config.projects[i];
    project.fullpath = path.join(config.gitRoot, project.directory);
    project.packageJson = require(path.join(project.fullpath, 'package.json'));
    project.name = project.packageJson.name;
    project.dependencies = [];
    project.consumers = [];
    if (project['skip_' + config.task.name]) {
      project.runTask = false;
      debug('skipping ' + project.name);
    } else {
      project.runTask = true;
      tempProjectObject[project.name] = project;
    }
  }

  // In the second sweep. we build arrays of dependencies and consumers
  for (let i = 0; i < config.projects.length; i++) {
    let project = config.projects[i];
    [
      'dependencies',
      'devDependencies'
    ].forEach(function (dependencyList) {
      for (var dependency in project.packageJson[dependencyList]) {
        if (project.packageJson[dependencyList].hasOwnProperty(dependency)) {
          if (!!tempProjectObject[dependency]) {
            debug(project.name + ' depends on ' + dependency);
            project.dependencies.push(tempProjectObject[dependency]);
            tempProjectObject[dependency].consumers.push(project);
          }
        }
      }
    });
  }
  callback();
});

/**
 * make a temporary package.json file that we can use to run our npm scripts
 */
var makeTemporaryPackageJson = promisify(function (callback) {
  var packageJson = { 'scripts': {} };

  for (let i = 0; i < config.projects.length; i++) {
    let project = config.projects[i];
    var command = config.task.command;
    command = command.replace(/{fullpath}/g, project.fullpath);
    if (config.task.hasOwnProperty('perDependencyCommand')) {
      var dependencyCommand = '';
      for (let i = 0; i < project.dependencies.length; i++) {
        dependencyCommand += config.task.perDependencyCommand.replace(/{dependency}/g, project.dependencies[i].name);
      }
      command = command.replace(/{perDependencyCommand}/g, dependencyCommand);
    }
    debug('command to build ' + project.name + ' is "' + command + '"');
    packageJson.scripts[config.task.name + '_' + project.name] = command;
  }
  fs.writeFile(config.tempPackageJsonFilename, JSON.stringify(packageJson, null, '  '), callback);
});

/**
 * Helper function that tells us if all projects have been built
 */
var allProjectsCompleted = function () {
  for (let i = 0; i < config.projects.length; i++) {
    if (config.projects[i].runTask && !config.projects[i].completed) {
      return false;
    }
  }
  return true;
};

/**
 * helper function that tells us if we're ready to run the task on a given project
 */
var readyToRunTask = function (project) {
  if (project.runTask === false) {
    // If we aren't building it, then we're not ready to run it.  Simple 'nuf
    return false;
  } else if (config.task.doConsumersFirst) {
    // If we do consumers first, then we only run it after our consumers are done.
    // e.g. teardown.  we don't teardown a project until after we teardown all of
    // it's consumers
    for (let i = 0; i < project.consumers.length; i++) {
      if (!project.consumers[i].completed) {
        return false;
      }
    }

    return true;
  } else {
    // If we're not doing consumers first, we're doing dependencies first.  This is the
    // normal case (build, test, setup, etc).  We first do our dependencies, then we
    // do ourselves.
    for (let i = 0; i < project.dependencies.length; i++) {
      if (!project.dependencies[i].completed) {
        return false;
      }
    }
    return true;
  }
};

// make a list of npm scripts to run for this build.
var makeTaskList = promisify(function (callback) {
  var taskList = [];

  while (!allProjectsCompleted()) {
    var buildInThisStep = [];

    for (let i = 0; i < config.projects.length; i++) {
      let project = config.projects[i];
      if (!project.completed && readyToRunTask(project)) {
        buildInThisStep.push(project);
      }
    }

    var npmScripts = [];
    for (let i = 0; i < buildInThisStep.length; i++) {
      let project = buildInThisStep[i];
      project.completed = true;
      npmScripts.push(config.task.name + '_' + project.name);
    }

    if (npmScripts.length > 0) {
      taskList.push(npmScripts);
    }
  }

  callback(null, taskList);
});

/**
 * Helper that makes a function which runs the given NPM scripts in parallel
 */
var makeTaskFunction = function (subtasks) {
  var options = {
    parallel: true,
    continueOnError: true,
    printLabel: true,
    stdout: process.stdout,
    stderr: process.stderr
  };

  var subtaskname = '[' + subtasks.join(', ').replace(/^(.*), (.*)$/, '$1, & $2') + ']';

  var func = function (done) {
    console.log();
    console.log();
    console.log('running ' + subtaskname);
    runAll(subtasks, options)
      .then((results) => {
        console.log();
        console.log("done with " + subtaskname);
        for (let i = 0; i < results.length; i++) {
          console.log(results[i].name + ' : ' + (results[i].code === 0 ? 'succeeded' : 'failed'));
        }
        done();
      })
      .catch(err => {
        console.log("failed " + subtaskname);
        console.log(err.message);
        for (let i = 0; i < err.results.length; i++) {
          console.log(err.results[i].name + ' : ' + (err.results[i].code === 0 ? 'succeeded' : 'failed'));
        }
        if (config.task.continueOnError) {
          done();
        } else {
          done(new Error());
        }
      });
  };

  return func;
};

/**
 * convert a list of npm scripts to run into a list of functions that run those scripts
 */
var convertTaskListToFunctionList = promisify(function (taskList, callback) {
  var functionList = [];
  for (let i = 0; i < taskList.length; i++) {
    let subTask = taskList[i];
    functionList.push(makeTaskFunction(subTask));
  }
  callback(null, functionList);
});

/**
 * run an array of functions in series
 */
var runInSeries = promisify(function (functionList, callback) {
  async.series(functionList, callback);
});

var exitCode;
initializeEnvironment()
  .then(() => preprocessConfigFile() )
  .then(() => makeTemporaryPackageJson() )
  .then(() => makeTaskList() )
  .then(taskList => convertTaskListToFunctionList(taskList))
  .then(functionList => runInSeries(functionList))
  .then(() => {
    console.log();
    console.log('job succeeded');
    exitCode = 0;
  })
  .catch(err => {
    console.log();
    console.log('job failed: ' + err.toString());
    console.log(err.stack);
    exitCode = 1;
  })
  .then(() => {
    fs.unlink(config.tempPackageJsonFilename);
    process.exit(exitCode);
  });
