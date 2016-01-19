 angular.module('angular-django-jwt.interceptor', ['angular-django-jwt.constants'])
  .provider('jwtInterceptor', function(AUTH_EVENTS) {

    this.urlParam = null;
    this.authHeader = 'Authorization';
    this.authPrefix = 'Bearer ';
    this.tokenGetter = function() {
      return null;
    }
    this.responseError = function(response) {
      // handle the case where the user is not authenticated
      $rootScope.$broadcast({
        401: AUTH_EVENTS.notAuthorized,
        403: AUTH_EVENTS.notAuthenticated
      }[response.status], response);
      return $q.reject(response);
    }

    var config = this;

    this.$get = function ($q, $injector, $rootScope) {
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
        responseError: this.responseError
      };
    };
  });
