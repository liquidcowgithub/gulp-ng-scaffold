gulp-ng-scaffold
================
> Angular resource scaffolding from Swagger specifications


## About

Uses Swagger specification .json files to generate Angular resources with $resource. The resources have a one-to-one mapping of api controller names, methods and parameters to the scaffolded resources. 

Generated resources have basic Docco markup as well as basic scaffolded Jasmine unit tests. 

## Please note
This scaffolding plugin is a work in progress. The configuration options, interfaces and generated code will change as the source code matures.

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


