// takes the raw hosts list from 
// https://github.com/StevenBlack/hosts
// and 2LDs truncates it, and 
// turns it into a nice json obj so we can easily
// identify at networks :D

// the file currently has 33000+ hosts.

var fs = require('fs'),
    _ = require('lodash'),
    headers,
    detectors = require('./detect-pitypes').detectors,
    ipv4re = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/;
// ipv6re = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;

var loadFile = (fname) => {
        const text = fs.readFileSync(fname).toString(),
            hosts = text.split('\n')
            .filter((x) => x.length > 0 && x.trim().length > 0 && x.indexOf('0.0.0.0') === 0)
            .map(h => h.slice('0.0.0.0'.length + 1).trim())
            .filter(h => h !== '0.0.0.0');

        return hosts;
    },
    getDomainsById = () => {
        // returns { company_name => [d1, d2, d3] }
        return loadFile(config.in_company_domains)
            .map((x) => { x.domains = x.domains.split(' ').map((x) => x.trim().toLowerCase()); return x; })
            .reduce((obj, x) => { obj[x.id] = x.domains; return obj; }, {});
    },
    getDetailsById = () => {
        // returns id -> details map 
        return loadFile(config.in_company_domains)
            .filter((x) => x.id)
            .map((x) => { x.domains = x.domains.split(' ').map((x) => x.trim().toLowerCase()); return x; })
            .reduce((obj, x) => { obj[x.id] = x; return obj; }, {});
    },
    getIdByDomain = () => {
        // reversed version of ^^ getDomainsById for O(1)
        // returns { domain => rowid, shorten_2ld(domain) => rowid }
        var cd = getDomainsById(),
            domains = {};
        _.keys(cd).map((id) => {
            cd[id].map((domain) => {
                domains[domain] = domains[shorten_2ld(domain)] = id;
            });
        });
        return domains;
    },
    getPlatformCompanies = () => {
        return loadFile(config.in_platform_companies).reduce((obj, x) => { obj[x.platform] = x.company; return obj; }, {});
    },
    decodeURL = (url) => {
        url = decodeURIComponent(url);
        if (url.indexOf('?') >= 0) {
            // chop off the querystring for urls that have it
            return qs.parse(url.slice(url.indexOf('?') + 1));
        }
    },
    decode_all = (datas) => {
        return datas.map((x) => decodeURL(x.url)).filter((x) => x);
    },
    count_hosts = (data, app) => {
        if (app !== undefined) { data = _(data).filter((x) => x.app === app); }
        return _(data).reduce((y, x) => { y[x.host] = y[x.host] ? y[x.host] + 1 : 1; return y; }, {});
    },
    getParty = (data, party) => {
        party = party.toLowerCase().trim();
        var hosts = getDomainsById()[party] || [];
        return data.filter((x) => {
            var host = x.host.toLowerCase();
            return _.some([host.indexOf(party) >= 0].concat(hosts.map((h) => host.indexOf(h) >= 0)));
        });
    },
    getSLDs = () => {
        var ccsld = fs.readFileSync('curated/ccsld.txt').toString();
        return ccsld.split('\n').filter((x) => (x && x.trim().length > 0 && x.indexOf('.') >= 0 && x.indexOf('//') < 0 && x.indexOf('!') < 0 && x.indexOf('*') < 0));
    },
    decodeHeaders = (record) => record && record.headers && JSON.parse(decodeURIComponent(record.headers)),
    decodeBody = (record) => record && record.body && decodeURIComponent(record.body),
    decode = (record) => _.extend({}, decodeURL(record.url), decodeHeaders(record) || {}, decodeBody() || {}),
    detect = (data) => {
        // returns an array one per data element
        // [ { record: {<data item>}, types: [ 'DEVICE_SOFT' ] } ... { } { } ]
        return data.map((x) => ({ record: x, decode: decode(x) })).map((pair) => {
            var d = pair.decode,
                types = _.keys(d).map((k) => detectors.map((detector) => {
                    // console.log(detector.type, ' testing ', k, d[k], detector.kv(k,d[k]), detector.kv(k,d[k]) ? true : false);
                    return detector.kv(k, d[k]) ? detector.type : undefined;
                }).filter((x) => x)).reduce((a, x) => a.concat(x), []);
            // console.info('types detected for ', d, _.uniq(types));
            return { record: pair.record, types: _.uniq(types) };
        });
    },
    detect_by_host = (detected, hostkey) => detected.reduce((dict, x) => {
        var host = hostkey && x.record[hostkey] || x.record.host;
        dict[host] = _.uniq((dict[host] || []).concat(x.types));
        return dict;
    }, {}),
    hosts_by_app = (data, hostkey) => {
        return _(data).reduce((y, x) => {
            var host = hostkey && x[hostkey] || x.host;
            y[x.app] = y[x.app] || {};
            y[x.app][host] = y[x.app][host] ? y[x.app][host] + 1 : 1;
            return y;
        }, {});
    },
    shorten_2ld = (host) => {
        host = host.trim().toLowerCase();
        // raw ip address
        if (ipv4re.test(host)) {
            console.log('detected an ipv4 address, skipping shortening', host);
            return host;
        }
        var match = host.match(/([^\.]*)\.([^\.]*)$/);
        if (match) {
            var short = match[0];
            if (exports.ccslds.indexOf(short) >= 0) {
                var onemore = host.slice(0, host.length - short.length - 1).match(/([^\.]*)$/);
                if (onemore) {
                    return [onemore[0], short].join('.');
                } else {
                    // fallback
                    return host;
                }
            }
            return short;
        }
        return host;
    },
    fold_into_2ld = (data) => {
        data.map((x) => { x.host_2ld = shorten_2ld(x.host); });
        return data;
    },
    fold_in_host_company = (data) => {

        // old code was O(n) and fast but only exact matched
        // var dc = getDomainCompanies();
        // data.map((row) => {
        // 	if (dc[row.host] || dc[row.host_2ld]) { row.host_company = dc[row.host] || dc[row.host_2ld]; return; }
        // 	// try app company
        // 	var app_company = row.company && row.company.toLowerCase();
        // 	if (app_company && row.host.indexOf(app_company) >= 0) { 
        // 		row.host_company = app_company;
        // 	}
        // });
        var d2id = getIdByDomain(),
            details = getDetailsById(),
            name2id = _.values(details).reduce((a, x) => {
                a[x.company] = x.id;
                a[x.company.toLowerCase()] = x.id;
                return a;
            }, {}),
            names = _.keys(name2id).filter((x) => x),
            domains = _.keys(d2id).filter((x) => x.length),
            missing = [];

        data.map((row) => {
            // Phase 0 : check app company explicitly
            var host = row.host,
                app_company = row.company && row.company.toLowerCase();

            // Phase 1: check to see if the host is among domains of companies we know
            var matching_domains = _(domains)
                .filter((domain_frag) => host.indexOf(domain_frag) >= 0)
                .sortBy((x) => -x.length) // longer matches first
                .value(),
                company = matching_domains.length && d2id[matching_domains[0]];
            if (company) {
                row.host_company = company;
                return;
            }

            // ad
            missing = _.union(missing, [host]);

            // phase 2: Try to match with app company name
            if (app_company && row.host.indexOf(app_company) >= 0) {
                row.host_company = name2id[app_company];
                // fall back to app_company
                if (!row.host_company) {
                    console.error('Warning: no app company in name2id for ', app_company);
                    row.host_company = app_company;
                }
                return;
            }

            // Phase 3 : check to see if the host contains the name is among companies we know
            var matching_companies = _(names)
                .filter((name_frag) => host.indexOf(name_frag.toLowerCase()) >= 0)
                .sortBy((x) => -x.length) // longer matches first
                .value();
            if (matching_companies.length) {
                row.host_company = name2id[matching_companies[0]];
                return;
            }
            console.info('could not identify company for ', host);
        });

        return missing;
    };

exports.ccslds = getSLDs();

if (require.main === module) {
    var thing =
        loadFile('./hosts.txt').map((x) => shorten_2ld(x)).reduce((hosts, a) => {
            hosts[a] = true;
            return hosts;
        }, {});


    fs.writeFileSync('./ads.json', JSON.stringify(thing));
    console.log('done ', thing);
}