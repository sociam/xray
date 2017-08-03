from __future__ import print_function
import os
import json
import time
import sys
import logging
import random
import glob

import delegator
from features import extract

PORT = '8888'

with open('config.json', 'r') as f:
    config = json.load(f)
    appsdir = config['appsdir']
    outdir = config['outdir']

logger = logging.getLogger("")
logger.setLevel(logging.DEBUG)
logger.addHandler(logging.FileHandler('log/monkey.log'))
logger.addHandler(logging.StreamHandler(sys.stdout))

premasterKeyPath = os.path.join(outdir, 'premaster.txt')
os.environ['SSLKEYLOGFILE'] = premasterKeyPath


def startProxy(mitm=True):
    if mitm:
        mitmFlag = ''
    else:
        mitmFlag = r'--ignore \\.+'
    return delegator.run('mitmdump -p {port} {flag}'.format(port=PORT, flag=mitmFlag), block=False)


def startWireshark(path):
    return delegator.run('tshark -i ens160 -f "port 80 or port 443" -w %s' % path, block=False)


def startMonkey(apkName, deleteApp=True):
    if deleteApp:
        deleteFlag = ''
    else:
        deleteFlag = '--no-delete'
    process = delegator.run(
        'monkeyrunner monkey-handler.py {apk} {flag}'.format(apk=apkName, flag=deleteFlag))
    logger.info(process.out)
    logger.error(process.err)


def fixDuplicatedJsonFile(fp):
    # http.request.line and http.response.line are used as keys several times
    # for different values. json.loads will only give us the last value.
    # We need to handle them seperately.
    HEADERS = ['http.request.line', 'http.response.line']

    def list_hook(pairs):
        result = {}
        for name, value in pairs:
            if name in HEADERS:
                result.setdefault(name, []).append(value)
            else:
                result[name] = value
        return result
    data = json.load(fp, object_pairs_hook=list_hook)
    fp.seek(0)
    json.dump(data, fp)
    fp.truncate()


def pcapToJson(pcapPath, jsonPath):
    process = delegator.run('tshark -T json -r {path} -o "ssl.keylog_file:{keyPath}" > {jsonPath}'.format(
        path=pcapPath, keyPath=premasterKeyPath, jsonPath=jsonPath))
    logger.info(process.out)
    logger.error(process.err)
    # Fix duplicate keys in the outputted JSON
    with open(jsonPath, 'r+') as f:
        fixDuplicatedJsonFile(f)


filenames = glob.iglob(os.path.join(appsdir, '*.apk'))
for filename in filenames:
    baseFilename = os.path.basename(filename)
    [apkName, _] = os.path.splitext(baseFilename)
    timestamp = str(time.time()).replace('.', '')

    logger.info('Starting mitmproxy')
    mitmProcess = startProxy()

    # Push the app manually as there is a problem with pushing inside monkeyrunner
    logger.info('Pushing app {apk} to device'.format(apk=apkName))
    apk_path = delegator.run(
        'adb shell "pm path {apk}"'.format(apk=apkName)).out
    if not apk_path.startswith('package:'):
        installProcess = delegator.run('adb install {apk}'.format(
            apk=os.path.join(appsdir, baseFilename)))
        logger.info(installProcess.out)
        logger.error(installProcess.err)

    logger.info('Starting Wireshark')
    mitmPcapPath = os.path.join(
        outdir, apkName + '-mitm-' + timestamp + '.pcap')
    wiresharkProcess = startWireshark(mitmPcapPath)

    # Don't delete the app for running the second time
    logger.info('Running monkey on {apk}'.format(apk=apkName))
    startMonkey(apkName, deleteApp=False)

    wiresharkProcess.kill()
    logger.info('Ended Wireshark')

    mitmProcess.kill()
    logger.info('Ended mitmproxy')

    mitmJsonPath = os.path.splitext(mitmPcapPath)[0] + '.json'
    logger.info('Converting MITM pcap to json')
    pcapToJson(mitmPcapPath, mitmJsonPath)

    # Capture packets w/ MITM
    pcapPath = os.path.join(outdir, apkName + '-' + timestamp + '.pcap')
    logger.info('Starting passthrough proxy')
    proxyProcess = startProxy(mitm=False)

    logger.info('Starting Wireshark')
    wiresharkProcess = startWireshark(pcapPath)

    logger.info('Running monkey on {apk}'.format(apk=apkName))
    startMonkey(apkName)

    wiresharkProcess.kill()
    logger.info('Ended Wireshark')

    proxyProcess.kill()
    logger.info('Ended mitmproxy')

    jsonPath = os.path.splitext(pcapPath)[0] + '.json'
    logger.info('Converting non-MITM pcap to json')
    pcapToJson(pcapPath, jsonPath)

    featureFilename = os.path.join(
        outdir, apkName + '-features-' + timestamp + '.json')
    with open(jsonPath, 'r') as jsonFile, open(mitmJsonPath, 'r') as jsonMitmFile, open(featureFilename, 'w') as featureFile:
        streams = [json.load(jsonFile), json.load(jsonMitmFile)]
        json.dump(extract(streams), featureFile)
