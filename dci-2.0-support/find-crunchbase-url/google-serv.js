const express = require('express'),
    app = express(),
    webdriver = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    By = webdriver.By,
    until = webdriver.until,
    options = new chrome.Options(),
    Promise = require('bluebird'),
    fs = require('fs'),
    _ = require('lodash'),
    search_result_selector = 'cite._Rm',
    cache_path = './cache.json',
    port = 3333,
    url = require('url'),
    cors = require('cors');

var database = {};

// on crunchbase :  search_result_selector = '#rso > div > div > div:nth-child(1) > div > div > div > div > div > cite > font > font';

const createDriver = () => {
        var driver = new webdriver.Builder()
            .usingServer('http://localhost:4444/wd/hub')
            .withCapabilities(webdriver.Capabilities.chrome())
            .build();
        driver.manage().timeouts().setScriptTimeout(10000);
        return driver;
    },
    findCompany = (cname) => {
        // var idpat = /id=([^&]*)/;
        var driver = createDriver();
        driver.manage().deleteAllCookies();
        return Promise.delay(1500 + 1000 * Math.random())
            .then(() => driver.get(`https://www.google.com/search?q=crunchbase%20${cname.trim().toLowerCase()}`))
            // /html/body/home/div/div/div/div/search/div/div/md-content/results/div/div/grid/div/div[2]/grid-body/md-virtual-repeat-container/div/div[2]/div/div/div[2]/field-formatter/div/span/a
            // body > home > div > div > div > div > search > div > div > md-content > results > div > div > grid > div > div.grid-body.layout-column.flex > grid-body > md-virtual-repeat-container > div > div.md-virtual-repeat-offsetter > div > div > div:nth-child(2) > field-formatter > div > span > a
            .then(() => driver.wait(until.elementLocated(By.css('cite._Rm')), 60000))
            .then((card) => {
                console.log('==> got it! ');
                return driver.findElements(By.css(search_result_selector));
            }).then((elements) => {
                console.log('els > ', elements.length, elements);
                return Promise.all(elements.map(elem => driver.executeScript("return arguments[0].innerHTML;", elem)));
            }).then((results) => {
                driver.quit();
                return results;
            }).catch(e => {
                driver.quit();
                return {};
            });
    },
    save_db = () => {
        console.info('updating db with ', _.keys(database).length, 'entries', _.keys(database));
        fs.writeFile(cache_path, JSON.stringify(database));
    },
    run_server = (driver) => {
        app.use(cors());
        app.get('/search_cb_url', function(req, res) {
            const name = req.query && req.query.q && req.query.q.trim().toLowerCase(),
                hit = database[name];

            res.setHeader('Content-Type', 'application/json');

            if (!name || name.length === 0) {
                res.status(400)
                res.send(JSON.stringify({ message: `bad request, use param ?q=. ${name}` }));
                return;
            }

            let p = hit ? Promise.resolve(hit) : findCompany(name);
            p.then((results) => {
                res.send(results);
                if (!hit) {
                    database[name] = results;
                    save_db()
                }
            });
        })
        app.listen(port, function() { console.log('Ready'); });
    };


if (require.main === module) {

    if (process.argv[2]) {
        console.info('manually querying for ', process.argv[2])
        findCompany(process.argv[2]).then((matches) => {
            console.log('matches ', matches);
            driver.quit();
        });
    } else {
        console.info(`running in server mode, port ${port} reading from ${cache_path}`);
        if (fs.existsSync(cache_path)) {
            console.log('')
            database = JSON.parse(fs.readFileSync(cache_path));
        }
        run_server();
    }
}