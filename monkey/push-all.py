from __future__ import print_function
import sys
import os
import delegator

with open('config.json', 'r') as f:
    config = json.load(f)
    appsdir = config['appsdir']

for filename in os.listdir(appsdir):
    apkFilename = os.path.basename(filename)
    [apkname, ext] = os.path.splitext(apkFilename)
    if ext == '.apk':
        apk_path = delegator.run('adb shell "pm path {apk}"'.format(apk=apkname)).out
        if not apk_path.startswith('package:'):
            print('Pushing', apkname)
            installProcess = delegator.run('adb install {apk}'.format(apk=os.path.join(appsdir, apkFilename)))
            print(installProcess.out)
            print(installProcess.err, file=sys.stderr)
