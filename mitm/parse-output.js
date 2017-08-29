var parse = require('csv-parse/lib/sync'),
    fs = require('fs'),
    _ = require('lodash'),
    headers,
    qs = require('querystring'),
    config = JSON.parse(fs.readFileSync('./config.json')),
    detectors = require('./detect-pitypes').detectors,
    ipv4re = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/;
// ipv6re = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;

var loadFile = (fname) => {
        var text = fs.readFileSync(fname).toString();
        console.log("Parsing file ", fname, "(", text.length, ")");
        var data = parse(text, { max_limit_on_data_read: 9999999999 });
        headers = data[0];
        data = data.slice(1);
        data = data.map((x) => _.zipObject(headers, x));
        return data;
    },
    loadDir = () => {
        // loads all of the data in the specified directory
        var srcdir = config.inputdir;
        return fs.readdirSync(srcdir)
            .filter((fname) => fname.indexOf('.csv') >= 0)
            .reduce((arr, fname) => arr.concat(loadFile([srcdir, fname].join('/'))), []);
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

exports.loadFile = loadFile;
exports.decode_all = decode_all;
exports.count_hosts = count_hosts;
exports.getDomainsById = getDomainsById;
exports.getIdByDomain = getIdByDomain;
exports.getDetailsById = getDetailsById;
exports.getPlatformCompanies = getPlatformCompanies;
exports.load = loadDir;
exports.getParty = getParty;
exports.decodeURL = decodeURL;
exports.decodeHeaders = decodeHeaders;
exports.decodeBody = decodeBody;
exports.decode = decode;
exports.ccslds = getSLDs();
exports.data = fold_into_2ld(loadDir());
exports.missing = fold_in_host_company(exports.data);
exports.detect = detect;
exports.detected = detect_by_host(detect(exports.data));
exports.hosts_by_app = hosts_by_app(exports.data); // hosts_by_app(exports.data, 'host_2ld');
exports.detectors = detectors;

var main = () => {
    if (config.out_hosts_by_app) {
        console.info("writing Hosts By App table to:", config.out_hosts_by_app, _.keys(exports.hosts_by_app).length, ' apps');
        fs.writeFileSync(config.out_hosts_by_app, JSON.stringify(exports.hosts_by_app));
    }
    if (config.out_pi_by_host) {
        console.info("writing PI types by host to:", config.out_pi_by_host, _.keys(exports.detected).length, ' hosts');
        fs.writeFileSync(config.out_pi_by_host, JSON.stringify(exports.detected));
    }
    if (config.out_data) {
        console.info("writing all data records to:", config.out_data, _.keys(exports.data).length, ' records');
        fs.writeFileSync(config.out_data, JSON.stringify(exports.data));
    }
    if (config.out_company_details) {
        var details = getDetailsById();
        console.info("writing company details (to json):", config.out_company_details, _.keys(details).length, ' records');
        fs.writeFileSync(config.out_company_details, JSON.stringify(details));
    }
    if (config.out_missing) {
        console.info("writing missing hosts (to txt):", config.out_missing, exports.missing.length);
        fs.writeFileSync(config.out_missing, exports.missing.join('\n'));
    }

    if (config.out_h2h_2ld) {
        let h2h = exports.data.reduce((r, a) => _.extend(r, {
            [a.host]: a.host_2ld
        }), {});
        fs.writeFileSync(config.out_h2h_2ld, JSON.stringify(h2h));
    }
    if (config.out_h2c) {
        let h2c = exports.data.reduce((r, a) => _.extend(r, a.host_company ? {
            [a.host]: a.host_company,
            [a.host_2ld]: a.host_company
        } : {}), {});
        fs.writeFileSync(config.out_h2c, JSON.stringify(h2c));
    }
    if (config.out_app_company) {
        let app_company = exports.data.reduce((r, a) => _.extend(r, a.company ? {
            [a.app]: a.company
        } : {}), {});
        fs.writeFileSync(config.out_app_company, JSON.stringify(app_company));
    }



    // no longer used.	
    // if (config.in_fakeapps && config.out_fakeapps) {
    // 	console.info('writing fake apps >> ', config.in_fakeapps, '->', config.out_fakeapps);
    // 	fs.writeFileSync(config.out_fakeapps, JSON.stringify(loadFile(config.in_fakeapps)));
    // }
};

if (require.main === module) {
    // console.info(process.argv.length);
    // process.argv.forEach(function (val, index, array) {
    //   console.log(index + ': ' + val);
    // });	
    if (process.argv.length === 3) {
        // console.log('fo ', process.argv.length);
        main(process.argv[2]);
    } else {
        main();
    }
}