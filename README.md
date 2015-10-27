gulp-ng-scaffold
================
Angular resource scaffolding from Swagger specifications
## About
Uses [Swagger 2.0](http://swagger.io/) specification .json files to generate [Angular resources](https://docs.angularjs.org/api/ngResource/service/$resource). The resources have a one-to-one mapping of api controller names, methods and parameters to the scaffolded resources. 

This plugin is intended as a CRUD operations kick starter for Angular apps. However it can also be incorporated as part of your build process, hence the gulp plugin. 

For older Swagger 1.2 specifications, use version 0.0.2 of gulp-ng-scaffold.
## Extras
Generated resources have basic Docco markup as well as basic set of scaffolded Jasmine unit tests. 
## Thanks
Inspiration taken from [swagger-js-codegen](https://www.npmjs.org/package/swagger-js-codegen) and [grunt-swagger-js-codegen](https://www.npmjs.org/package/grunt-swagger-js-codegen)
## Installation 
```js
npm install gulp-ng-scaffold --save-dev
```
## Usage 
To scaffold off an API definition saved as a .json file:
```js
var scaffold = require('gulp-ng-scaffold');
var gulp = require('gulp');
var gutil = require('gulp-util');

gulp.task('scaffold', function () {
    var opts = {
        debug: false,
        appName: 'myApp',
        resourceOutput: './generated/resources',
        testsOutput: './generated/resources/tests',
        serverBase: 'http://myapp.internet.com',
        resourceConfigName: 'resourceConfig'
    };

    return gulp.src('./api/*.json')
        .pipe(scaffold(opts))
        .pipe(gulp.dest('./generated/resources'))
        .on('error', gutil.log);
});
```
To fetch, parse and save an API definition as a .json file:
```js
var gulp = require('gulp');
var fs = require('fs');
var SwaggerParser = require('swagger-parser');

gulp.task('fetch', function (callback) {
    SwaggerParser.validate('http://petstore.swagger.io/v2/swagger.json')
        .then(function (api) {
            fs.mkdir('./api/', function (error) {
                if (error) {
                    //sadness
                }
                var name = './api/' + api.info.title.replace('/', '') + '.json';
                fs.writeFileSync(name, JSON.stringify(api), 'utf-8');
                callback();
            });
        })
        .catch(function (err) {
            console.error(err);
        });
});
```
## Sample Swagger specification 
Swagger has great integration with most server side technologies, most of which can give you an export of existing api specifications in a .json format. 
## Sample resource output
```js
(function() {
    'use strict';
    angular.module('myApp')
        .factory('User', ['$resource', 'resourceConfig', function($resource, resourceConfig) {

                var serverUrl = resourceConfig.serverName;
                return $resource(serverUrl, null, {
                    
                        // User.getCurrentUser

                        // The `getCurrentUser` method performs a `GET` on `/api/user`
                        
                        getCurrentUser: { 
                            url: '/api/user', 
                            method: 'GET',
                            isArray: false,
                        },
                    
                        // User.getById

                        // The `getById` method performs a `GET` on `/api/user/:userId`
                        
                        // Path parameter: `integer userId`
                        
                        getById: { 
                            url: '/api/user/:userId', 
                            method: 'GET',
                            isArray: false,
                            params: {
                                userId: '@userId',
                            }
                        },
                    
                        // User.put

                        // The `put` method performs a `PUT` on `/api/user/:userId`
                        
                        // Path parameter: `integer userId`
                        
                        // Payload: `UserDto userDetails`
                        put: { 
                            url: '/api/user/:userId', 
                            method: 'PUT',
                            params: {
                                userId: '@userId',
                            }
                        }
                    
                });
            }]
        );
}());
```


