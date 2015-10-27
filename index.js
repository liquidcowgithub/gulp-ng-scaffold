(function () {
    'use strict';

    // through2 is a thin wrapper around node transform streams
    var through = require('through2');
    var gutil = require('gulp-util');
    var gulp = require('gulp');
    var mustache = require('mustache');
    var rename = require('gulp-rename');
    var ngAnnotate = require('gulp-ng-annotate');
    var PluginError = gutil.PluginError;
    var File = require('vinyl');
    var fs = require('fs');


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
        if (operation.type === 'IHttpActionResult' || operation.type === 'array') {
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
                    isPut: operation.method === 'PUT',
                    isPost: operation.method === 'POST',
                    isDelete: operation.method === 'DELETE',
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

    var scaffoldConfig = function () {
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

    function getPaths(model) {
        var paths = [];
        var pathKeys = Object.keys(model.paths);

        for (var i = 0; i < pathKeys.length; i++) {
            var path = model.paths[pathKeys[i]];
            path.url = pathKeys[i];
            paths.push(path);
        }
        return paths;
    }

    function getTags(model) {
        var tags = [];

        var paths = getPaths(model);

        for (var i = 0; i < paths.length; i++) {
            var requestModels = getRequestModelsForPath(paths[i]);
            for (var j = 0; j < requestModels.length; j++) {
                var request = requestModels[j].request;
                tags = tags.concat(request.tags);
            }
        }

        tags = tags.filter(function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
        });

        return tags;
    }

    function getRequestModelsForPath(path) {
        var requestModels = [];
        var requestKeys = Object.keys(path);
        for (var i = 0; i < requestKeys.length; i++) {
            if (requestKeys[i] !== 'url') {
                var requestModel = {
                    url: path.url,
                    action: requestKeys[i].toUpperCase(),
                    request: path[requestKeys[i]]
                };
                requestModels.push(requestModel);
            }
        }
        return requestModels;
    }

    function getPathsForTag(model, tag) {
        var paths = getPaths(model);
        return paths.filter(function onlyForTag(value, index, self) {
            var requestModels = getRequestModelsForPath(value);
            for (var i = 0; i < requestModels.length; i++) {
                for (var j = 0; j < requestModels[i].request.tags.length; j++) {
                    if (requestModels[i].request.tags[j] === tag) {
                        return true
                    }
                }
            }
            return false;
        });
    }

    var firstLetterToLowerCase = function (str) {
        return str.substr(0, 1).toLowerCase() + str.substr(1);
    };

    function getMethodNameFromRequest(request) {
        return firstLetterToLowerCase(request.operationId.split('_')[1]);
    }

    function buildMethodFromRequest(requestModel) {
        var hasPathParameters = false;
        var isArrayResponse = requestModel.request.responses['200'].schema.type === 'array';
        var url = JSON.parse(JSON.stringify(requestModel.url));
        var parameters = []
        for (var i = 0; i < requestModel.request.parameters.length; i++) {
            hasPathParameters = hasPathParameters || requestModel.request.parameters[i].in === 'path';
            var parameter = {
                type: requestModel.request.parameters[i].type,
                name: firstLetterToLowerCase(requestModel.request.parameters[i].name),
                isPathParameter: requestModel.request.parameters[i].in === 'path',
                isBodyParameter: requestModel.request.parameters[i].in === 'body'
            };
            url = url.replace('{' + requestModel.request.parameters[i].name + '}', ':' + parameter.name)
            parameters.push(parameter);
        }

        return {
            action: requestModel.action,
            methodName: getMethodNameFromRequest(requestModel.request),
            url: url,
            parameters: parameters,
            isArrayResponse: isArrayResponse,
            hasPathParameters: hasPathParameters
        }
    }

    function buildResourceModelFromPaths(paths, tag) {

        var methods = [];
        for (var i = 0; i < paths.length; i++) {
            var requestModels = getRequestModelsForPath(paths[i]);
            for (var j = 0; j < requestModels.length; j++) {
                methods.push(buildMethodFromRequest(requestModels[j]))
            }
        }

        var resourceModel = {
            appName: OPTIONS.appName,
            controllerName: tag,
            appEnvironmentName: OPTIONS.resourceConfigName,
            methods: methods
        }

        return resourceModel;
    }




    function buildResourceForTag(model, tag, template) {
        var paths = getPathsForTag(model, tag);
        var resourceModel = buildResourceModelFromPaths(paths, tag);
        return mustache.render(template, resourceModel);
    }

    function buildResources(model, template) {
        var resourceFiles = [];
        var tags = getTags(model);

        for (var i = 0; i < tags.length; i++) {
            var resourceContents = buildResourceForTag(model, tags[i], template);
            var resourceFile = new File({
                cwd: "/",
                base: OPTIONS.resourceOutput + '/',
                path: OPTIONS.resourceOutput + '/' + tags[i] + '.js',
                contents: new Buffer(resourceContents)
            });
            resourceFiles.push(resourceFile);
        }

        return resourceFiles;
    }
    
    
    
    // function transform(file, enc, callback) {
    //     if (file.isNull()) {
    //         return callback(null, file);
    //     }
    //     if (options) {
    //         OPTIONS = options;
    //     }

    //     if (file.isBuffer() || file.isStream()) {
    //         var model = JSON.parse(String(file.contents));
    //         var resourceFiles = buildResources(model);

    //         for (var i = 0; i < resourceFiles.length; i++) {
    //             console.log(resourceFiles[i])
    //             this.push(resourceFiles[i]);
    //         }
    //         //scaffoldResource(model);
    //         //scaffoldTest(model);
    //         //scaffoldConfig();
    //     }

    //     // creating a stream through which each file will pass
    //     var stream = through.obj(function (file, enc, callback) {
    //         if (file.isNull()) {
    //             return callback();
    //         }

    //         if (file.isBuffer() || file.isStream()) {
    //             var model = JSON.parse(String(file.contents));
    //             var resourceFiles = buildResources(model);

    //             for (var i = 0; i < resourceFiles.length; i++) {
    //                 console.log(resourceFiles[i])
    //                 this.push(resourceFiles[i]);
    //             }
    //             //scaffoldResource(model);
    //             //scaffoldTest(model);
    //             //scaffoldConfig();
    //         }



    //         return callback();
    //     });
    // }
    
    
    
    //     var fs = require('fs');


    function readFile(filename, callback) {
        try {
            fs.readFile(filename, 'utf8', callback);
        } catch (e) {
            callback(e);
        }
    }


    function scaffold(options, data, render) {
        return through.obj(function (file, enc, cb) {
            var vm = this;
            readFile('node_modules/gulp-ng-scaffold/templates/angular-resource.mustache', function (templateError, template) {
                
                if (file.isNull()) {
                    cb(null, file);
                    return;
                }

                if (file.isStream()) {
                    cb(new gutil.PluginError('gulp-ng-scaffold', 'Streaming not supported'));
                    return;
                }

                if(templateError){
                  console.log(templateError) ; 
                }
                
                try {
                    var model = JSON.parse(file.contents.toString());
                    var resourceFiles = buildResources(model, template);

                    for (var i = 0; i < resourceFiles.length; i++) {
                        vm.push(resourceFiles[i]);
                    }

                } catch (err) {
                    vm.emit('error', new gutil.PluginError('gulp-ng-scaffold', err, { fileName: file.path }));
                }

                cb();
            });
        });
    }

    module.exports = function (data, options) {
        return scaffold(options, data, true);
    };


})();