#!/bin/sh

# specify app packages to test
declare -a packages=("com.restaurant.mobile")
# launch all the apps and do random monkeyrunner activity
for package in "${packages[@]}"
do
	echo "$package"
	monkeyrunner monkey-handler.py "$package"
done

#alternatively, iterate through all apk files in the apk directory

#DIR='../../apks/testbatch/'

#for FILE in "$DIR"*
#do
#	monkeyrunner monkey-handler.py `basename "$FILE"`
#done

