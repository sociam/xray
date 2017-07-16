/* global angular, _, jQuery, Backbone */

angular.module('dci').factory('utils', () => {

    var utils = {
        // company id -> company names
        makeId2Names: (details) =>
            _.keys(details).reduce((a, id) => {
                a[id] = details[id].company;
                return a;
            }, {}),

        assert: (x) => { if (!x) { throw new Error(x); } },

        // returns { host -> companyid }
        makeHTC: function(data) {
            var hTh = this.makeHTH(data);
            return data.reduce((r, a) => {
                if (a.host_company) {
                    r[a.host] = r[a.host_2ld] = a.host_company;
                } else {
                    // no host company provided
                    var mfirst = hTh[a.host].match(/^([^\.]+)\./);
                    if (mfirst) {
                        r[a.host] = r[a.host_2ld] = mfirst[1];
                    } else {
                        console.error('no company for host ', a.host);
                        return r;
                    }
                }
                return r;
            }, {});
        },

        // returns { host -> host_2ld }
        makeHTH: (data) => data.reduce((r, a) => {
            // host -> 2ld
            if (a.host_2ld) {
                r[a.host] = a.host_2ld;
            } else { console.error('warning no 2ld ', a, a.host); }
            return r;
        }, {}),

        // returns true if company_id is of marketing type t
        isType: (details, id, type) => id &&
            details[id] &&
            details[id].typetag &&
            details[id].typetag.indexOf(type) >= 0,

        // aggressive matching of appcompany 			
        cimatch: (appcompany, x) => appcompany &&
            (x || '').toLowerCase() === appcompany.toLowerCase(),

        toAppId: (appname) => appname + " app",

        deAngular: (obj) => _.pickBy(obj, (v, k) => k.indexOf('$$') < 0),

        // isType and not 1st party
        is3rdPartyType: (appcompany, details, id, type) =>
            utils.isType(details, id, type) &&
            !_.some([details[id] && details[id].company || id, id].map((x) => utils.cimatch(appcompany, x))),

        // compile { company_id -> [pitype1,pitype2] .. } filtering by optional threshold
        makeCompany2pi: (app, hosts, pitypes, hTc, threshold) => {
            var apphosts = _(hosts[app]).pickBy((val, key) => (val > threshold || 0) && hTc[key]).keys().value();

            // next we wanna group together all the pi_types, and consolidate around company
            // console.info('threshold', $scope.threshold, 'apphosts', apphosts.length);
            return apphosts.reduce((r, host) => {
                var host_company = hTc[host],
                    host_pis = pitypes[host] || [];
                if (!host_company) {
                    console.error('no company for host ', host);
                    return r;
                }
                r[host_company] = _.union(r[host_company] || [], host_pis);
                return r;
            }, {});
        },
        makeApp2company: function(apps, c2pi, hosts, hTc, threshold) {
            // WARNING this transforms keys into toApp(appname)
            var apphosts = _.fromPairs(apps.map((app) => [app, _(hosts[app]).pickBy((val, key) => (val > threshold || 0) && hTc[key]).keys().value()])),
                app2pairs = _.map(apphosts, (hosts, app) => [this.toAppId(app), _(hosts).map((host) => hTc[host]).uniq().value()]);
            return _.fromPairs(app2pairs);
        },
        // makeApp2pi:(apps, data, c2pi, hosts, threshold)  => {
        // 	var hTc = utils.makeHTC(data),
        // 		apphosts = _(apps).map((app) => [app, _(hosts[app]).pickBy((val, key) => (val > threshold || 0) && hTc[key]).keys().value()]).fromPairs().value();				
        // 	return _.map(apphosts).map((hosts, app) => [app, _(hosts).map((host) => c2pi[hTc[host]]).flatten().uniq().value()]).fromPairs().value();
        // },
        makePDCIc2pi: (apps, hosts, pitypes, hTc, threshold) => {
            return apps.reduce((result, app) => {
                var c2pi = utils.makeCompany2pi(app, hosts, pitypes, hTc, threshold);
                // merge with result
                _.map(c2pi, (pis, company) => {
                    result[company] = _.union(result[company] || [], pis);
                });
                return result;
            }, {});
        },
        wordguid: function(n, words) {
            console.log('choosing ', words[Math.floor(Math.random() * words.length)]);
            return this.range(n).map(() => words[Math.floor(Math.random() * words.length)]).join('-');
        },
        makeCategories: (appCompany, details, c2pi) => {
            return {
                'app-publisher': _.pickBy(c2pi, (pis, company) =>
                    utils.cimatch(appCompany, company)),
                'app-functionality': _.pickBy(c2pi, (pis, company) =>
                    !utils.isType(details, company, 'ignore') &&
                    !utils.isType(details, company, 'platform') &&
                    utils.is3rdPartyType(appCompany, details, company, 'app')),
                'marketing': _.pickBy(c2pi, (pis, company) =>
                    !utils.isType(details, company, 'ignore') &&
                    !utils.isType(details, company, 'platform') &&
                    utils.is3rdPartyType(appCompany, details, company, 'marketing')),
                'usage tracking': _.pickBy(c2pi, (pis, company) =>
                    !utils.isType(details, company, 'ignore') &&
                    !utils.isType(details, company, 'platform') &&
                    utils.is3rdPartyType(appCompany, details, company, 'usage')),
                'payments': _.pickBy(c2pi, (pis, company) =>
                    !utils.isType(details, company, 'ignore') &&
                    !utils.isType(details, company, 'platform') &&
                    utils.is3rdPartyType(appCompany, details, company, 'payments')),
                'security': _.pickBy(c2pi, (pis, company) =>
                    !utils.isType(details, company, 'ignore') &&
                    !utils.isType(details, company, 'platform') &&
                    utils.is3rdPartyType(appCompany, details, company, 'security')),
                'other': _.pickBy(c2pi, (pis, company) =>
                    !utils.cimatch(appCompany, company) &&
                    !utils.isType(details, company, 'ignore') &&
                    !utils.isType(details, company, 'app') &&
                    !utils.isType(details, company, 'marketing') &&
                    !utils.isType(details, company, 'platform') &&
                    !utils.isType(details, company, 'usage') &&
                    !utils.isType(details, company, 'payments') &&
                    !utils.isType(details, company, 'security'))
            };
        },
        pilabels: {
            USER_PERSONAL_DETAILS: 'personal details',
            USER_LOCATION: 'your location',
            USER_LOCATION_COARSE: 'coarse location (town/city)',
            DEVICE_ID: 'phone id',
            DEVICE_SOFT: 'phone characteristics'
        },
        pi_desc: {
            USER_PERSONAL_DETAILS: 'Your personal attributes, such as your age and gender.',
            USER_LOCATION: 'Your precise location (sensed via GPS).',
            USER_LOCATION_COARSE: 'Your location to the nearest town or city.',
            DEVICE_ID: "Your phone's globally unique idenifier that can be used to identify you",
            DEVICE_SOFT: "Your phone's characteristics, such as the model number, and manufacturer, version of software."
        },
        cat_desc: {
            'app-publisher': "The app company, for realising essential functionality.",
            'app-functionality': "Third party functionality relating to making the app work.",
            'marketing': "Targeted advertising and marketing, including conducting market research based on personal demographics.",
            'usage tracking': "To help app developers (and others) understand how you much and which parts of the app you use.",
            'payments': "Functionality related to payments",
            'security': "Functionality related to ensuring data remains secure",
        },
        cat_desc_short: {
            'app-publisher': "Functionality",
            'app-functionality': "Functionality",
            'marketing': "Marketing",
            'usage tracking': "Usage Tracking",
            'payments': "Payments",
            'security': "Security",
            'other': 'Other'
        },
        range: function(l, h) {
            var a = [];
            if (_.isUndefined(h)) {
                h = l;
                l = 0;
            }
            for (var i = l; i < h; i++) { a.push(i); }
            return a;
        },
        guid: function(len) {
            len = len || 16;
            var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-';
            return Date.now() + '-' + this.range(0, len).map(function() {
                return alpha[Math.floor(Math.random() * alpha.length)];
            }).join('');
        }
    };
    return utils;
}).filter('titlecase', function() {
    return function(input) {
        var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

        input = input.toLowerCase();
        return input.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title) {
            if (index > 0 && index + match.length !== title.length &&
                match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
                (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
                title.charAt(index - 1).search(/[^\s-]/) < 0) {
                return match.toLowerCase();
            }

            if (match.substr(1).search(/[A-Z]|\../) > -1) {
                return match;
            }

            return match.charAt(0).toUpperCase() + match.substr(1);
        });
    };
});