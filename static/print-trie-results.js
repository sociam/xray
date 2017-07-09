const fs = require('fs');
const level = require('level');

const {
  dbdir
} = JSON.parse(fs.readFileSync('./config.json'));
const db = level(dbdir, {
  valueEncoding: 'json'
});
const data = {};

db.createReadStream()
  .on('data', ({
    key,
    value
  }) => {
    data[key] = value;
  }).on('end', () => {
    //console.log(Object.values(data).length);
    console.log(JSON.stringify(data, null, 4));
    process.exit(0);
  });
