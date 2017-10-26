/* global angular, _, $ */
angular.module('dci')
    .directive('dciTablePrivacyLeaks', function() {
        return {
            templateUrl: 'tmpl/table-pl.html',
            restrict: 'E',
            scope: { app: '=', appcompany: '=' },
            controller: function($scope, $timeout, utils) {
                var hosts = $scope.$parent.hosts,
                    details = $scope.$parent.details,
                    pitypes = $scope.pitypes = $scope.$parent.pitypes,
                    hTh = $scope.$parent.h2h,
                    recompute = () => {
                        // each of the boxes
                        // $scope.pitypes = _.keys(utils.pilabels);
                        $scope.hosts = _.values(_.keys(hosts[$scope.app]).reduce((pits, host) => {
                            var h = hTh[host];
                            if (!pits[h]) { pits[h] = { h: h, pitypes: [] }; }
                            pits[h].pitypes = _.union(pits[h].pitypes, pitypes[host]);
                            return pits;
                        }, {}));

                        $scope.pitypes = _($scope.hosts.map((x) => x.pitypes)).flatten().uniq().value();
                    };

                recompute();

                $scope.$watch(() => $scope.app, recompute);
                $scope.pilabels = utils.pilabels;

                window._pls = $scope;
            }
        };
    });