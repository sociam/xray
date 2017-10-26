/* global angular, _, jQuery, Backbone */

angular.module('dci', ['ui.router', 'ngAnimate', 'ngTouch', 'ngSanitize', 'pouchdb'])
    .controller('p1', function() {})
    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/index');
        $stateProvider.state('chooseApp', {
            url: '/chooseapp',
            templateUrl: 'tmpl/choose-app.html',
            resolve: {
                pitypes: ($http) => $http.get('../mitm_out/pi_by_host.json').then((x) => x.data),
                hosts: ($http) => $http.get('../mitm_out/host_by_app.json').then((x) => x.data),
                // data: ($http) => $http.get('../mitm_out/data_all.json').then((x) => x.data),
            },
            controller: function($scope, pitypes, hosts) {
                console.log('chooseapp');
                window._pit = pitypes;
                window._hosts = hosts;
                $scope.pitypes = pitypes;
                $scope.hosts = hosts;
                // $scope.data = data;
                $scope.showPDCI = { showing: false };
                // $scope.apps = _.uniq(data.map((x) => x.app));
                $scope.apps = _.keys(hosts);
                // $scope.size = (obj) => _.toPairs(obj).length;
            }
        });

        // base dci state
        $stateProvider.state('index', {
            url: '/index',
            resolve: {
                // data: ($http) => $http.get('../mitm_out/data_all.json').then((x) => x.data)
                hosts: ($http) => $http.get('../mitm_out/host_by_app.json').then((x) => x.data)
            },
            templateUrl: 'tmpl/index.html',
            controller: function($scope, hosts) {
                // $scope.apps = _.uniq(data.map((x) => x.app));
                $scope.apps = _.keys(hosts);
            }
        });
        // base dci state
        $stateProvider.state('dci', {
            url: '/dci?app&pdciapps&mode',
            templateUrl: 'tmpl/view.html',
            resolve: {
                pitypes: ($http) => $http.get('../mitm_out/pi_by_host.json').then((x) => x.data),
                hosts: ($http) => $http.get('../mitm_out/host_by_app.json').then((x) => x.data),
                details: ($http) => $http.get('../mitm_out/company_details.json').then((x) => x.data),
                h2h: ($http) => $http.get('../mitm_out/h2h_2ld.json').then((x) => x.data),
                h2c: ($http) => $http.get('../mitm_out/h2c.json').then((x) => x.data),
                app2company: ($http) => $http.get('../mitm_out/appcompany.json').then((x) => x.data)
                    // data: ($http) => $http.get('../mitm_out/data_all.json').then((x) => x.data)
            },
            controller: function($scope, $state, pitypes, hosts, details, utils, app2company, $stateParams, $timeout, h2h, h2c) {
                var app = $scope.app = $stateParams.app, // allData = $scope.allData = data,
                    apps = $scope.apps = _.keys(hosts),
                    appcompany = $scope.appcompany = app2company[app], // crashes if app has no data
                    getName = $scope.getName = (id) => details[id] && details[id].company || id;

                $scope.h2h = h2h;
                $scope.h2c = h2c;
                $scope.details = details;
                $scope.u = utils;
                $scope.hosts = hosts;
                $scope.pilabels = utils.pilabels;
                $scope.pitypes = pitypes;
                $scope.toPairs = (o) => _.toPairs(o).map((x) => { return { key: x[0], val: x[1] }; });
                // $scope.data = data.filter((x) => x.app === $stateParams.app);

                var refreshpdciApps = () => {
                    $scope.pdciApps = _.keys($scope.pdciAppsObj).filter((k) => $scope.pdciAppsObj[k]);
                };

                if (!hosts[app]) { $scope.error = 'no data for app ' + $stateParams.app; }

                // set app name / company
                // $scope.app = $stateParams.app;
                // $scope.appcompany = data[0].company;

                // sets mode for toolbar
                $scope.mode = $stateParams.mode || 'box';
                $scope.$watchCollection('pdciAppsObj', refreshpdciApps);

                if ($stateParams.pdciapps && $stateParams.pdciapps.length > 0) {
                    var param = typeof $stateParams.pdciapps === 'string' ? [$stateParams.pdciapps] : $stateParams.pdciapps;
                    $scope.pdciAppsObj = param.reduce((a, app) => { a[app] = true; return a; }, {});
                }
                window._sD = $scope;
            }
        });
    }).component('piTypesDisplay', {
        templateUrl: 'tmpl/pi-types-display.html',
        bindings: { types: '=' },
        controller: function($scope) {
            console.log('pitypes', this.types);
            this.pis = this.types;
            var types = this.types;
            $scope.contains = ((type) => types.filter((x) => x === type).length);
            $scope.containsPartial = ((type) => types.filter((x) => x.indexOf(type) >= 0).length);
        }
    }).component('toolbar', {
        templateUrl: 'tmpl/toolbar.html',
        bindings: { apps: '=', selected: '=', mode: '=', showCompanyDetails: '=', showpdci: '=', pdciapps: '=' },
        controller: function($scope, $state) {
            // console.log('selected ', this.selected);
            $scope.$watch(() => this.selected + this.mode, () => {
                console.info('new selected app ', this.selected, 'mode: ', this.mode, this.pdciapps);
                if (this.selected && this.mode) {
                    $state.go('dci', { app: this.selected, pdciapps: this.pdciapps, mode: this.mode });
                }
            });
        }
    }).component('pdciAppSelector', {
        templateUrl: 'tmpl/pdci-app-selector.html',
        bindings: { apps: '=', selected: '=', showing: "=", pdciapps: '=' },
        controller: function($scope) {
            console.log('pdciAppSelector', this.apps, this.selected);
            if (this.selected === undefined) { this.selected = {}; }
            // debug crap
            // $scope.$watchCollection(() => this.selected, () => { console.log('select watch ! ', this.selected); });
            // $scope.$watch(() => this.showing, () => { console.log('showing watch ! ', this.showing); });
        }
    }).component('companyInfo', { // used by the box display
        templateUrl: 'tmpl/company-info.html',
        replace: true,
        bindings: { company: '=', companyName: '=', details: '=', showDetails: '=' },
        controller: function($scope) { console.log('company id:', this.company, 'name: ', this.companyName, this.details); }
    }).component('companyInfoBox', { // used by sankey and table
        templateUrl: 'tmpl/company-info-box.html',
        bindings: { selected: '=', x: '=', y: '=', details: '=' },
        controller: function($scope, utils) {
            $scope.close = () => { delete $scope.selected; };
            var emoji_table = {
                US: '&#x1F1FA;&#x1F1F8;',
                UK: '&#x1F1EC;&#x1F1E7;',
                AT: '&#x1F1E6;&#x1F1F9;',
                CN: '&#x1F1E8;&#x1F1F3;',
                FR: '&#x1F1EB;&#x1F1F7;',
                CA: '&#x1F1E8;&#x1F1E6;',
                DE: '&#x1F1E9;&#x1F1EA;'
            };
            $scope.getDesc = (x) => {
                // console.log('get desc ', x, x.type);
                if (x.type === 'pitype') {
                    // console.info(' PITYPE returning ', { title: utils.pilabels[x.name], desc: utils.pi_desc[x.name] });
                    return { title: utils.pilabels[x.name], desc: utils.pi_desc[x.name] };
                }
                if (x.type === 'category') {
                    // console.info(" CAT returning", { title: x.name, desc: utils.cat_desc[x.name] });
                    return { title: x.name, desc: utils.cat_desc[x.name] };
                }
                // console.error('aint got nothing for ', x.type);
                return {};
            };
            $scope.$watch(() => this.selected, () => {
                var s = $scope.selected = this.selected && _.clone(this.selected) || this.selected;
                if (s && s.company && s.equity && s.equity.length) {
                    var n = parseInt(s.equity);
                    if (n > 1e6) { s.equity = Math.round(n / 1.0e5) / 10.0 + "m"; }
                    if (n > 1e9) { s.equity = Math.round(n / 1.0e8) / 10.0 + "bn"; }
                }
                if (s && s.company && s.jurisdiction_code && emoji_table[s.jurisdiction_code.toUpperCase()]) {
                    s.jurisdiction_flag = emoji_table[s.jurisdiction_code.toUpperCase()];
                }
            });
        }
    }).component('companyLens', { // used by sankey and table
        templateUrl: 'tmpl/company-lens.html',
        bindings: { selected: '=company', parent: '=' },
        controller: function($scope, utils) {
            console.log('company lens! ', this.selected);
            // not much here	
        }
    }).factory('storage', function(pouchDB) {
        return { db: new pouchDB('experiment') };
    }).component('likertQuestion', {
        templateUrl: 'tmpl/likert.html',
        bindings: { response: '=' },
        transclude: true,
        controller: function($scope, utils) {
            $scope.values = utils.range(5).map((x) => 'likert-' + (x + 1));
            $scope.$watch('response', () => { console.info('response changed ', this.response); });
            $scope.change = (x) => {
                console.log('selected ', x);
                this.response = x;
            };
            window._slike = $scope;
        }
    });