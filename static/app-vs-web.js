

// this module 
// input:
//   app-pairs.csv - app apk vs web pairing
//   trie-5k.json - breakdown of apk to lib 
//   lib-to-company - mapping from library to company
//   web-to-company - mapping from website to company
// 	 company-metadata.csv (parent relationships and core metadata including juristidction)
// 
// outputs: csv file: 
//   app apk, web site, app trackers, web trackers, # of app trackers, # of web trackers, intersection, # of app companies, # of web companies, intersection

var utils = require('./utils'),
	fs = require('fs'),
	promise = require('bluebird'),
	_ = require('lodash'),
	chop_2ld = (name) => {
		var match = name.match(/^[^\.]*\.[^\.]*/);
		if (match) { 
			return match[0];
		}
		return name;
	},
	canonicalise_2ld = (url) => {
		url = url.toLowerCase().trim();
		if (url.indexOf('http') >= 0) { url = url.slice(url.indexOf('//')+2); }
		if (url.indexOf('/') >= 0) { url = url.slice(0,url.indexOf('/')); }
		return utils.shorten_2ld(url);
	},lct = (x) => x.toLowerCase().trim();

if (require.main === module) { 
	if (process.argv.length < 7) { 
		console.log(`input:
			app-pairs.csv - app apk vs web pairing
			trie-5k.json - breakdown of apk to lib 
			lib-to-company.csv - mapping from library to company
			trackers.csv - list of trackers per website
			web-to-company.csv - mapping from website to company
			company-metadata.csv - path to company metadata
		out: 
			app-overlap.csv `);
	} else {

		var app_pairs = utils.loadCSV(process.argv[2]).map((pair) => { pair.url = canonicalise_2ld(pair["web site"]); return pair; }),
			app_libs = JSON.parse(fs.readFileSync(process.argv[3])),
			lib_company = utils.loadCSV(process.argv[4]).filter((x) => x.type.indexOf('ads') >= 0).reduce((d, lib) => { d[lct(lib.package)] = lct(lib.company); return d; }, {}),
			web_company = utils.loadCSV(process.argv[6]).filter((x) => x.type.indexOf('advert') >= 0).reduce((d, tr) => { d[lct(tr.host)] = lct(tr.company); return d; }, {}),			
			web_trackers = utils.loadCSV(process.argv[5], ['company','jurisdiction','url']).reduce((d, set) => {
				var url = canonicalise_2ld(set.url);
				d.company = lct(d.company);
				if (d.company && web_company[d.company] && web_company[d.company]) { 
					// include only ads
					d[url] = (d[url] || []).concat(d.company);
				}
				return d;
			}),
			company_metadata = utils.loadCSV(process.argv[7]).reduce((d,cinfo) => {	d[cinfo.id] = cinfo; return d;	});

		var rows = app_pairs.map((pair) => {
			//  ------------------------->
			var applibs = app_libs[pair.apk].map((lib) => lib_company[lib]).filter((x) => x),
				webtks = web_company[pair.url];

			if (!applibs) { 
				console.error('no app libs in trie for ', pair.apk);
				return;
			}
			if (!webtks) {
				console.error('no entry for ', pair.url, 'skipping');
				return;
			}

			var intersection = _.intersectin(applibs, webtks);

			console.info(` ${pair.apk}(${applibs.length}) vs ${pair.url}(${webtks.length}) - intersection: ${intersection} `);
			return [pair.apk, pair.url, applibs, applibs.length, webtks, webtks.length, intersection, intersection.length];
			// return [pair.apk, pair.url, applibs.length, webtks.length, intersection.length];
		}).filter((x) => x);

		console.info(`writing csv to ${process.argv[8]}, ${rows.length}`);
		utils.writeCSV(process.argv[8]);
	}
}