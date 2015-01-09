'use strict';

/**
 * @ngdoc overview
 * @name sengokusearchApp
 * @description
 * # sengokusearchApp
 *
 * Main module of the application.
 */

var myApp = angular
  .module('sengokusearchApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'infinite-scroll'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });

myApp.controller('textSearchCtrl', ['$scope', '$http',
  function($scope, $http) {
    $scope.doSearch = function() {

      var search_text = "統率力を上げる";
      if ($scope.search_text) {
        search_text = $scope.search_text;
      }

      var data = {
        "query": {
        "match_phrase": {
          "detail": {
            "query": search_text,
              "slop": 10
          }
        }
      },
        "size": 50
      }

      $http({
        method: "post",
        url: "http://127.0.0.1:9200/sengoku/busho/_search",
        data: data,
        withCredentials: true
      })
        .success(function (response) {
          $scope.bushos = response.hits.hits;
        });
    };

    $scope.doTest = function() {
      console.log("test")
    }
  }]);

myApp.controller('demoCtrl', function($scope, Busho) {
  $scope.busho = new Busho();
});

myApp.factory('Busho', ['$http', function($http) {
  var Busho = function() {
    this.query = "統率力が上がる";
    this.items = [];
    this.busy = false;
    this.from = 0;
  };

  Busho.prototype.nextPage = function() {
    if (this.busy) return;
    this.busy = true;

    var data = {
      "query": {
        "match_phrase": {
          "detail": {
            "query": this.query,
            "slop": 10
          }
        }
      },
      "from": this.from,
      "size": 10
    }

    $http({
      method: "post",
      url: "http://127.0.0.1:9200/sengoku/busho/_search",
      data: data,
      withCredentials: true
    }).success(function (response) {

      var items = response.hits.hits;
      for (var i = 0; i < items.length; i++) {
        this.items.push(items[i].data);
      }
      this.from = this.from + this.items.length
      this.busy = false;
    }.bind(this));
  };

  return Busho;

}]);

myApp.filter('printSymbol', function() {
    return function(input) {
      return input.charAt(0);
    }
  });

