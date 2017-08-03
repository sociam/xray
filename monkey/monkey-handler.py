import sys
import os
import optparse  # monkeyrunner does not support argparse
from com.android.monkeyrunner import MonkeyRunner, MonkeyDevice

parser = optparse.OptionParser()
parser.add_option('-n', help='number of launches', type=int, default=1)
parser.add_option('-b', '--base', help='directory of applications',
                  default='/home/xray/android-5k-apps/')
parser.add_option(
    '--no-delete', help='do not delete the app after running', action='store_true')
(options, args) = parser.parse_args()

package = args[0]
NUMBER_OF_LAUNCHES = options.n
WAIT_TIME_BETWEEN_LAUNCHES = 4

BASE = options.base

print "CONNECTING to device."
device = MonkeyRunner.waitForConnection()

apk_path = device.shell('pm path ' + package)
if apk_path.startswith('package:'):
    print "Package %s is already installed." % package
else:
    print "Package %s is NOT installed, installing now." % package
    if device.installPackage(os.path.join(BASE, package + '.apk')):
        print "Package %s successfully installed." % package
    else:
        print "Package %s failed to install!" % package
        sys.exit(1)

for i in range(NUMBER_OF_LAUNCHES):

    # ensure airplane mode is off. sometimes the monkey turns it on and fucks our data collection up :)
    device.shell('settings put global airplane_mode_on 0')
    device.shell(
        'am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false')
    # turn on status bar blocker (to stop monkey from opening the status bar)
    device.shell(
        'am broadcast -a org.thisisafactory.simiasque.SET_OVERLAY --ez enable true')

    print "Iteration number %s of %s" % ((i + 1), NUMBER_OF_LAUNCHES)
    print "    Launching package %s" % package

    device.shell(
        'monkey -p %s -c android.intent.category.LAUNCHER 1' % package)
    MonkeyRunner.sleep(4)
    print "    Running app with Monkey events..."
    # this is approximately 1 minute per run -> monkey --pct-syskeys 0 --pct-majornav 0 --pct-nav 0 --pct-trackball 0 --pct-motion 0 --pct-anyevent 0 --pct-appswitch 20 --throttle 500 -vv -p %s 240
    device.shell('monkey --pct-syskeys 0 --pct-majornav 0 --pct-nav 0 --pct-trackball 0 --pct-motion 0 --pct-anyevent 0 --pct-appswitch 20 --throttle 500 -vv -p %s 240 -s 0' % package)

    print "    Terminating process %s" % package
    device.press('KEYCODE_HOME', MonkeyDevice.DOWN_AND_UP)
    device.shell('am force-stop %s' % package)

    if i != NUMBER_OF_LAUNCHES - 1:  # no need to wait between launches if it's the last iteration
        print "    Waiting for %s seconds..." % WAIT_TIME_BETWEEN_LAUNCHES
        MonkeyRunner.sleep(WAIT_TIME_BETWEEN_LAUNCHES)

# Uninstall app to save space
if not options.no_delete:
    device.removePackage(package)
    print "Package successfully uninstalled."

print "Done!"
