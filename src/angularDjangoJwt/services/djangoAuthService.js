angular.module('angular-django-jwt.auth-service', ['angular-storage'])
.provider('djangoAuthService', function () {
  this.LOCAL_CREDENTIALS_KEY = 'user_credentials';
  this.serverUrl = '';
  var config = this;

  var _identity = null;

  this.$get = function($log, $http, $q, store) {
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
      if (_identity === null) {
        _identity = getIdentity().then(function (data) {
          return data;
        });
      }
      return $q.when(_identity);
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
  }

});
