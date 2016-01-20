'use strict';

describe('authService', function() {

  beforeEach(function() {
    module('angular-django-jwt.auth-service');
  });

  afterEach(inject(function($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  }));


});
