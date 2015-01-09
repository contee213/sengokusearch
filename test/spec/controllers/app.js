'use strict';

describe('Controller: phoneListCtrl', function () {

  // load the controller's module
  beforeEach(module('sengokusearchApp'));

  var phoneCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    phoneCtrl = $controller('phoneListCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.phones.length).toBe(3);
  });
});
