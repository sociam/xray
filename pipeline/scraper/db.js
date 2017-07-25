'use strict';
/*global require, module */

const config = require('/etc/xray/config.json');
const pg = require('pg');
const logger = require('./logger.js');

const db_cfg = config.scraper.db;
db_cfg.max = 10;
db_cfg.idleTimeoutMillis = 30000;

//this initializes a connection pool
//it will keep idle connections open for 30 seconds
//and set a limit of maximum 10 idle clients
const pool = new pg.Pool(db_cfg);

pool.on('error', function(err) {
    logger.err('idle client error', err.message, err.stack);
});

//export the query method for passing queries to the pool
function query(text, values) {
    logger.debug('query:', text, values);
    return pool.query(text, values);
}

// the pool also supports checking out a client for
// multiple operations, such as a transaction
function connect() {
    return pool.connect();
}

async function insertDev(dev) {
    var res = await query('SELECT id FROM developers WHERE $1 = ANY(email)', [dev.email]);
    if (res.rowCount > 0) {
        return res.rows[0].id;
    }

    // maybe dev id needs to be URL encoded?
    let store_site = 'https://play.google.com/store/apps/developer?id=' + dev.id;
    res = await query('INSERT INTO developers(email,name,store_site,site) VALUES ($1, $2, $3, $4) RETURNING id', [
        [dev.email], dev.name, store_site, dev.site
    ]);
    return res.rows[0].id;
}

module.exports = {

    queryAppsToDownload: async(batch) =>{
        var res = await query('SELECT * FROM app_versions WHERE downloaded = False');
        if (res.rowCount <= 0) {
            logger.warning('No downloads found. Consider slowing down donwloader or speeding up scraper');
            return;
        }   
        logger.info('Found apps to download: ', res.rowCount);
        return res.rows.splice(0,batch);
    },

    updateDownloadedApp: async(app) => {
        let cl= await connect();
        logger.debug('Connected');
        try {
            await cl.query('UPDATE app_versions SET downloaded=True WHERE id = $1', [
                app.appId]);

            await cl.query('COMMIT');
        } catch  (e) {
            await cl.query('ROLLBACK');
            throw e;
        } finally {
            cl.release();
        }
    },

    insertPlayApp: async(app, region) => {

        var devId = await insertDev({
            name: app.developer,
            id: app.developerId,
            email: app.developerEmail,
            site: app.developerWebsite
        });

        var appExists = false,
            verExists = false;
        var verId;
        var res = await query('SELECT * FROM apps WHERE id = $1', [app.appId]);

        if (res.rowCount > 0) {
            appExists = true;
            // app exists in database, check if version does as well
            var res1 = await query(
                'SELECT id FROM app_versions WHERE app = $1 AND store = $2 AND region = $3 AND version = $4', [app.appId, 'play', region, app.version]);

            if (res1.rowCount > 0) {
                // app version is also in database
                verExists = true;
                verId = res1.rows[0].id;
            }
        }

        var client = await connect();
        logger.debug('Connected');

        await client.query('BEGIN'); // maybe this should be inside the try?
        try {
            if (!verExists) {
                if (!appExists) {
                    await client.query('INSERT INTO apps VALUES ($1, $2)', [app.appId, []]);
                }

                let res = await client.query(
                    'INSERT INTO app_versions(app, store, region, version, downloaded) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    [app.appId, 'play', region, app.version, app.isDownloaded]
                );
                verId = res.rows[0].id;

                await client.query('UPDATE apps SET versions=versions || $1 WHERE id = $2', [
                    [verId], app.appId
                ]);

            }

            await client.query(
                'INSERT INTO playstore_apps VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)', [
                    verId,
                    app.title,
                    app.summary,
                    app.description,
                    app.url,
                    app.price,
                    app.free,
                    app.score,
                    app.reviews,
                    app.genreId,
                    app.familyGenreId,
                    app.minInstalls,
                    app.maxInstalls,
                    devId,
                    app.updated,
                    app.androidVersion,
                    app.contentRating,
                    app.screenshots,
                    app.video,
                    app.recentChanges,
                    new Date().toDateString()
                ]);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        return verId;
    }
};

if (!module.parent) {
    query('SELECT * FROM developers');
}
