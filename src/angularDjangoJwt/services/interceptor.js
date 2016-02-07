 angular.module('angular-django-jwt.interceptor', ['angular-django-jwt.constants', 'angularCordovaNetworkStatus'])
  .provider('jwtInterceptor', function(AUTH_EVENTS) {

    this.urlParam = null;
    this.authHeader = 'Authorization';
    this.authPrefix = 'Bearer ';
    this.tokenGetter = function() {
      return null;
    }
    this.responseError = function() {
      return null;
    }
    this.interceptRequest = function() {
      return true;
    }

    var config = this;

    this.$get = function ($q, $injector, $rootScope, NetworkStatusMonitor) {
      return {
        request: function (request) {

          if (typeof NetworkStatusMonitor !== "undefined") {
            if (NetworkStatusMonitor.isOffline()) {
              console.log('you are offline we will have to do something');
            }
          }

          if (!$injector.invoke(config.interceptRequest, this, {config:request})) {
            console.log('not intercepting request, because config.interceptRequest was false');
            return request;
          }

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
    };
  });
