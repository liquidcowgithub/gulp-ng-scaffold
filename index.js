(function () {
    'use strict';

    // through2 is a thin wrapper around node transform streams
    var through = require('through2');
    var gutil = require('gulp-util');
    var gulp = require('gulp');
    var mustache = require('gulp-mustache');
    var rename = require('gulp-rename');
    var ngAnnotate = require('gulp-ng-annotate');
    var PluginError = gutil.PluginError;


    // consts
    var PLUGIN_NAME = 'gulp-ng-scaffold';

    var OPTIONS = {
        debug: true,
        
        appName: 'myApp',

        resourceOutput: '.build/resources',
        
        testsOutput: '.build/tests',
        
        serverBase: 'http://webapi.myApp.local/',
        
        resourceConfigName: 'resourceConfig',
        
        ngAnnotateOptions: {
            remove: true,
            add: true,
            single_quotes: true
        }
    };

    var firstLetterToUpperCase = function (str) {
        return str.substr(0, 1).toLowerCase() + str.substr(1);
    };

    var checkIsArrayResponse = function (operation) {
        if (operation.type === 'IHttpActionResult') {
            return true;
        }
        return false;
    };

    var buildParameters = function (parameters) {
        var testParameters = [];
        for (var index in parameters) {
            if (parameters.hasOwnProperty(index)) {
                var parameter = parameters[index];
                var testValue = "{}";
                var isStringParameter = false;

                if (parameter.type === 'integer' || parameter.type === 'long' || parameter.type === 'double' || parameter.type === 'float' || parameter.type === 'decimal') {
                    testValue = 1;
                }

                if (parameter.type === 'string') {
                    isStringParameter = true;
                    testValue = 'test';
                }

                if (parameter.type === 'char') {
                    isStringParameter = true;
                    testValue = 'a';
                }

                if (parameter.type === 'bool' || parameter.type === 'boolean') {
                    testValue = true;
                }

                if (parameter.type === 'Guid') {
                    isStringParameter = true;
                    testValue = '25892e17-80f6-415f-9c65-7395632f0223';
                }

                var isPathParameter = parameter.paramType === 'path';
                var isBodyParameter = parameter.paramType === 'body';

                testParameters.push({
                    paramType: parameter.paramType,
                    name: parameter.name,
                    required: parameter.required,
                    type: parameter.type,
                    format: parameter.format,
                    testValue: testValue,
                    isPathParameter: isPathParameter,
                    isBodyParameter: isBodyParameter,
                    isStringParameter: isStringParameter
                });
            }

        }
        return testParameters;
    };

    var buildPath = function (path, parameters) {
        var testPath = path;
        for (var index in parameters) {
            if (parameters.hasOwnProperty(index)) {
                var parameter = parameters[index];
                testPath = testPath.replace('{' + parameter.name + '}', ':' + parameter.name);
            }
        }
        return testPath;
    };

    var buildTestPath = function (path, parameters) {
        var testPath = path;
        for (var index in parameters) {
            if (parameters.hasOwnProperty(index)) {
                var parameter = parameters[index];
                if (parameter.type === 'integer' || parameter.type === 'long' || parameter.type === 'double' || parameter.type === 'float' || parameter.type === 'decimal') {
                    testPath = testPath.replace('{' + parameter.name + '}', '1');
                }

                if (parameter.type === 'string') {
                    testPath = testPath.replace('{' + parameter.name + '}', 'test');
                }

                if (parameter.type === 'char') {
                    testPath = testPath.replace('{' + parameter.name + '}', 'a');
                }

                if (parameter.type === 'bool' || parameter.type === 'boolean') {
                    testPath = testPath.replace('{' + parameter.name + '}', 'true');
                }

                if (parameter.type === 'Guid') {
                    testPath = testPath.replace('{' + parameter.name + '}', '25892e17-80f6-415f-9c65-7395632f0223');
                }
            }
        }
        return testPath;
    };

    var checkPathParameters = function (parameters) {
        for (var index in parameters) {
            if (parameters.hasOwnProperty(index)) {
                if (parameters[index].isPathParameter) {
                    return true;
                }
            }
        }
        return false;
    };


    var checkBodyParameters = function (parameters) {
        for (var index in parameters) {
            if (parameters.hasOwnProperty(index)) {
                if (parameters[index].isBodyParameter) {
                    return true;
                }
            }
        }
        return false;
    };

    var addMethods = function (methods, controllerName, api) {
        for (var index in api.operations) {
            if (api.operations.hasOwnProperty(index)) {

                var operation = api.operations[index];

                var parameters = buildParameters(operation.parameters);

                var method = {
                    methodName: firstLetterToUpperCase(operation.nickname.replace(controllerName + '_', '')),
                    path: buildPath(api.path, operation.parameters),
                    testPath: buildTestPath(api.path, operation.parameters),
                    action: operation.method,
                    parameters: parameters,
                    isGet: operation.method === 'GET',
                    isArrayResponse: checkIsArrayResponse(operation),
                    hasBodyParameters: checkBodyParameters(parameters),
                    hasPathParameters: checkPathParameters(parameters),
                    hasBodyAndPathParameters: checkBodyParameters(parameters) && checkPathParameters(parameters),
                    hasParameters: checkBodyParameters(parameters) || checkPathParameters(parameters)
                };
                methods.push(method);
            }
        }
    };

    var scaffoldResource = function (controller) {
        var controllerName = controller.resourcePath.replace('/', '');

        var methods = [];

        for (var index in controller.apis) {
            if (controller.apis.hasOwnProperty(index)) {
                var api = controller.apis[index];


                addMethods(methods, controllerName, api);
            }
        }

        gulp.src("node_modules/gulp-ng-scaffold/templates/angular-resource.mustache")
            .pipe(mustache({
                controllerName: controllerName,
                appName: OPTIONS.appName,
                appEnvironmentName: OPTIONS.resourceConfigName,
                methods: methods
            }))
            .pipe(ngAnnotate(OPTIONS.ngAnnotateOptions))
            .pipe(rename(controllerName.toLowerCase() + '.js'))
            .pipe(gulp.dest(OPTIONS.resourceOutput))
            .on('error', gutil.log);
    };

    var scaffoldTest = function (controller) {
        var controllerName = controller.resourcePath.replace('/', '');

        var methods = [];

        for (var index in controller.apis) {
            if (controller.apis.hasOwnProperty(index)) {
                var api = controller.apis[index];


                addMethods(methods, controllerName, api);
            }
        }

        gulp.src("node_modules/gulp-ng-scaffold/templates/angular-resource-test.mustache")
            .pipe(mustache({
                controllerName: controllerName,
                appName: OPTIONS.appName,
                appEnvironmentName: OPTIONS.resourceConfigName,
                methods: methods
            }))
            .pipe(ngAnnotate(OPTIONS.ngAnnotateOptions))
            .pipe(rename(controllerName.toLowerCase() + '.spec.js'))
            .pipe(gulp.dest(OPTIONS.testsOutput))
            .on('error', gutil.log);
    };
    
    var scaffoldConfig = function(){
        gulp.src("node_modules/gulp-ng-scaffold/templates/resource.config.mustache")
            .pipe(mustache({
                appName: OPTIONS.appName,
                configName: OPTIONS.resourceConfigName,
                serverBase: OPTIONS.serverBase,
                debug: OPTIONS.debug
            }))
            .pipe(ngAnnotate(OPTIONS.ngAnnotateOptions))
            .pipe(rename('resource.config.js'))
            .pipe(gulp.dest(OPTIONS.resourceOutput))
            .on('error', gutil.log);
    };

    // plugin level function (dealing with files)
    function ngScaffold(options) {
        if (options) {
            OPTIONS = options;
        }

        // creating a stream through which each file will pass
        var stream = through.obj(function (file, enc, callback) {
            if (file.isNull()) {
                return callback();
            }

            if (file.isBuffer()) {
                var model = JSON.parse(String(file.contents));
                scaffoldResource(model);
                scaffoldTest(model);
                scaffoldConfig();
            }

            if (file.isStream()) {
                var model = JSON.parse(String(file.contents));
                scaffoldResource(model);
                scaffoldTest(model);
                scaffoldConfig();
            }

            this.push(file);

            return callback();
        });

        // returning the file stream
        return stream;
    };

    // exporting the plugin main function
    module.exports = ngScaffold;
})();