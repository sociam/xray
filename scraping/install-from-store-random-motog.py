import time
import os
from PIL import Image
import subprocess

##########
##########

def getSub(pic, x, y):
    temp = []
    for j in range(10):
        for i in range(90):
            temp.append(pic[x+i, y+j])
    return temp

def allGreen(rgbvals):
    for val in rgbvals:
        if (val != (104, 159, 56, 255)):
            return False
    return True

def findGreenRectangle(filename):
    img = Image.open(SCREENSHOT_FILENAME)
    pic = img.load()

    for j in range(128):
        for i in range(8):
            if allGreen(getSub(pic, i*90, j*10)) and (j*10 > 400): # >400 to mitigate a missing pic in header
                return (i*90, j*10)
    return False

def screenshot(filename):
    os.system("adb %s shell screencap -p /storage/emulated/legacy/%s" % (DEVICE, filename))
    os.system("adb %s pull /storage/emulated/legacy/%s" % (DEVICE, filename))
    os.system("adb %s shell rm /storage/emulated/legacy/%s" % (DEVICE, filename))
    return filename

def goBackExitEtc():
    #os.system("adb %s shell input keyevent KEYCODE_BACK" % DEVICE)
    os.system("adb %s shell input keyevent KEYCODE_HOME" % DEVICE)
    #os.system("adb %s shell input keyevent KEYCODE_BACK" % DEVICE)

##########
##########

#### replace with device id. do adb devices to get device IDs.
ID = 'TODO'
DEVICE = '-s ' + ID

WAIT_TIME = 6
INSTALL_WAIT_TIME = 100
SCREENSHOT_FILENAME = 'screen-' + ID + '.png'

# read list of apps
packages2 = ['com.goodreads']
packages1 = ['com.google.android.youtube', 'com.baidu.searchbox', 'com.amazon.mshop.android.shopping', 'com.sina.news', 'com.sohu.sohuvideo', 'com.tmall.wireless', 'com.schneeloch.tcoredirect', 'com.amazon.mshop.android.shopping', 'com.teslanet.popads', 'com.amazon.mshop.android.shopping', 'air.bv.fc2.live', 'com.google.android.apps.authenticator2', 'com.qihoo.haosou', 'cn.tianya.light', 'tv.twitch.android.app', 'com.amazon.mshop.android.shopping', 'com.alibaba.intl.android.apps.poseidon', 'bbc.mobile.news.uk', 'com.amazon.mshop.android.shopping', 'com.amazon.aws.console.mobile', 'bbc.mobile.news.uk', 'com.soundcloud.android', 'com.globo.g1.app', 'com.eg.android.alipaygphone', 'br.uol.noticias', 'com.stackexchange.marvin', 'net.ettoday.phone', 'com.zhihu.android', 'com.deviantart.android.damobile', 'com.huanqiu.hk', 'com.mediaingea.uptodown.lite', 'tv.danmaku.bili', 'com.slack', 'com.vice.viceforandroid', 'jp.nicovideo.android', 'com.shutterstock.consumer', 'com.wikihow.wikihowapp', 'asjdwe.coupons.one', 'com.amazon.mshop.android.shopping', 'com.amazon.mshop.android.shopping', 'net.danlew.gfycat', 'com.weebly.android', 'com.reimage.reimagecleaner', 'com.douban.frodo', 'com.zendesk.android', 'ru.andrikeev.android.rutrackersearch', 'com.freerange360.mpp.businessinsider', 'com.lana.webtretho', 'com.theladbible.android', 'com.softonic', 'com.upwork.android']
packages = ['cc.dict.dictcc', 'com.dictionary', 'com.dictionary.bn', 'com.duckduckgo.mobile.android', 'com.ebooks.ebookreader', 'com.goodreads', 'com.merriamwebster', 'com.microsoft.bing', 'com.oup.gab.odquicksearch', 'com.scribd.app.reader0', 'com.tfd.mobile.TfdSearch', 'com.urbandictionary.android', 'org.freedictionary', 'org.leo.android.dict', 'org.wikipedia', 'com.cisco.webex.meetings', 'com.citrix.saas.gotowebinar', 'com.citrixonline.android.gotomeeting', 'com.fiverr.fiverr', 'com.indeed.android.jobsearch', 'com.jobkorea.app', 'com.timesgroup.timesjobs', 'com.monster.android.Views', 'naukriApp.appModules.login', 'net.infojobs.mobile.android', 'net.slideshare.mobile', 'com.crunchyroll.crmanga', 'com.dccomics.comics', 'com.marvel.comics', 'jp.comico', 'com.cinemex', 'com.eventbrite.attendee', 'com.imbc.mini', 'com.imdb.mobile', 'com.mobile.ign', 'com.netflix.mediaclient', 'com.ninegag.android.app', 'com.sonyliv', 'com.tudou.xoom.android', 'com.vimeo.android.videoapp', 'com.wikia.singlewikia.gta', 'com.wwe.universe', 'de.tvspielfilm', 'fr.m6.m6replay', 'tv.pps.mobile', 'au.com.nab.mobile', 'br.com.bb.android', 'br.com.gabba.Caixa', 'com.aastocks.dzh', 'com.akbank.android.apps.akbank_direkt', 'com.bca', 'com.bccard.mobilecard', 'com.bradesco', 'com.garanti.cepsubesi', 'com.hanaskcard.app.touchstamp', 'com.htsu.hsbcpersonalbanking', 'com.kbcard.cxh.appcard', 'com.kbstar.kbbank', 'com.paypal.android.p2pmobile', 'com.santander.app', 'com.sbi.SBIFreedomPlus', 'com.snapwork.hdfc', 'com.vakifbank.mobile', 'com.wf.wellsfargomobile', 'com.wooribank.pib.smart', 'com.wooricard.smartapp', 'com.yahoo.mobile.client.android.finance', 'fr.creditagricole.androidapp', 'gov.irs', 'info.percentagecalculator', 'pl.mbank', 'ru.tcsbank.mcp', 'se.bankgirot.swish', 'ua.privatbank.ap24', 'au.com.realestate.app', 'com.application.zomato', 'com.appsphere.innisfreeapp', 'com.aufeminin.marmiton.activities', 'com.cookpad.android.activities', 'com.done.faasos', 'com.dubizzle.horizontal', 'com.frenys.verdadoreto', 'com.global.foodpanda.android', 'com.gumtree.android', 'com.hotornot.app', 'com.houzz.app', 'com.ikea.catalogue.android', 'com.inditex.pullandbear', 'com.inditex.zara', 'com.kt.ollehfamilybox', 'com.move.realtor', 'com.openrice.snap', 'com.redfin.android', 'com.restaurant.mobile', 'com.rightmove.android', 'com.scripps.android.foodnetwork', 'com.trulia.android', 'com.trulia.android.rentals', 'com.zoopla.activity', 'de.mcdonalds.mcdonaldsinfoapp', 'de.pixelhouse', 'ecowork.seven', 'fr.disneylandparis.android', 'jp.co.recruit.mtl.android.hotpepper', 'kr.co.station3.dabang', 'com.AnatomyLearning.Anatomy3DViewer3', 'com.anghami', 'com.bandsintown', 'com.gaana', 'com.gaana.oldhindisongs', 'com.jangomobile.android', 'com.kugou.android', 'com.mixcloud.player', 'com.musixmatch.android.lyrify', 'com.spotify.music', 'com.vevo', 'de.radio.android', 'uk.co.sevendigital.android', 'com.abc.abcnews', 'com.andrewshu.android.reddit', 'com.backelite.vingtminutes', 'com.cnn.mobile.android.phone', 'com.dailymail.online', 'com.elpais.elpais', 'com.et.reader.activities', 'com.foxnews.android', 'com.google.android.apps.genie.geniewidget', 'com.hespress.android', 'com.huffingtonpost.android', 'com.ideashower.readitlater.pro', 'com.idmedia.android.newsportal', 'com.indomedia.tabpulsa', 'com.issuu.android.app', 'com.july.ndtv', 'com.makonda.blic', 'com.mobilesrepublic.appy', 'com.newspaperdirect.pressreader.android', 'com.newspaperdirect.pressreader.android.hc', 'com.nextmedia', 'com.nextmediatw', 'com.nextradiotv.bfmtvandroid', 'com.now.newsapp', 'com.nytimes.android', 'com.sumarya', 'com.tilab', 'com.Time', 'com.toi.reader.activities', 'com.usatoday.android.news', 'com.zing.znews', 'com.zinio.mobile.android.reader', 'com.zumobi.msnbc', 'de.cellular.focus', 'de.cellular.tagesschau', 'de.heute.mobile', 'de.lineas.lit.ntv.android', 'fr.lepoint.android', 'fr.playsoft.android.tv5mondev2', 'fr.playsoft.lefigarov3', 'id.co.babe', 'in.AajTak.headlines', 'net.aljazeera.english', 'net.trikoder.android.kurir', 'org.detikcom.rss', 'ru.rian.reader', 'se.sr.android', 'uk.co.economist', 'blibli.mobile.commerce', 'br.com.dafiti', 'com.acerstore.android', 'com.alibaba.aliexpresshd', 'com.appnana.android.giftcardrewards', 'com.asda.android', 'com.asos.app', 'com.ebay.kleinanzeigen', 'com.ebay.mobile', 'com.elevenst', 'com.elevenst.deals', 'com.etsy.android', 'com.flipkart.android', 'com.geomobile.tiendeo', 'com.goldtouch.ct.yad2', 'com.groupon', 'com.hmallapp', 'com.hnsmall', 'com.homeshop18.activity', 'com.interpark.shop', 'com.jabong.android', 'com.lamoda.lite', 'com.mercadolibre', 'com.mobisoft.morhipo', 'com.myntra.android', 'com.opensooq.OpenSooq', 'com.sahibinden', 'com.shopclues', 'com.shopping.limeroad', 'com.shpock.android', 'com.snapdeal.main', 'com.souq.app', 'com.taobao.taobao', 'com.thefancy.app', 'com.wallapop', 'com.wemakeprice', 'com.wildberries.ru', 'com.zalora.android', 'com.zulily.android', 'de.sec.mobile', 'gsshop.mobile.v2', 'id.co.elevenia', 'jp.co.paperboy.minne.app', 'jp.co.rakuten.auction.android.search', 'kr.co.emart.emartmall', 'kr.co.quicket', 'kr.co.ssg', 'net.giosis.shopping.jp', 'nl.marktplaats.android', 'pl.allegro', 'ru.auto.ara', 'ru.ozon.app.android', 'ru.yandex.market', 'trendyol.com', 'co.vine.android', 'com.badoo.mobile', 'com.eharmony', 'com.facebook.katana', 'com.foursquare.robin', 'com.google.android.apps.blogger', 'com.hi5.app', 'com.imvu.mobilecordova', 'com.instagram.android', 'com.justunfollow.android', 'com.keek', 'com.linkedin.android', 'com.okcupid.okcupid', 'com.pinterest', 'com.sec.penup', 'com.sina.weibo', 'com.taggedapp', 'com.taptrip', 'com.tumblr', 'com.twitter.android', 'com.wamba.client', 'com.waplog.social', 'com.weheartit', 'jp.ameba', 'jp.mixi', 'mobi.skyrock.Skyrock', 'org.wordpress.android', 'ru.mamba.client', 'ru.mobstudio.andgalaxy', 'ru.ok.android', 'com.afl.ucom.view', 'com.bamnetworks.mobile.android.ballpark', 'com.bamnetworks.mobile.android.gameday.atbat', 'com.bleacherreport.android.teamstream', 'com.cricbuzz.android', 'com.espn.fc', 'com.espn.score_center', 'com.eurosport', 'com.fifa.fifaapp.android', 'com.fivemobile.thescore', 'com.gotv.nflgamecenter.us.lite', 'com.handmark.sportcaster', 'com.hudl.hudroid', 'com.iphonedroid.marca', 'com.july.univision', 'com.livescore', 'com.mgmbk.iddaa', 'com.mobilefootie.wc2010', 'com.myleaderboard.GolfChannel', 'com.netbiscuits.kicker', 'com.nfl.fantasy.core.android', 'com.protrade.sportacular', 'com.supersport.android.phone', 'com.televisa.deportes.android', 'com.tour.pgatour', 'com.visualdesign.livefootballontvlite', 'com.xoopsoft.apps.bundesliga.free', 'de.motain.iliga', 'kr.co.psynet', 'com.careem.acma', 'com.dailyroads.v', 'com.its.rto', 'com.mxdata.tube.Market', 'com.navitime.local.navitime', 'com.thetrainline', 'com.ubercab', 'ru.rzd', 'taxi.android.client', 'com.aa.android', 'com.accor.appli.hybrid', 'com.agoda.mobile.consumer', 'com.airasia.mobile', 'com.airbnb.android', 'com.ba.mobile', 'com.booking', 'com.cheaptickets', 'com.cleartrip.android', 'com.couchsurfing.mobile.android', 'com.delta.mobile.android', 'com.ebookers', 'com.expedia.bookings', 'com.flightaware.android.liveFlightTracker', 'com.gm.decolar', 'com.gm.despegar', 'com.goibibo', 'com.hanatour.dotcom', 'com.hcom.android', 'com.hoteltonight.android.prod', 'com.ixigo', 'com.jetblue.JetBlueAndroid', 'com.joelapenna.foursquared', 'com.justdial.search', 'com.kayak.android', 'com.korail.korail', 'com.makemytrip', 'com.momondo.flightsearch', 'com.orbitz', 'com.pagesjaunes', 'com.priceline.android.negotiator', 'com.ryanair.cheapflights', 'com.southwestairlines.mobile', 'com.traveloka.android', 'com.tripadvisor.tripadvisor', 'com.tripit', 'com.trivago', 'com.urbanspoon', 'com.xe.currency', 'com.yelp.android', 'de.flixbus.app', 'de.is24.android', 'in.redbus.android', 'jp.co.ana.android.tabidachi', 'net.skyscanner.android.main', 'com.accuweather.android', 'com.aws.android', 'com.foreca.android.weather', 'com.gismeteo.client', 'com.ilmeteo.android.ilmeteo', 'com.lachainemeteo.androidapp', 'com.palmarysoft.forecaweather', 'com.studioeleven.windfinder', 'com.supportware.Buienradar', 'com.weather.Weather', 'com.wetter.androidclient', 'de.wetteronline.regenradar', 'de.wetteronline.wetterapp', 'com.google.android.apps.youtube.creator']
# install apps
for package in packages2:
    path = './apps/'

    if (not os.path.isfile(path + package + '.apk')):
        print "Installing %s" % package
        os.system("adb %s shell am start -a android.intent.action.VIEW -d 'market://details?id=%s'" % (DEVICE, package))
        time.sleep(WAIT_TIME)

        coords = findGreenRectangle(screenshot(SCREENSHOT_FILENAME))
        if coords:
            print 'foundit'
            x, y = coords
            os.system("adb %s shell input tap %s %s" % (DEVICE, x, y))
            time.sleep(WAIT_TIME)

            coords = findGreenRectangle(screenshot(SCREENSHOT_FILENAME))
            if coords:
                x, y = coords
                os.system("adb %s shell input tap %s %s" % (DEVICE, x, y))
                time.sleep(WAIT_TIME*2)
                goBackExitEtc()
                time.sleep(INSTALL_WAIT_TIME)
            else:
                goBackExitEtc()
                time.sleep(WAIT_TIME)
                continue
        else:
            print 'did not find it'
            goBackExitEtc()
            time.sleep(WAIT_TIME)
            continue

        # FETCH APK FILE
        os.system("adb %s pull /data/app/%s-1/base.apk ../../apks/%s.apk" % (DEVICE, package, package))
# vincent's original code which didn't work for me: os.system("adb %s pull /data/app/%s-1.apk %s.apk" % (DEVICE, package, path+package))
        os.system("adb %s uninstall %s" % (DEVICE, package))
        os.remove(SCREENSHOT_FILENAME)
