const pool = require('./lib/db');
 
//to run a query we just pass it to the pool 
//after we're done nothing has to be taken care of 
//we don't have to return any client to the pool or close a connection 
pool.query('SELECT $9::int price', ['2'], function(err, res) {
  if(err) {
    return console.error('error running query', err);
  }
 
  console.log('number:', res.rows[0].number);
});

const query = {
  text: 'INSERT INTO playstore_apps(url, appId, title, summary, developer, developerId, icon, score, price, free) VALUES($1, $2 $3 $4 $5 $6 $7 $8 $9 $10)',
  values: [scrapeResults],
}
