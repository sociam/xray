const webdriver = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    By = webdriver.By,
    until = webdriver.until,
    service = new chrome.ServiceBuilder()
    .enableVerboseLogging()
    .build(),
    options = new chrome.Options(),
    Promise = require('bluebird'),
    fs = require('fs'),
    _ = require('lodash'),
    search_result_selector = 'body > home > div > div > div > div > search > div > div > md-content > results > div > div > grid > div > div.grid-body.layout-column.flex > grid-body > md-virtual-repeat-container > div > div.md-virtual-repeat-offsetter > div > div > div:nth-child(2) > field-formatter > div > span > a';

function createDriver() {
    var driver = new webdriver.Builder()
        .usingServer('http://localhost:4444/wd/hub')
        .withCapabilities(webdriver.Capabilities.chrome())
        .build();
    driver.manage().timeouts().setScriptTimeout(10000);
    return driver;
}

//websites = process.argv[2] ? loadCSV(process.argv[2]) : undefined,
findCompany = (driver, cname) => {
    // var idpat = /id=([^&]*)/;
    return Promise.delay(1500 + 1000 * Math.random())
        .then(() => driver.get(`https://www.crunchbase.com/app/search?q=${cname.trim().toLowerCase()}`))
        // /html/body/home/div/div/div/div/search/div/div/md-content/results/div/div/grid/div/div[2]/grid-body/md-virtual-repeat-container/div/div[2]/div/div/div[2]/field-formatter/div/span/a
        // body > home > div > div > div > div > search > div > div > md-content > results > div > div > grid > div > div.grid-body.layout-column.flex > grid-body > md-virtual-repeat-container > div > div.md-virtual-repeat-offsetter > div > div > div:nth-child(2) > field-formatter > div > span > a
        .then(() => driver.wait(until.elementLocated(By.css(search_result_selector)), 60000))
        .then((card) => {
            console.log('==> about to click ');
            driver.findElement(By.css(search_result_selector)).click();
            return driver.wait(until.urlContains('/organization/'), 15000);
        }).catch((err) => {
            console.error('error caught ', err);
        }).then((b) => {
            return driver.getCurrentUrl();
        }).then((url) => {
            let garbage = url.indexOf("#/entity");
            if (garbage >= 0) {
                return url.slice(0, url.indexOf(garbage));
            }
            return url;
        });
};


if (require.main === module) {
    console.log('hi ', process.argv[2]);
    if (process.argv[2]) {
        console.info('looking for ', process.argv[2])
        var driver = createDriver();
        driver.manage().deleteAllCookies();


        // driver.get("http://www.google.com");		
        // driver.getTitle().then(function(title) {
        // 	console.log(title);
        // });		
        // driver.quit();

        findCompany(driver, process.argv[2]).then((matches) => {
            console.log('matches ', matches);
            driver.quit();
        });
    }
}

// driver.get('http://www.google.com/ncr');
// driver.findElement(By.name('q')).sendKeys('webdriver');
// driver.findElement(By.name('btnG')).click();
// driver.wait(until.titleIs('webdriver - Google Search'), 1000);
// driver.quit();