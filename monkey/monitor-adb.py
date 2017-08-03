from __future__ import print_function
import sys
import os
import delegator
import time

while True:
    c = delegator.run('adb get-state 1>/dev/null 2>&1')
    if c.return_code != 0:
        sys.exit(1)
    time.sleep(10 * 60)
