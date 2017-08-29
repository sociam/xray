/* global angular, _, $ */
angular.module('dci')
    .directive('permissions', function() {
        return {
            templateUrl: 'tmpl/perms.html',
            restrict: 'E',
            scope: { app: '=', appcompany: '=', 'purpose': '@' },
            controller: function($scope, $timeout, utils) {
                window._ps = $scope;
                $scope.showpurpose = $scope.purpose === 'true';
                var recompute = () => {
                    var hosts = $scope.$parent.hosts,
                        details = $scope.$parent.details,
                        pitypes = $scope.$parent.pitypes,
                        hTh = $scope.$parent.h2h,
                        hTc = $scope.$parent.h2c,
                        c2pi = $scope.c2pi = utils.makeCompany2pi($scope.app, hosts, pitypes, hTc, 0),
                        cat2c2pi = $scope.cat2c2pi = utils.makeCategories($scope.appcompany, details, c2pi),
                        pits = $scope.pits = _(c2pi).values().flatten().uniq().value(),
                        pi2cat = $scope.pi2cat = pits.reduce((red, pit) => {
                            var cats = _.keys(cat2c2pi).filter((cat) => {
                                return _(cat2c2pi[cat]).values().flatten().value().indexOf(pit) >= 0;
                            });
                            red[pit] = cats;
                            return red;
                        }, {}),
                        r_cache = {};
                    $scope.pi2cat_render = function() {
                        var pits = _.toArray(arguments);
                        if (r_cache[pits.join(',')]) { return r_cache[pits.join(',')]; }
                        console.info(' pitypes ', pits, ' - pi2cat ', pits.map((x) => pi2cat[x]));
                        return r_cache[pits.join(',')] = _(pits.map((x) => pi2cat[x])).filter((x) => x).flatten().map((x) => utils.cat_desc_short[x]).uniq().value().join(', ');
                    };
                };

                // purpose
                // $scope.desc = utils.cat_desc_short;

                $scope.$watch('app', () => { if ($scope.app) { recompute(); } });
            }
        };
    });