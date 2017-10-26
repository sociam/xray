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
    search_result_selector = 'cite._Rm';
// search_result_selector = '#rso > div > div > div:nth-child(1) > div > div > div > div > div > cite > font > font';

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