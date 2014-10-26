gulp-ng-scaffold
================
> Angular resource scaffolding from Swagger specifications


## About

Uses [Swagger](http://swagger.io/) specification .json files to generate [Angular resources](https://docs.angularjs.org/api/ngResource/service/$resource).

This plugin is intended as a GRUD operations kick starter for Angular apps. However it can also be incorporated as part of your build process, hence the gulp plugin. 

The resources have a one-to-one mapping of api controller names, methods and parameters to the scaffolded resources. 
Generated resources have basic Docco markup as well as basic scaffolded Jasmine unit tests. 

## Please note
This scaffolding plugin is a work in progress. The configuration options, interfaces and generated code will change as the source code matures.
Swagger specification 2.0 compatibility will be deferred until more testing on my side is done with version 1.2.

## Thanks
Inspiration taken from [swagger-js-codegen](https://www.npmjs.org/package/swagger-js-codegen) and [grunt-swagger-js-codegen](https://www.npmjs.org/package/grunt-swagger-js-codegen)

## Installation 
```js
npm install gulp-ng-scaffold --save-dev
```
## Usage 
```js
var scaffold = require('gulp-ng-scaffold');

gulp.task('scaffold', function () {
    var opts = {
        debug: true,
        appName: 'myApp',
        resourceOutput: 'build/resources',
        testsOutput: 'build/tests',
        serverBase: 'http://webapi.myApp.local/',
        resourceConfigName: 'resourceConfig',
        ngAnnotateOptions: {
            remove: true,
            add: true,
            single_quotes: true
        }
    };
    
    return gulp.src('src/resourceModels/*.json')
        .pipe(scaffold(opts))
        .on('error', gutil.log);
});
```
## Sample Swagger specification 
Swagger has great integration with most server side technologies, most of which can give you an export of existing api specifications in a .json format. 
```json
{
    "swaggerVersion": "1.2",
    "apiVersion": "1.0",
    "basePath": "http://webapi.cbi.local",
    "resourcePath": "/User",
    "apis": [{
        "path": "/api/user",
        "operations": [{
            "method": "GET",
            "nickname": "User_GetCurrentUser",
            "type": "ProfileDetailsDto",
            "parameters": [],
            "responseMessages": []
        }, {
        "path": "/api/user/{userId}",
        "operations": [{
            "method": "GET",
            "nickname": "User_GetById",
            "type": "ProfileDetailsDto",
            "parameters": [{
                "paramType": "path",
                "name": "userId",
                "required": true,
                "type": "integer",
                "format": "int64"
            }],
            "responseMessages": []
        }, {
            "method": "PUT",
            "nickname": "User_Put",
            "type": "ProfileDetailsDto",
            "parameters": [{
                "paramType": "path",
                "name": "userId",
                "required": true,
                "type": "integer",
                "format": "int64"
            }, {
                "paramType": "body",
                "name": "profileDetails",
                "required": true,
                "type": "ProfileDetailsDto"
            }],
            "responseMessages": []
        }]
    }]
}
```

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
                        
                        // Payload: `ProfileDetailsDto profileDetails`
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


