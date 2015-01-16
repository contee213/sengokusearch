'use strict';

/**
 * @ngdoc overview
 * @name sengokusearchApp
 * @description
 * # sengokusearchApp
 *
 * Main module of the application.
 */

// var endpoint = "http://1059.contee.net:9200/sengoku/busho/_search";
var endpoint = "http://127.0.0.1:9200/sengoku/busho/_search";

var myApp = angular
  .module('sengokusearchApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'infinite-scroll',
    'ui.bootstrap'
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

myApp.controller('searchCtrl', function($scope, Busho, Deck) {

  $scope.bushos = new Busho();
  $scope.deck = new Deck();

  $scope.doSearch = function() {
    $scope.bushos.clear();
    $scope.bushos.nextPage();
  }

  $scope.doClear = function() {
    $scope.bushos = new Busho();
    $scope.bushos.nextPage();
  }

  $scope.addCard = function(busho) {

    if (busho.inDeck) {
      busho.inDeck = false;
      $scope.deck.cards = $scope.deck.cards.filter(function(v) {
        return (v !== busho);
      });
    } else {
      busho.inDeck = true;
      $scope.deck.cards.push(busho);
    }
    $scope.deck.calc();
    $scope.errors = $scope.deck.check();
  }

});

myApp.controller('ScrollController', ['$scope', '$location', '$anchorScroll',

  function ($scope, $location, $anchorScroll) {
    $scope.gotoBottom = function() {
      // set the location.hash to the id of
      // the element you wish to scroll to.
      $location.hash('top');

      // call $anchorScroll()
      $anchorScroll();
    };
  }]);

myApp.factory('Deck', [function(){

  var Deck = function() {
    this.cards = [];
    this.sou_buryoku = 0;
    this.sou_cost = 0;
    this.sou_tousotsu = 0;
    this.max_shiki = 0;
  }

  Deck.prototype.calc = function() {
    this.sou_cost = this.sum('cost');
    this.sou_buryoku = this.sum('buryoku');
    this.sou_tousotsu= this.sum('tousotsu');
    this.max_shiki = this.maxShiki();
  }

  Deck.prototype.sum = function(key) {
    var sum = 0;
    this.cards.forEach(function(e) {
      sum += Number(e[key])
    })
    return sum
  }

  Deck.prototype.maxShiki = function() {
    // 最大士気計算
    var buke_set = new Set();
    this.cards.forEach(function (e) {
      buke_set.add(e.buke)
    })
    var shiki = 6;
    if (buke_set.size == 1) {
      shiki += 6
    } else if (buke_set.size == 2) {
      shiki += 3
    } else if (buke_set.size == 3) {
      shiki += 1
    }
    if (buke_set.has('他家･東') && buke_set.has('他家･西')) {
      shiki += 1;
    }

    return shiki
  }

  Deck.prototype.check = function() {
    var unique_name_set = new Set();
    var error = new Set();
    this.cards.forEach(function(e) {
      if (unique_name_set.has(e.sengoku_name)) {
        var msg = '武将が重複しています -> ' + e.sengoku_name;
        error.add(msg);
      } else {
        unique_name_set.add(e.sengoku_name);
      }
    })
    var arError = [];
    error.forEach(function(v) {
      arError.push(v);
    })
    return arError;
  }

  return Deck;

}])

myApp.factory('Busho', ['$http', function($http) {

  var Busho = function() {
    this.query = "";
    this.items = [];
    this.busy = false;
    this.end = false;
    this.size = 10;
    this.from = 0;
    this.sort = "standard";
    this.order = "asc";

    this.condition_display = {
      keiryaku_detail: true,
      busho_retuden: false
    };

    this.condition_buke = {
      buke_toyotomi: {flag: false, text: "豊臣家"},
      buke_toyotomi_bunti: {flag: false, sub: true, text: "文治"},
      buke_toyotomi_budan: {flag: false, sub: true, text: "武断"},
      buke_tokugawa: {flag: false, text: "徳川家"},
      buke_oda: {flag: false, text: "織田家"},
      buke_takeda: {flag: false, text: "武田家"},
      buke_uesugi: {flag: false, text: "上杉家"},
      buke_houjou: {flag: false, text: "北条家"},
      buke_simadu: {flag: false, text: "島津家"},
      buke_date: {flag: false, text: "伊達家"},
      buke_mouri: {flag: false, text: "毛利家"},
      buke_sanada: {flag: false, text: "真田家"},
      buke_honganji: {flag: false, text: "本願寺"},
      buke_tyousokabe: {flag: false, text: "長宗我部家"},
      buke_imagawa: {flag: false, text: "今川家"},
      buke_asakura: {flag: false, text: "朝倉家"},
      buke_azai: {flag: false, text: "浅井家"},
      buke_take_higasi: {flag: false, text: "他家･東"},
      buke_take_nisi: {flag: false, text: "他家･西"}
    };

    this.condition_heisyu = {
      heisyu_yari: {flag: false, text: "槍足軽"},
      heisyu_yumi: {flag: false, text: "弓足軽"},
      heisyu_teppou: {flag: false, text: "鉄砲隊"},
      heisyu_kiba: {flag: false, text: "騎馬隊"},
      heisyu_keikiba: {flag: false, text: "軽騎馬隊"},
      heisyu_ryukiba: {flag: false, text: "竜騎馬隊"},
      heisyu_asigaru: {flag: false, text: "足軽"}
    }

    this.condition_cost = {
      cost_10: {flag: false, text: 1},
      cost_15: {flag: false, text: 1.5},
      cost_20: {flag: false, text: 2},
      cost_25: {flag: false, text: 2.5},
      cost_30: {flag: false, text: 3},
      cost_35: {flag: false, text: 3.5},
      cost_40: {flag: false, text: 4}
    };

    this.condition_tokugi = {
      tokugi_hukuhei: {flag: false, text: "伏"},
      tokugi_seiatu: {flag: false, text: "制"},
      tokugi_miryoku: {flag: false, text: "魅"},
      tokugi_koujou: {flag: false, text: "城"},
      tokugi_kiai: {flag: false, text: "気"},
      tokugi_bousaku: {flag: false, text: "柵"},
      tokugi_sinobi: {flag: false, text: "忍"},
      tokugi_sogeki: {flag: false, text: "狙"},
      tokugi_kurumauti: {flag: false, text: "車"},
      tokugi_houroku: {flag: false, text: "焙"},
      tokugi_tateyari: {flag: false, text: "盾"},
      tokugi_toyokuni: {flag: false, text: "豊"},
      tokugi_itiryou: {flag: false, text: "領"},
      tokugi_mousyuu: {flag: false, text: "猛"},
      tokugi_gunbi: {flag: false, text: "軍"},
      tokugi_sikku: {flag: false, text: "疾"},
      tokugi_sinsei: {flag: false, text: "新"},
      tokugi_karetu: {flag: false, text: "烈"},
      tokugi_tyuusei: {flag: false, text: "忠"}
    };

    this.condition_bu_rank = {
      bu_cost_per_g: {flag: false,
        text: "doc.buryoku.value/doc.cost.value < max",
        params: {max: 1.5}},
      bu_cost_per_f: {flag: false,
        text: "min <= doc.buryoku.value/doc.cost.value & doc.buryoku.value/doc.cost.value < max",
        params: {min: 1.5, max: 2.0}},
      bu_cost_per_e: {flag: false,
        text: "min <= doc.buryoku.value/doc.cost.value & doc.buryoku.value/doc.cost.value < max",
        params: {min: 2.0, max: 2.5}},
      bu_cost_per_d: {flag: false,
        text: "min <= doc.buryoku.value/doc.cost.value & doc.buryoku.value/doc.cost.value < max",
        params: {min: 2.5, max: 3.0}},
      bu_cost_per_c: {flag: false,
        text: "min <= doc.buryoku.value/doc.cost.value & doc.buryoku.value/doc.cost.value < max",
        params: {min: 3.0, max: 3.5}},
      bu_cost_per_b: {flag: false,
        text: "min <= doc.buryoku.value/doc.cost.value & doc.buryoku.value/doc.cost.value < max",
        params: {min: 3.5, max: 4.0}},
      bu_cost_per_a: {flag: false,
        text: "doc.buryoku.value/doc.cost.value == min",
        params: {min: 4.0}},
      bu_cost_per_s: {flag: false,
        text: "min < doc.buryoku.value/doc.cost.value",
        params: {min: 4.0}}
    };

    this.condition_tou_rank = {
      tou_cost_per_g: {flag: false,
        text: "doc.tousotsu.value/doc.cost.value < max",
        params: {max: 1.0}},
      tou_cost_per_f: {flag: false,
        text: "min <= doc.tousotsu.value/doc.cost.value & doc.tousotsu.value/doc.cost.value < max",
        params: {min: 1.0, max: 2.0}},
      tou_cost_per_e: {flag: false,
        text: "min <= doc.tousotsu.value/doc.cost.value & doc.tousotsu.value/doc.cost.value < max",
        params: {min: 2.0, max: 3.0}},
      tou_cost_per_d: {flag: false,
        text: "min <= doc.tousotsu.value/doc.cost.value & doc.tousotsu.value/doc.cost.value < max",
        params: {min: 3.0, max: 4.0}},
      tou_cost_per_c: {flag: false,
        text: "min <= doc.tousotsu.value/doc.cost.value & doc.tousotsu.value/doc.cost.value < max",
        params: {min: 4.0, max: 5.0}},
      tou_cost_per_b: {flag: false,
        text: "min <= doc.tousotsu.value/doc.cost.value & doc.tousotsu.value/doc.cost.value < max",
        params: {min: 5.0, max: 6.0}},
      tou_cost_per_a: {flag: false,
        text: "min <= doc.tousotsu.value/doc.cost.value & doc.tousotsu.value/doc.cost.value < max",
        params: {min: 6.0, max: 7.0}},
      tou_cost_per_s: {flag: false,
        text: "min < doc.tousotsu.value/doc.cost.value",
        params: {min: 7.0}}
    };

    this.condition_shiki = {
      shiki_02: {flag: false, text: 2},
      shiki_03: {flag: false, text: 3},
      shiki_04: {flag: false, text: 4},
      shiki_05: {flag: false, text: 5},
      shiki_06: {flag: false, text: 6},
      shiki_07: {flag: false, text: 7},
      shiki_08: {flag: false, text: 8},
      shiki_09: {flag: false, text: 9},
      shiki_10: {flag: false, text: 10}
    };

    this.condition_category = {
      category_kyouka: {flag: false, text: "0"},
      category_zentai_kyouka: {flag: false, text: "1"},
      category_kaihuku: {flag: false, text: "2"},
      category_hukkatu: {flag: false, text: "3"},
      category_bougai: {flag: false, text: "4"},
      category_jinkei: {flag: false, text: "5"},
      category_bougai_jinkei: {flag: false, text: "6"},
      category_damage: {flag: false, text: "7"},
      category_butou: {flag: false, text: "8"},
      category_other: {flag: false, text: "9"}
    };

  };

  Busho.prototype.clear = function() {
    this.items = [];
    this.from = 0;
    this.busy = false;
    this.end = false;
  }

  Busho.prototype.getBukeStyle = function(buke) {

    var buke_style = {
      buke_toyotomi: {style: {"background-color":"#FF9705"}, text: "豊臣家"},
      buke_tokugawa: {style: {"background-color":"#5CB84C"}, text: "徳川家"},
      buke_oda: {style: {"background-color":"#1A63E7"}, text: "織田家"},
      buke_takeda: {style: {"background-color":"#C31419"}, text: "武田家"},
      buke_uesugi: {style: {"background-color":"#A9A9A9"}, text: "上杉家"},
      buke_houjou: {style: {"background-color":"#F0C71D"}, text: "北条家"},
      buke_simadu: {style: {"background-color":"#1BA5C8"}, text: "島津家"},
      buke_date: {style: {"background-color":"#1327BE"}, text: "伊達家"},
      buke_mouri: {style: {"background-color":"#00C993"}, text: "毛利家"},
      buke_sanada: {style: {"background-color":"#4F061E"}, text: "真田家"},
      buke_honganji: {style: {"background-color":"#708A3C"}, text: "本願寺"},
      buke_tyousokabe: {style: {"background-color":"#928FFA"}, text: "長宗我部家"},
      buke_imagawa: {style: {"background-color":"#951CB7"}, text: "今川家"},
      buke_asakura: {style: {"background-color":"#E17F9D"}, text: "朝倉家"},
      buke_azai: {style: {"background-color":"#E17F9D"}, text: "浅井家"},
      buke_take_higasi: {style: {"background-color":"#7F7A26"}, text: "他家･東"},
      buke_take_nisi: {style: {"background-color":"#7F7A26"}, text: "他家･西"}
    };

    for (var key in buke_style) {
      if (buke == buke_style[key].text) {
        return buke_style[key].style;
      }
    }
  }

  Busho.prototype.toggleOrder = function() {

    this.sort_define = {
      standard: [
        {
          buke: {order: this.order}
        },
        {
          card_id: {order: this.order}
        }],
      buryoku: [
        {
          buryoku: {order: this.order}
        },
        {
          "_script": {
            "script": "doc['tokugi'].values.size()",
            "type": "number",
            "order": this.order
          }
        }],
      tousotsu: [
        {
          tousotsu: {order: this.order}
        },
        {
          "_script": {
            "script": "doc['tokugi'].values.size()",
            "type": "number",
            "order": this.order
          }
        }],
      cost: [
        {
          cost: {order: this.order}
        },
        {
          buryoku: {order: "desc"}
        },
        {
          "_script": {
            "script": "doc['tokugi'].values.size()",
            "type": "number",
            "order": this.order
          }
        }],
      buryoku_cost: [
        {
          "_script": {
            "script": "doc.buryoku.value/doc.cost.value",
            "type": "number",
            "order": this.order
          }
        },
        {
          "_script": {
            "script": "doc['tokugi'].values.size()",
            "type": "number",
            "order": this.order
          }
        }],
      tousotsu_cost: [
        {
          "_script": {
            "script": "doc.tousotsu.value/doc.cost.value",
            "type": "number",
            "order": this.order
          }
        },
        {
          "_script": {
            "script": "doc['tokugi'].values.size()",
            "type": "number",
            "order": this.order
          }
        }]
    };

    if (this.query) {
      this.sort_define.standard.unshift({
        "_score": {order: "desc"}
      })
    }

  }

  Busho.prototype.createQuery = function() {

    this.buke = [];
    this.sub_buke =[];
    this.heisyu = [];
    this.cost = [];
    this.tokugi = [];
    this.keiryaku_shiki = [];
    this.keiryaku_category = [];

    // ソート順
    this.toggleOrder()

    // query template
    var data =
    {
      "query": {
        "filtered": {
          "query": {
            "bool": {
              "must": []
            }
          },
          "filter": {
            "and": {
              "filters": []
            }
          }
        }
      },
      "from": this.from,
      "size": this.size,
      "sort": this.sort_define[this.sort]
    };

    // 計略テキスト
    if (this.query) {
      data.query.filtered.query.bool.must.push({
        "match_phrase": {
          "detail": {
            "query": this.query,
            "slop": 10
          }
        }
      })
    }

    // 武家・サブ武家
    for (var key in this.condition_buke) {
      var cond = this.condition_buke[key]
      if (cond.flag) {
        if (cond.sub) {
          this.sub_buke.push(cond.text);
        } else {
          this.buke.push(cond.text);
        }
      }
    }
    var or_filter = { or: { filters: []}};
    if (this.buke.length > 0) {
      or_filter.or.filters.push({
        terms: {
          buke: this.buke
        }
      })
    }
    if (this.sub_buke.length > 0) {
      or_filter.or.filters.push({
        terms: {
          sub_buke: this.sub_buke
        }
      })
    }
    data.query.filtered.filter.and.filters.push(or_filter)

    // 兵種
    for (var key in this.condition_heisyu) {
      var cond = this.condition_heisyu[key]
      if (cond.flag) {
        this.heisyu.push(cond.text);
        // console.log(cond.text);
      }
    }
    if (this.heisyu.length > 0) {
      data.query.filtered.filter.and.filters.push({
        terms: {
          heisyu: this.heisyu
        }
      })
    }

    // コスト
    for (var key in this.condition_cost) {
      var cond = this.condition_cost[key]
      if (cond.flag) {
        this.cost.push(cond.text);
        // console.log(cond.text);
      }
    }
    if (this.cost.length > 0) {
      data.query.filtered.filter.and.filters.push({
        terms: {
          cost: this.cost
        }
      })
    }

    // 特技
    var tokugi_string = "";
    for (var key in this.condition_tokugi) {
      var cond = this.condition_tokugi[key]
      if (cond.flag) {
        if (tokugi_string) {
          tokugi_string += " ";
        }
        tokugi_string += "+" + cond.text;
      }
    }
    if (tokugi_string) {
      data.query.filtered.query.bool.must.push({
        "query_string": {
            "query": "tokugi:(" + tokugi_string + ")"
        }
      })
    }

    // コスト比武力
    var bu_scripter = [];
    for (var key in this.condition_bu_rank) {
      var cond = this.condition_bu_rank[key];
      if (cond.flag) {
        bu_scripter.push({
          script: {
            script: cond.text,
            params: cond.params
          }
        });
      }
    }
    if (bu_scripter.length > 0) {
      data.query.filtered.filter.and.filters.push({
        or: bu_scripter
      })
    }

    // コスト比統率
    var tou_scripter = [];
    for (var key in this.condition_tou_rank) {
      var cond = this.condition_tou_rank[key];
      if (cond.flag) {
        tou_scripter.push({
          script: {
            script: cond.text,
            params: cond.params
          }
        });
      }
    }
    if (tou_scripter.length > 0) {
      data.query.filtered.filter.and.filters.push({
        or: tou_scripter
      })
    }

    // 計略士気
    for (var key in this.condition_shiki) {
      var cond = this.condition_shiki[key]
      if (cond.flag) {
        this.keiryaku_shiki.push(cond.text);
        // console.log(cond.text);
      }
    }
    if (this.keiryaku_shiki.length > 0) {
      data.query.filtered.filter.and.filters.push({
        terms: {
          'keiryaku_data.shiki': this.keiryaku_shiki
        }
      })
    }

    // 計略カテゴリ
    for (var key in this.condition_category) {
      var cond = this.condition_category[key]
      if (cond.flag) {
        this.keiryaku_category.push(cond.text);
        // console.log(cond.text);
      }
    }
    if (this.keiryaku_category.length > 0) {
      data.query.filtered.filter.and.filters.push({
        terms: {
          'keiryaku_data.category': this.keiryaku_category
        }
      })
    }

    return data
  }

  Busho.prototype.nextPage = function() {

    // console.log(this.from);

    if (this.busy || this.end) return;
    this.busy = true;

    var data = this.createQuery();

    $http({
      method: "post",
      url: endpoint,
      data: data,
      withCredentials: true
    }).success(function (response) {

      var items = response.hits.hits;

      if (!items || items.length == 0) {
        this.busy = false;
        this.end = true;
        return;
      }

      for (var i = 0; i < items.length; i++) {
        this.items.push(items[i]._source);
      }
      this.from = this.from + this.size;
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

angular.module('custom.bootstrap.tabs', [])

  .controller('XTabsetController', ['$scope', function TabsetCtrl($scope) {
    var ctrl = this,
      tabs = ctrl.tabs = $scope.tabs = [];

    ctrl.select = function(selectedTab) {
      angular.forEach(tabs, function(tab) {
        if (tab.active && tab !== selectedTab) {
          tab.active = false;
          tab.onDeselect();
        }
      });
      selectedTab.active = true;
      selectedTab.onSelect();
    };

    ctrl.addTab = function addTab(tab) {
      tabs.push(tab);
      // we can't run the select function on the first tab
      // since that would select it twice
      if (tabs.length === 1) {
        tab.active = true;
      } else if (tab.active) {
        ctrl.select(tab);
      }
    };

    ctrl.removeTab = function removeTab(tab) {
      var index = tabs.indexOf(tab);
      //Select a new tab if the tab to be removed is selected and not destroyed
      if (tab.active && tabs.length > 1 && !destroyed) {
        //If this is the last tab, select the previous tab. else, the next tab.
        var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
        ctrl.select(tabs[newActiveIndex]);
      }
      tabs.splice(index, 1);
    };

    var destroyed;
    $scope.$on('$destroy', function() {
      destroyed = true;
    });
  }])

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabset
 * @restrict EA
 *
 * @description
 * Tabset is the outer container for the tabs directive
 *
 * @param {boolean=} vertical Whether or not to use vertical styling for the tabs.
 * @param {boolean=} justified Whether or not to use justified styling for the tabs.
 *
 * @example
 <example module="ui.bootstrap">
 <file name="index.html">
 <tabset>
 <tab heading="Tab 1"><b>First</b> Content!</tab>
 <tab heading="Tab 2"><i>Second</i> Content!</tab>
 </tabset>
 <hr />
 <tabset vertical="true">
 <tab heading="Vertical Tab 1"><b>First</b> Vertical Content!</tab>
 <tab heading="Vertical Tab 2"><i>Second</i> Vertical Content!</tab>
 </tabset>
 <tabset justified="true">
 <tab heading="Justified Tab 1"><b>First</b> Justified Content!</tab>
 <tab heading="Justified Tab 2"><i>Second</i> Justified Content!</tab>
 </tabset>
 </file>
 </example>
 */
  .directive('x-tabset', function() {
    return {
      restrict: 'EA',
      transclude: true,
      replace: true,
      scope: {
        type: '@'
      },
      controller: 'XTabsetController',
      templateUrl: 'template/tabs/tabset.html',
      link: function(scope, element, attrs) {
        scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
        scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
      }
    };
  })

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tab
 * @restrict EA
 *
 * @param {string=} heading The visible heading, or title, of the tab. Set HTML headings with {@link ui.bootstrap.tabs.directive:tabHeading tabHeading}.
 * @param {string=} select An expression to evaluate when the tab is selected.
 * @param {boolean=} active A binding, telling whether or not this tab is selected.
 * @param {boolean=} disabled A binding, telling whether or not this tab is disabled.
 *
 * @description
 * Creates a tab with a heading and content. Must be placed within a {@link ui.bootstrap.tabs.directive:tabset tabset}.
 *
 * @example
 <example module="ui.bootstrap">
 <file name="index.html">
 <div ng-controller="TabsDemoCtrl">
 <button class="btn btn-small" ng-click="items[0].active = true">
 Select item 1, using active binding
 </button>
 <button class="btn btn-small" ng-click="items[1].disabled = !items[1].disabled">
 Enable/disable item 2, using disabled binding
 </button>
 <br />
 <tabset>
 <tab heading="Tab 1">First Tab</tab>
 <tab select="alertMe()">
 <tab-heading><i class="icon-bell"></i> Alert me!</tab-heading>
 Second Tab, with alert callback and html heading!
 </tab>
 <tab ng-repeat="item in items"
 heading="{{item.title}}"
 disabled="item.disabled"
 active="item.active">
 {{item.content}}
 </tab>
 </tabset>
 </div>
 </file>
 <file name="script.js">
 function TabsDemoCtrl($scope) {
      $scope.items = [
        { title:"Dynamic Title 1", content:"Dynamic Item 0" },
        { title:"Dynamic Title 2", content:"Dynamic Item 1", disabled: true }
      ];

      $scope.alertMe = function() {
        setTimeout(function() {
          alert("You've selected the alert tab!");
        });
      };
    };
 </file>
 </example>
 */

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabHeading
 * @restrict EA
 *
 * @description
 * Creates an HTML heading for a {@link ui.bootstrap.tabs.directive:tab tab}. Must be placed as a child of a tab element.
 *
 * @example
 <example module="ui.bootstrap">
 <file name="index.html">
 <tabset>
 <tab>
 <tab-heading><b>HTML</b> in my titles?!</tab-heading>
 And some content, too!
 </tab>
 <tab>
 <tab-heading><i class="icon-heart"></i> Icon heading?!?</tab-heading>
 That's right.
 </tab>
 </tabset>
 </file>
 </example>
 */
  .directive('tab', ['$parse', function($parse) {
    return {
      require: '^tabset',
      restrict: 'EA',
      replace: true,
      templateUrl: 'template/tabs/tab.html',
      transclude: true,
      scope: {
        active: '=?',
        heading: '@',
        onSelect: '&select', //This callback is called in contentHeadingTransclude
        //once it inserts the tab's content into the dom
        onDeselect: '&deselect'
      },
      controller: function() {
        //Empty controller so other directives can require being 'under' a tab
      },
      compile: function(elm, attrs, transclude) {
        return function postLink(scope, elm, attrs, tabsetCtrl) {
          scope.$watch('active', function(active) {
            if (active) {
              tabsetCtrl.select(scope);
            }
          });

          scope.disabled = false;
          if ( attrs.disabled ) {
            scope.$parent.$watch($parse(attrs.disabled), function(value) {
              scope.disabled = !! value;
            });
          }

          scope.select = function() {
            if ( !scope.disabled ) {
              scope.active = true;
            }
          };

          tabsetCtrl.addTab(scope);
          scope.$on('$destroy', function() {
            tabsetCtrl.removeTab(scope);
          });

          //We need to transclude later, once the content container is ready.
          //when this link happens, we're inside a tab heading.
          scope.$transcludeFn = transclude;
        };
      }
    };
  }])

  .directive('tabHeadingTransclude', [function() {
    return {
      restrict: 'A',
      require: '^tab',
      link: function(scope, elm, attrs, tabCtrl) {
        scope.$watch('headingElement', function updateHeadingElement(heading) {
          if (heading) {
            elm.html('');
            elm.append(heading);
          }
        });
      }
    };
  }])

  .directive('tabContentTransclude', function() {
    return {
      restrict: 'A',
      require: '^tabset',
      link: function(scope, elm, attrs) {
        var tab = scope.$eval(attrs.tabContentTransclude);

        //Now our tab is ready to be transcluded: both the tab heading area
        //and the tab content area are loaded.  Transclude 'em both.
        tab.$transcludeFn(tab.$parent, function(contents) {
          angular.forEach(contents, function(node) {
            if (isTabHeading(node)) {
              //Let tabHeadingTransclude know.
              tab.headingElement = node;
            } else {
              elm.append(node);
            }
          });
        });
      }
    };
    function isTabHeading(node) {
      return node.tagName &&  (
        node.hasAttribute('tab-heading') ||
        node.hasAttribute('data-tab-heading') ||
        node.tagName.toLowerCase() === 'tab-heading' ||
        node.tagName.toLowerCase() === 'data-tab-heading'
        );
    }
  })

;
