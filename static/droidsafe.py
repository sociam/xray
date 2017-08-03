from __future__ import print_function

import json
import os
import sys
import shutil
import subprocess
import uuid

with open('config.json', 'r') as f:
    config = json.load(f)
    appsdir = config['appsdir']
    tmpdir = config['tmpdir']

MAKEFILE_TEMPLATE_PATH = '$DROIDSAFE_SRC_HOME/android-apps/Makefile_apk'
with open(os.path.expandvars(MAKEFILE_TEMPLATE_PATH), 'r') as f:
    MAKEFILE_TEMPLATE = f.read()
    assert(MAKEFILE_TEMPLATE != '')

# Run everything below in the tmpdir
os.chdir(tmpdir)

# Check that we can read/write into tmpdir
try:
    randomName = str(uuid.uuid4())
    with open(randomName, 'w') as f:
        f.write(randomName)
    with open(randomName, 'r') as f:
        assert(randomName == f.read())
except IOError as e:
    print('Failed to read/write to tmpdir {}'.format(tmpdir), file=sys.stderr)
    sys.exit(1)

for filename in os.listdir(appsdir):
    apk_filename = os.path.basename(filename)
    [apkname, _] = os.path.splitext(apk_filename)
    shutil.copy(os.path.join(appsdir, filename), apk_filename)
    with open('Makefile', 'w') as f:
        content = MAKEFILE_TEMPLATE.replace('APPNAME', apkname)
        f.write(content)
    subprocess.check_call(['make', 'specdump-apk'])
