# angular-django-jwt

This library will help you work with [JWTs](http://jwt.io/).

## Key Features

* **Decode a JWT** from your AngularJS app
* Check the **expiration date** of the JWT
* Automatically **send the JWT in every request** made to the server
* Use **refresh tokens to always send a not expired JWT** to the server (not used)
* W

## Installing it

You have several options:

````bash
bower install angular-django-jwt
````

````bash
npm install angular-django-jwt
````

````html
<script type="text/javascript" src="https://cdn.rawgit.com/auth0/angular-django-jwt/master/dist/angular-django-jwt.js"></script>
````

Do not forget to add `angular-django-jwt` as a dependency to your module:
````js
angular.module('app', ['angular-django-jwt'])
````

## jwtHelper

jwtHelper will take care of helping you decode the token and check its expiration date.

### Decoding the token

````js
angular.module('app', ['angular-django-jwt'])
.controller('Controller', function Controller(jwtHelper) {
  var expToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3NhbXBsZXMuYXV0aDAuY29tLyIsInN1YiI6ImZhY2Vib29rfDEwMTU0Mjg3MDI3NTEwMzAyIiwiYXVkIjoiQlVJSlNXOXg2MHNJSEJ3OEtkOUVtQ2JqOGVESUZ4REMiLCJleHAiOjE0MTIyMzQ3MzAsImlhdCI6MTQxMjE5ODczMH0.7M5sAV50fF1-_h9qVbdSgqAnXVF7mz3I6RjS6JiH0H8';  

  var tokenPayload = jwtHelper.decodeToken(expToken);
})
````
### Getting the token expiration date

````js
angular.module('app', ['angular-django-jwt'])
.controller('Controller', function Controller(jwtHelper) {
  var date = jwtHelper.getTokenExpirationDate(expToken);
})
````

### Checking if token is expired

````js
angular.module('app', ['angular-django-jwt'])
.controller('Controller', function Controller(jwtHelper) {
  var bool = jwtHelper.isTokenExpired(expToken);
})
````

### More examples

You can see some more examples of how this works in [the tests](https://github.com/auth0/angular-django-jwt/blob/master/test/unit/angularDjangoJwt/services/jwtSpec.js)

## jwtInterceptor

JWT interceptor will take care of sending the JWT in every request.

### Basic usage

````js
angular.module('app', ['angular-django-jwt'])
.config(function Config($httpProvider, jwtInterceptorProvider) {
  // Please note we're annotating the function so that the $injector works when the file is minified
  jwtInterceptorProvider.tokenGetter = ['myService', function(myService) {
    myService.doSomething();
    return localStorage.getItem('id_token');
  }];

  $httpProvider.interceptors.push('jwtInterceptor');
})
.controller('Controller', function Controller($http) {
  // If localStorage contains the id_token it will be sent in the request
  // Authorization: Bearer [yourToken] will be sent
  $http({
    url: '/hola',
    method: 'GET'
  });
})
````

### Not sending the JWT for specific requests

````js
angular.module('app', ['angular-django-jwt'])
.config(function Config($httpProvider, jwtInterceptorProvider) {
  // Please note we're annotating the function so that the $injector works when the file is minified
  jwtInterceptorProvider.tokenGetter = ['myService', function(myService) {
    myService.doSomething();
    return localStorage.getItem('id_token');
  }];

  $httpProvider.interceptors.push('jwtInterceptor');
})
.controller('Controller', function Controller($http) {
  // This request will NOT send the token as it has skipAuthentication
  $http({
    url: '/hola',
    skipAuthorization: true
    method: 'GET'
  });
})
````

### Not sending the JWT for template requests

The `tokenGetter` method can have a parameter `config` injected by angular-django-jwt. This parameter is the configuration object of the current request.

By default the interceptor will send the JWT for all HTTP requests. This includes any `ng-include` directives or
`templateUrls` defined in a `state` in the `stateProvider`. If you want to avoid sending the JWT for these requests you
should adapt your `tokenGetter` method to fit your needs. For example:

````js
angular.module('app', ['angular-django-jwt'])
.config(function Config($httpProvider, jwtInterceptorProvider) {
  jwtInterceptorProvider.tokenGetter = ['config', function(config) {
    // Skip authentication for any requests ending in .html
    if (config.url.substr(config.url.length - 5) == '.html') {
      return null;
    }

    return localStorage.getItem('id_token');
  }];

  $httpProvider.interceptors.push('jwtInterceptor');
})
````

### Sending different tokens based on URLs

````js
angular.module('app', ['angular-django-jwt'])
.config(function Config($httpProvider, jwtInterceptorProvider) {
  jwtInterceptorProvider.tokenGetter = ['config', function(config) {
    if (config.url.indexOf('http://auth0.com') === 0) {
      return localStorage.getItem('auth0.id_token');
    } else {
      return localStorage.getItem('id_token');
    }
  }];
  $httpProvider.interceptors.push('jwtInterceptor');
})
.controller('Controller', function Controller($http) {
  // This request will send the auth0.id_token since URL matches
  $http({
    url: 'http://auth0.com/hola',
    skipAuthorization: true
    method: 'GET'
  });
}
````

### Using promises on the `tokenGetter`: Refresh Token example

As sometimes we need to get first the `id_token` in order to send it, we can return a promise in the `tokenGetter`. Let's see for example how we'd use a `refresh_token`

````js
angular.module('app', ['angular-django-jwt'])
.config(function Config($httpProvider, jwtInterceptorProvider) {
  jwtInterceptorProvider.tokenGetter = ['jwtHelper', '$http', function(jwtHelper, $http) {
    var idToken = localStorage.getItem('id_token');
    var refreshToken = localStorage.getItem('refresh_token');
    if (jwtHelper.isTokenExpired(idToken)) {
      // This is a promise of a JWT id_token
      return $http({
        url: '/delegation',
        // This makes it so that this request doesn't send the JWT
        skipAuthorization: true,
        method: 'POST',
        data: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }
      }).then(function(response) {
        var id_token = response.data.id_token;
        localStorage.setItem('id_token', id_token);
        return id_token;
      });
    } else {
      return idToken;
    }
  }];
  $httpProvider.interceptors.push('jwtInterceptor');
})
.controller('Controller', function Controller($http) {
  // Authorization: Bearer [yourToken] will be sent.
  // That token might be a new one which was got from the refresh token
  $http({
    url: '/hola',
    method: 'GET'
  });
})
````

### Sending the token as a URL Param

````js
angular.module('app', ['angular-django-jwt'])
.config(function Config($httpProvider, jwtInterceptorProvider) {
  jwtInterceptorProvider.urlParam = 'access_token';
  // Please note we're annotating the function so that the $injector works when the file is minified
  jwtInterceptorProvider.tokenGetter = ['myService', function(myService) {
    myService.doSomething();
    return localStorage.getItem('id_token');
  }];

  $httpProvider.interceptors.push('jwtInterceptor');
})
.controller('Controller', function Controller($http) {
  // If localStorage contains the id_token it will be sent in the request
  // url will contain access_token=[yourToken]
  $http({
    url: '/hola',
    method: 'GET'
  });
})
````

### More examples

You can see some more examples of how this works in [the tests](https://github.com/auth0/angular-django-jwt/blob/master/test/unit/angularDjangoJwt/services/interceptorSpec.js)

## FAQ

### I have minification problems with angular-django-jwt in production. What's going on?

When you're using the `tokenGetter` function, it's then called with the injector. `ngAnnotate` doesn't automatically detect that this function receives services as parameters, therefore you must either annotate this method for `ngAnnotate` to know, or use it like follows:

````js
jwtInterceptorProvider.tokenGetter = ['store', '$http', function(store, $http) {
  ...
}];
````

## Contributing

Just clone the repo, run `npm install`, `bower install` and then `gulp` to work :).


## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
