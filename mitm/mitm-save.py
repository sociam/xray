#!/usr/bin/env python
#
# Simple script showing how to read a mitmproxy dump file
# execute as follows:
# mitmdump -s mitm-save.py -p 8081
#
# procedure for collecting data:
# 0. install mitmproxy ca as a root ca on device
# 1. terminate all running apps on device
# 2. set http proxy to <this mitm host>:8081
# 3. edit mitm-save-config.json for appropriate app types
# 4. run mitmdump -s mitm-save.py -p 8081
# 5. launch target app on device
# 6. do stuff on device for awhile, then terminate proxy then terminate app

from __future__ import print_function

from mitmproxy import flow
from mitmproxy.models import HTTPResponse
from netlib.http import Headers
import csv
import json
import time
import os
import sys
import urllib
import random
import uuid

CONFIG_FILENAME = 'mitm-config.json'
with open(CONFIG_FILENAME) as f:
    config = json.load(f)
    destdir = config['destdir']
    app = config['app']
    company = config['company'] or ''
    device = config['device']
    platform = config['platform']
    version = config['version']
    researcher = config['researcher']

runid = str(uuid.uuid4())
OUTFILE = os.path.join(
    destdir, '-'.join([app, platform, version, runid]) + '.csv')

print("logging", app, platform, version, "to", OUTFILE)


def openfile():
    newFile = not os.path.isfile(OUTFILE)
    f = open(OUTFILE, 'a')
    writer = csv.writer(f)
    if newFile:
        writer.writerow(['app', 'company', 'version', 'device', 'platform',
                         'researcher', 'time', 'runid', 'host', 'url', 'method', 'headers', 'body'])
    return f, writer


def request(context, flow):
    # pretty_host takes the "Host" header of the request into account,
    # which is useful in transparent mode where we usually only have the IP
    # otherwise.

    # Method 1: Answer with a locally generated response
    # print " host ", flow.request.pretty_host, flow.request.url, flow.request.headers

    f, writer = openfile()
    writer.writerow([app, company, version, device, platform, researcher, int(time.time() * 1000), runid, flow.request.pretty_host,
                     urllib.quote(flow.request.url), flow.request.method, urllib.quote(json.dumps(dict(flow.request.headers))), urllib.quote(flow.request.body)])
    f.close()
