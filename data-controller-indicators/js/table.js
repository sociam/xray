/* global angular, _, $ */
angular.module('dci')
    .directive('dciTable', function() {
        return {
            templateUrl: 'tmpl/table.html',
            restrict: 'E',
            scope: { app: '=', appcompany: '=' },
            controller: function($scope, $timeout, utils) {
                var hosts = $scope.$parent.hosts,
                    details = $scope.details = $scope.$parent.details,
                    pitypes = $scope.pitypes = $scope.$parent.pitypes,
                    hTh = $scope.$parent.h2h,
                    hTc = $scope.$parent.h2c,
                    recompute = () => {
                        var c2pi = $scope.c2pi = utils.makeCompany2pi($scope.app, hosts, pitypes, hTc, 0),
                            cat2c2pi = $scope.cat2c2pi = utils.makeCategories($scope.appcompany, details, c2pi),
                            isPDCI = $scope.$parent.pdciApps && $scope.$parent.pdciApps.length,
                            // pdciData = isPDCI && allData.filter((x) => $scope.$parent.pdciApps.indexOf(x.app) >= 0),
                            pdcic2pi = $scope.pdcic2pi = isPDCI ? utils.makePDCIc2pi($scope.$parent.pdciApps, hosts, pitypes, hTc, 0) : {},
                            pdcicat2c2pi = isPDCI ? utils.makeCategories($scope.appcompany, details, pdcic2pi) : {};

                        // each of the boxes
                        $scope.pitypes = _(c2pi).values().flatten().union(_(pdcic2pi).values().flatten().value()).uniq().sort((x) => utils.pilabels[x]).value();

                        // make nested structure for ng-repeat
                        $scope.companies = _(cat2c2pi).keys().map((catname) => {
                            return _(cat2c2pi[catname]).keys().filter((cn) => !isPDCI || !pdcic2pi[cn] || !pdcic2pi[cn].length).map((cn) => {
                                if (!details[cn]) { console.error('no info for ', cn); }
                                return {
                                    id: cn.trim(),
                                    name: details[cn] && details[cn].company && details[cn].company.trim() || cn.trim(),
                                    details: details[cn],
                                    category: catname,
                                    pitypes: c2pi[cn]
                                };
                            }).value();
                        }).flatten().value();

                        $scope.pdci_companies = isPDCI && _(pdcicat2c2pi).keys().map((catname) => {
                            return _(pdcicat2c2pi[catname]).keys().map((cn) => { // .filter((cn) => pdcic2pi[cn] && pdcic2pi[cn].length).
                                if (!details[cn]) { console.error('no info for ', cn); }
                                return {
                                    id: cn,
                                    name: details[cn] && details[cn].company || cn,
                                    details: details[cn],
                                    relevant_to_app: c2pi[cn] !== undefined,
                                    category: catname,
                                    pitypes: pdcic2pi[cn]
                                };
                            }).value();
                        }).flatten().value() || [];
                    };

                var hide_Timer;
                $scope.showInfoBox = function(data, type, $event) {
                    // figure out x and y 
                    // console.info('showinfobox ', $event.target, $($event.target).position());
                    if (hide_Timer) {
                        $timeout.cancel(hide_Timer);
                        hide_Timer = undefined;
                    }
                    var position = $event && $event.target && $($event.target).position();
                    if (type === 'pitype') {
                        $scope.infoboxx = position.left;
                        $scope.infoboxy = position.top + 60;
                        $scope.infobox = { name: data, label: data, type: type };
                    } else if (type === 'category') {
                        $scope.infoboxx = position.left + 170;
                        $scope.infoboxy = position.top;
                        $scope.infobox = { name: data, label: data, type: type };
                    } else {
                        console.log('width ', $($event.target).width());
                        $scope.infoboxx = position.left + $($event.target).width() + 60;
                        $scope.infoboxy = position.top;
                        $scope.infobox = data.details;
                    }
                    console.log("scope infobox is ", $scope.infobox);
                };
                $scope.hideInfoBox = function() {
                    // console.info('ng mouse leave ', data);
                    hide_Timer = $timeout(() => delete $scope.infobox, 100);
                };

                $scope.numCompanies = (cat) => ($scope.cat2c2pi[cat] && _.keys($scope.cat2c2pi[cat]).length) || 0;

                if (!$scope.appcompany) { $scope.error = 'Captured data for ' + $scope.app + ' is in old data format without company field'; }
                if (!hosts[$scope.$parent.app]) { $scope.error = 'No hosts known for app'; }

                $scope.size = (l) => _.keys(l).length;
                recompute();

                $scope.$watch(() => $scope.$parent.pdciApps, recompute);
                window._ss = $scope;
                $scope.pilabels = utils.pilabels;
            }
        };
    });