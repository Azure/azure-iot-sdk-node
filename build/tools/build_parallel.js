// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

var path = require('path');
var fs = require('fs');
var findRoot = require('find-root');
var util = require('util');
var runAll = require('npm-run-all');
var async = require('async');
var EventEmitter = require('events');

// See section titled "About MaxListenersExceededWarning" in https://github.com/mysticatea/npm-run-all/blob/HEAD/docs/node-api.md
EventEmitter.defaultMaxListeners = 30;

var usage = function() {
  console.log('usage: node ' + __filename + ' task');
  console.log('where task is one of:');
  var tasks = require('./projects.json').tasks;
  Object.keys(tasks).forEach(function(taskName) {
    var task = tasks[taskName];
    console.log("  " + taskName + " - " + task.description);
  });
;}

var taskName = (process.argv.length > 2 && process.argv[2]) || 'test';
var task = require('./projects.json').tasks[taskName];
if (!task) {
  usage();
  process.exit(1);
}

console.log('dirname is ' + __dirname);
var gitRoot = findRoot(__dirname, function (dir) {
  return fs.existsSync(path.resolve(dir, '.gitattributes'));
});

// ingest projects.json
var readProjectFile = function() {
  var projectList = require('./projects.json').projects;
  var projects = {};
  projectList.forEach(function (project) {
    project.fullpath = path.join(gitRoot, project.directory);
    var packageJson = require(path.join(project.fullpath, 'package.json'));
    project.dependencies = packageJson.dependencies;
    project.name = packageJson.name;
    projects[project.name] = project;
  });
  return projects;
};
var projects = readProjectFile();

// helper to see if we run the current task for a given project`
var needToRunTask = function(project) {
  return (!project.hasOwnProperty(taskName) || !!project[taskName]);
};

// make a temporary package.json to run our scripts
var tempDir, packageJsonFilename;
var makePackageJson = function() {
  tempDir = path.join(__dirname, 'temp');
  try {
    fs.statSync(tempDir).isDirectory();
  } catch (err) {
    fs.mkdirSync(tempDir);
  }

  var packageJson = { 'scripts' : {} };

  Object.keys(projects).forEach(function (projectName) {
    var project = projects[projectName];
    if (needToRunTask(project)) {
      var command = task.command;
      command = command.replace(/{fullpath}/g, project.fullpath);
      if (task.hasOwnProperty('perDependencyCommand')) {
        var dependencyCommand = '';
        Object.keys(project.dependencies).forEach(function(dependencyName) {
          if (!!projects[dependencyName]) {
            dependencyCommand += task.perDependencyCommand.replace(/{dependency}/g, dependencyName);
          }
        });
        command = command.replace(/{perDependencyCommand}/g, dependencyCommand);
      }
      packageJson.scripts[taskName + '_' + project.name] = command;
    }
  });
  packageJsonFilename = path.join(tempDir, 'package.json');
  fs.writeFileSync(packageJsonFilename, JSON.stringify(packageJson,null,'  '));
};
makePackageJson();

// helper to know if all projects have been built
var allProjectsCompleted = function() {
  var allDone = true;
  Object.keys(projects).forEach(function (projectName) {
    var project = projects[projectName];
    if (!project.completed) {
      allDone = false;
    }
  });
  return allDone;
};

// helper to know if all dependencies of a given project have been built
var allDependenciesSatisfied = function(project) {
  var allSatisfied = true;
  Object.keys(project.dependencies).forEach(function(dependencyName) {
    var dependencyProject = projects[dependencyName];
    if (dependencyProject && !dependencyProject.completed) {
      allSatisfied = false;
    }
  });
  return allSatisfied;
};

// make a list of npm scripts to run for this build.
var makeTaskList = function() {
  var taskList = [];
  while (!allProjectsCompleted())
  {
    var build_now = [];
    Object.keys(projects).forEach(function(projectName) {

      var project = projects[projectName];
      if (!project.completed) {
        if (allDependenciesSatisfied(project)) {
          build_now.push(project);
        }
      }
    });

    var npmScripts = [];
    build_now.forEach(function (project) {
      project.completed = true;
      if (needToRunTask(project)) {
        npmScripts.push(taskName + '_' + project.name);
      }
    });

    if (npmScripts.length > 0) {
      taskList.push(npmScripts);
    }
  }
  return taskList;
}
var taskList = makeTaskList();

// using the list of NPM scripts, make a list of functions to run in series
var options = {
  parallel: true,
  continueOnError: !!task.continueOnError,
  printLabel: true,
  stdout: process.stdout,
  stderr: process.stderr };

process.chdir(tempDir);
var tasks = [];
taskList.forEach(function (subtasks) {
  tasks.push(function(done) {
    var subtaskname = '[' + subtasks.join(', ').replace(/^(.*), (.*)$/, '$1, & $2') + ']';
    console.log();
    console.log();
    console.log('running ' + subtaskname );
    runAll(subtasks, options)
    .then((results) => {
        console.log();
        console.log("done with " + subtaskname);
        results.forEach(function(result) {
          console.log(result.name + ' : ' + (result.code == 0 ? 'succeeded' : 'failed'));
        });
        done();
    })
    .catch(err => {
        console.log("failed " + subtaskname);
        console.log(err.message);
        err.results.forEach(function(result) {
          console.log(result.name + ' : ' + (result.code == 0 ? 'succeeded' : 'failed'));
        });
        done(new Error());
    });
  });
});

// Finally, run our functions to build everything in order.
async.series(tasks, function(err) {
  if (err) {
    console.log();
    console.log('job failed');
    fs.unlink(packageJsonFilename);
    process.exit(1);
  } else {
    console.log();
    console.log('job succeeded');
    fs.unlink(packageJsonFilename);
    process.exit(0);
  }
});






