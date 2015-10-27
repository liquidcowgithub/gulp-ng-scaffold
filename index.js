(function () {
    'use strict';

    // through2 is a thin wrapper around node transform streams
    var through = require('through2');
    var gutil = require('gulp-util');
    var mustache = require('mustache');
    var PluginError = gutil.PluginError;
    var File = require('vinyl');
    var fs = require('fs');
    var extend = require('node.extend');


    // consts
    var PLUGIN_NAME = 'gulp-ng-scaffold';

    var OPTIONS = {
        debug: true,

        appName: 'myApp',

        resourceOutput: '.build/resources',

        testsOutput: '.build/tests',

        serverBase: 'http://webapi.myApp.local/',

        resourceConfigName: 'resourceConfig',
    };

    var buildTestUrl = function (url, parameters) {
        var testPath = url;
        for (var index in parameters) {
            if (parameters.hasOwnProperty(index)) {
                 testPath = testPath.replace(':' + parameters[index].name, parameters[index].testValue);
            }
        }
        return testPath;
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
        var isGet = false || requestModel.action === 'GET';
        var hasPathParameters = false;
        var hasBodyParameters = false;
        var isArrayResponse = requestModel.request.responses['200'].schema.type === 'array';
        var url = JSON.parse(JSON.stringify(requestModel.url));
        var parameters = []
        for (var i = 0; i < requestModel.request.parameters.length; i++) {
            hasPathParameters = hasPathParameters || requestModel.request.parameters[i].in === 'path';
            hasBodyParameters = hasBodyParameters || requestModel.request.parameters[i].in === 'body';
            var parameter = {
                type: requestModel.request.parameters[i].type,
                name: firstLetterToLowerCase(requestModel.request.parameters[i].name),
                isPathParameter: requestModel.request.parameters[i].in === 'path',
                isBodyParameter: requestModel.request.parameters[i].in === 'body',
                isStringParameter: requestModel.request.parameters[i].type === 'string'
            };

            if (parameter.type === 'integer' || parameter.type === 'long' || parameter.type === 'double' || parameter.type === 'float' || parameter.type === 'decimal') {
                parameter.testValue = 1;
            }

            if (parameter.type === 'string') {
                parameter.testValue = 'test';
            }

            if (parameter.type === 'char') {
                parameter.testValue = 'a';
            }

            if (parameter.type === 'bool' || parameter.type === 'boolean') {
                parameter.testValue = true;
            }

            if (parameter.type === 'Guid') {
                parameter.testValue = '25892e17-80f6-415f-9c65-7395632f0223';
            }
            
            if(parameter.type === undefined){
                parameter.type = 'object';
                parameter.testValue = '{}';
            }
            url = url.replace('{' + requestModel.request.parameters[i].name + '}', ':' + parameter.name)
            parameters.push(parameter);
        }

        for (var j = 0; j < parameters.length; j++) {
            parameters[j].hasBodyAndPathParameters = hasPathParameters && hasBodyParameters;
        }
        
        return {
            action: requestModel.action,
            methodName: getMethodNameFromRequest(requestModel.request),
            url: url,
            parameters: parameters,
            isGet: isGet,
            isArrayResponse: isArrayResponse,
            hasParameters: hasPathParameters || hasBodyParameters,
            hasPathParameters: hasPathParameters,
            hasBodyParameters: hasBodyParameters,
            hasBodyAndPathParameters: hasPathParameters && hasBodyParameters,
            testUrl: buildTestUrl(url, parameters)
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

    function buildResourceTests(model, template) {
        var resourceFiles = [];
        var tags = getTags(model);

        for (var i = 0; i < tags.length; i++) {
            var resourceContents = buildResourceForTag(model, tags[i], template);
            var resourceFile = new File({
                cwd: "/",
                base: OPTIONS.resourceOutput + '/',
                path: OPTIONS.resourceOutput + '/' + tags[i] + '.spec.js',
                contents: new Buffer(resourceContents)
            });
            resourceFiles.push(resourceFile);
        }

        return resourceFiles;
    }
    
    function buildResourceConfig(model, template) {
        var resourceContents = mustache.render(template, model);
            var resourceConfigFile = new File({
                cwd: "/",
                base: OPTIONS.resourceOutput + '/',
                path: OPTIONS.resourceOutput + '/resource.config.js',
                contents: new Buffer(resourceContents)
            });
            return resourceConfigFile
    }

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

            if (file.isNull()) {
                cb(null, file);
                return;
            }

            if (file.isStream()) {
                cb(new gutil.PluginError('gulp-ng-scaffold', 'Streaming not supported'));
                return;
            }

            OPTIONS = extend(true, OPTIONS, options);

            vm.cb = function () {
                if (vm.resourcesScaffolded && vm.testsScaffolded && vm.configScaffolded) {
                    cb();
                }
            }

            readFile('node_modules/gulp-ng-scaffold/templates/angular-resource.mustache', function (templateError, template) {
                if (templateError) {
                    console.log(templateError);
                }

                try {
                    var model = JSON.parse(file.contents.toString());
                    var resourceFiles = buildResources(model, template);

                    for (var i = 0; i < resourceFiles.length; i++) {
                        vm.push(resourceFiles[i]);
                    }
                    vm.resourcesScaffolded = true;
                    vm.cb()

                } catch (err) {
                    vm.emit('error', new gutil.PluginError('gulp-ng-scaffold', err, { fileName: file.path }));
                }
            });

            readFile('node_modules/gulp-ng-scaffold/templates/angular-resource-test.mustache', function (templateError, template) {
                if (templateError) {
                    console.log(templateError);
                }

                try {
                    var model = JSON.parse(file.contents.toString());
                    var resourceTestFiles = buildResourceTests(model, template);

                    for (var i = 0; i < resourceTestFiles.length; i++) {
                        vm.push(resourceTestFiles[i]);
                    }
                    vm.testsScaffolded = true;
                    vm.cb()

                } catch (err) {
                    vm.emit('error', new gutil.PluginError('gulp-ng-scaffold', err, { fileName: file.path }));
                }
            });
            
            readFile('node_modules/gulp-ng-scaffold/templates/resource.config.mustache', function (templateError, template) {
                if (templateError) {
                    console.log(templateError);
                }

                try {
                    var resourceConfigFile = buildResourceConfig(OPTIONS, template);

                    vm.push(resourceConfigFile);
                    
                    vm.configScaffolded = true;
                    vm.cb()

                } catch (err) {
                    vm.emit('error', new gutil.PluginError('gulp-ng-scaffold', err, { fileName: file.path }));
                }
            });
        });
    }

    module.exports = function (options, data) {
        return scaffold(options, data, true);
    };


})();