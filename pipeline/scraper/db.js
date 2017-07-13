/*global require, module */

var config = require('/etc/xray/config.json');
const pg = require('pg');

var db_cfg = config.scraper.db;
db_cfg.max = 10;
db_cfg.idleTimeoutMillis = 30000;

//this initializes a connection pool
//it will keep idle connections open for 30 seconds
//and set a limit of maximum 10 idle clients
const pool = new pg.Pool(config);

pool.on('error', function (err, client) {
	console.error('idle client error', err.message, err.stack);
});

//export the query method for passing queries to the pool
function query(text, values, callback) {
	console.log('query:', text, values);
	return pool.query(text, values, callback);
};

// the pool also supports checking out a client for
// multiple operations, such as a transaction
function connect(callback) {
	return pool.connect(callback);
};

async function insertDev(dev) {
	var res = await query("SELECT id FROM developers WHERE email = ANY($1)", [dev.email]);
	if (res.length > 0) {
		return Promise.resolve(res.rows[0].id);
	}

	// maybe dev id needs to be URL encoded?
	let store_site = 'https://play.google.com/store/apps/developer?id='+dev.id;
	res = await query("INSERT INTO developers VALUES ($1, $2, $3, $4) RETURNING id",
	                  [dev.email, dev.name, store_site, dev.site]);
	return Promise.resolve(res.rows[0].id);
}

module.exports = {
	insertPlayApp: async (app, region) => {
		var devId = await insertDev({
			name: app.developer,
			id: app.developerId,
			email: app.developerEmail,
			site: app.developerSite
		});

		var appExists = false, verExists = false;
		var vers = [];
		var verId;
		var res = await query("SELECT * FROM apps WHERE id = $1", [app.appId]);

		if (res.length > 0) {
			appExists = true;
			vers = res.rows[0].versions;
			// app exists in database, check if version does as well
			var res1 = await query(
				"SELECT id FROM app_versions WHERE app = $1 AND id = $2",
				[ app.appId, app.version ]);

			if (res1.length > 0) {
				// app version is also in database
				verExists = true;
				verId = res1.rows[0].id;
			}
		}

		var client = await connect();
		console.log("Connected");

		await client.query("BEGIN"); // maybe this should be inside the try?
		try {
			if (!verExists) {
				if (appExists) {
					vers.push(app.version);
					await client.query("UPDATE apps SET versions=$1 WHERE id = $2",
					                   [ vers, app.appId ]);
				} else {
					await client.query("INSERT INTO apps VALUES ($1 $2)",
					                   [ app.appId, [app.version] ]);
				}

				let res = await client.query(
					"INSERT INTO app_versions(app, version) VALUES ($1, $2) RETURNING id",
					[ app.appId, app.version ]
				);
				verId = res.rows[0].id;
			}

			await client.query(
				"INSERT INTO playstore_apps VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)",
				[
					verId,
					app.title,
					app.summary,
					app.description,
					app.url,
					app.price,
					app.free,
					app.store,
					app.reviews,
					app.genreId,
					app.familyGenreId,
					app.minInstalls,
					app.maxInstalls,
					devId,
					Date.parse(app.updated),
					app.androidVersion,
					app.contentRating,
					app.screenshots,
					app.video,
					app.recentChanges,
					region,
					new Date()
				]);
			await client.query("SELECT * FROM apps");
			await client.query("COMMIT");
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	}
};
