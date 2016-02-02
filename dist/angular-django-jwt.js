(function() {


// Create all modules and define dependencies to make sure they exist
// and are loaded in the correct order to satisfy dependency injection
// before all nested files are concatenated by Grunt

// Modules
angular.module('angular-django-jwt',
    [
        'angular-django-jwt.constants',
        'angular-django-jwt.auth-service',
        'angular-django-jwt.interceptor',
        'angular-django-jwt.jwt',
    ]);

'use strict';

angular
  .module('angular-django-jwt.constants', [])
  .constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    sessionTimeout: 'auth-session-timeout',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized'
  });

angular.module('angular-django-jwt.auth-service', ['angular-storage'])
.provider('djangoAuthService', function () {
  this.LOCAL_CREDENTIALS_KEY = 'user_credentials';
  this.serverUrl = '';
  var config = this;

  var _identity = null;

  this.$get = ["$log", "$http", "$q", "store", function($log, $http, $q, store) {
    return {
      login: login,
      logout: logout,
      isAuthenticated: isAuthenticated,
      isAuthorized: isAuthorized,
      getUser: getUser,
    }

    function login (credentials) {
      if (config.serverUrl === '') {
        var errorMsg = 'SERVER_URL must not be empty, to set, call DjangoAuthService.SERVER_URL = "your.server.url"';
        $log.error(errorMsg);
        return $q.reject(errorMsg);
      } else {
        return $http
          .post(config.serverUrl + 'auth/login/', {username: credentials.username, password: credentials.password})
          .then(loginSuccessFn, loginErrorFn);
      }

      function loginSuccessFn (data, status, headers, config) { //eslint-disable-line
        if (data.data) {
          storeUserCredentials(data.data);
          return(data.data);
        }
      }

      function loginErrorFn (data, status, headers, config) { //eslint-disable-line
        return $q.reject('DjangoAuthService: Login Failed.');
      }
    }

    function logout () {
      return deleteUserCredentials();
    }

    function getUser () {
      return _identity;
    }

    function isAuthenticated () {
      return getIdentity();
    }

    function isAuthorized (authorizedRoles) {
      if (!angular.isArray(authorizedRoles)) {
        authorizedRoles = [authorizedRoles];
      }
      return isAuthenticated().then(function (identity) {
        return authorizedRoles.indexOf(identity.userRole !== -1);
      });
    }

    function getIdentity () {
      var deferred = $q.defer();
      if (_identity !== null) {
        deferred.resolve(_identity);
      } else {
        var data = store.get(config.LOCAL_CREDENTIALS_KEY);
        if (data !== null) {
          _identity = data;
          deferred.resolve(data);
        } else {
          deferred.reject();
        }
      }
      return deferred.promise;
    }

    function storeUserCredentials (jwtPayload) {
      store.set(config.LOCAL_CREDENTIALS_KEY, jwtPayload);
      _identity = jwtPayload;
    }

    function deleteUserCredentials () {
      return store.remove(config.LOCAL_CREDENTIALS_KEY);
    }
  }]

});

 angular.module('angular-django-jwt.interceptor', ['angular-django-jwt.constants'])
  .provider('jwtInterceptor', ["AUTH_EVENTS", function(AUTH_EVENTS) {

    this.urlParam = null;
    this.authHeader = 'Authorization';
    this.authPrefix = 'Bearer ';
    this.tokenGetter = function() {
      return null;
    }
    this.responseError = function() {
      return null;
    }

    var config = this;

    this.$get = ["$q", "$injector", "$rootScope", function ($q, $injector, $rootScope) {
      return {
        request: function (request) {
          if (request.skipAuthorization) {
            return request;
          }

          if (config.urlParam) {
            request.params = request.params || {};
            // Already has the token in the url itself
            if (request.params[config.urlParam]) {
              return request;
            }
          } else {
            request.headers = request.headers || {};
            // Already has an Authorization header
            if (request.headers[config.authHeader]) {
              return request;
            }
          }

          var tokenPromise = $q.when($injector.invoke(config.tokenGetter, this, {
            config: request
          }));

          return tokenPromise.then(function(token) {
            if (token) {
              if (config.urlParam) {
                request.params[config.urlParam] = token;
              } else {
                request.headers[config.authHeader] = config.authPrefix + token;
              }
            }
            return request;
          });
        },
        responseError: function (response) {
          if (config.responseError() === null) {
            // handle the case where the user is not authenticated
            $rootScope.$broadcast({
              401: AUTH_EVENTS.notAuthorized,
              403: AUTH_EVENTS.notAuthenticated
            }[response.status], response);
            return $q.reject(response);
          } else {
            return $injector.invoke(config.responseError, this, {
              response: response
            })
          }
        }
      };
    }];
  }]);

 angular.module('angular-django-jwt.jwt', [])
  .service('jwtHelper', ["$window", function($window) {

    this.urlBase64Decode = function(str) {
      var output = str.replace(/-/g, '+').replace(/_/g, '/');
      switch (output.length % 4) {
        case 0: { break; }
        case 2: { output += '=='; break; }
        case 3: { output += '='; break; }
        default: {
          throw 'Illegal base64url string!';
        }
      }
      return $window.decodeURIComponent(escape($window.atob(output))); //polyfill https://github.com/davidchambers/Base64.js
    }


    this.decodeToken = function(token) {
      var parts = token.split('.');

      if (parts.length !== 3) {
        throw new Error('JWT must have 3 parts');
      }

      var decoded = this.urlBase64Decode(parts[1]);
      if (!decoded) {
        throw new Error('Cannot decode the token');
      }

      return angular.fromJson(decoded);
    }

    this.getTokenExpirationDate = function(token) {
      var decoded = this.decodeToken(token);

      if(typeof decoded.exp === "undefined") {
        return null;
      }

      var d = new Date(0); // The 0 here is the key, which sets the date to the epoch
      d.setUTCSeconds(decoded.exp);

      return d;
    };

    this.isTokenExpired = function(token, offsetSeconds) {
      var d = this.getTokenExpirationDate(token);
      offsetSeconds = offsetSeconds || 0;
      if (d === null) {
        return false;
      }

      // Token expired?
      return !(d.valueOf() > (new Date().valueOf() + (offsetSeconds * 1000)));
    };
  }]);

}());
