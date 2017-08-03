const fs = require('fs');
const level = require('level');

const {
  dbdir
} = JSON.parse(fs.readFileSync('./config.json'));
const db = level(dbdir, {
  valueEncoding: 'json'
});
const data = {};

const showCount = process.argv.includes('-c') || process.argv.includes('--count');

db.createReadStream()
  .on('data', ({
    key,
    value
  }) => {
    data[key] = value;
  }).on('end', () => {
    if (showCount) {
      console.log(Object.values(data).length);
    } else {
      console.log(JSON.stringify(data, null, 4));
    }
    process.exit(0);
  });
