"""
Passing a appid to download and then downlaod the app at a stagered rate.abs

"""

try: 
    from gplaycli import gplaycli
except ImportError:
    raise ImportError('No gplaycli found, check is avalaible on path')

import sys


# print 'Number of arguments:', len(sys.argv), 'arguments.'
# print 'Argument List:', str(sys.argv)


from enum import IntEnum
class ERRORS(IntEnum):
    OK = 0
    TOKEN_DISPENSER_AUTH_ERROR = 5
    TOKEN_DISPENSER_SERVER_ERROR = 6
    KEYRING_NOT_INSTALLED = 10
    CANNOT_LOGIN_GPLAY = 15

import argparse

import json

#tmp logger
def logging(gpc, message):
     print(message)

def checkCredentials():
    pass

def downloadApp():
    pass


def main():
    parser = argparse.ArgumentParser(description="A wrapper for google play store downloader to stagger the downloading process")
    parser.add_argument('-d', '--download', action='store', dest='packages_to_download', metavar="AppID", nargs="+",
                         type=str, help="Download the Apps that map given AppIDs")
    parser.add_argument('-c', '--config', action='store', dest='config', metavar="CONF_FILE", nargs=1,
                        type=str, default=None, help="Use a different config file than gplaycli.conf")  
    parser.add_argument('-y', '--yes', action='store_true', dest='yes_to_all', help='Say yes to all prompted questions')
    parser.add_argument('-l', '--list', action='store', dest='list', metavar="FOLDER",
                        type=str, help="List APKS in the given folder, with details")
    parser.add_argument('-s', '--search', action='store', dest='search_string', metavar="SEARCH",
                        type=str, help="Search the given string in Google Play Store")
    parser.add_argument('-n', '--number', action='store', dest='number_results', metavar="NUMBER",
                        type=str, help="For the search option, returns the given number of matching applications")
    parser.add_argument('-F', '--file', action='store', dest='load_from_file', metavar="FILE",
                        type=str, help="Load packages to download from file, one package per line")
    parser.add_argument('-u', '--update', action='store', dest='update_folder', metavar="FOLDER",
                        type=str, help="Update all APKs in a given folder")
    parser.add_argument('-f', '--folder', action='store', dest='dest_folder', metavar="FOLDER", nargs=1,
                        type=str, default=".", help="Where to put the downloaded Apks, only for -d command")
    parser.add_argument('-t', '--token', action='store_true', dest='token', default=False, help='Instead of classical credentials, use the tokenize version')
    parser.add_argument('-tu', '--token-url', action='store', dest='token_url', metavar="TOKEN_URL",
                        type=str, default="DEFAULT_URL", help="Use the given tokendispenser URL to retrieve a token")
    parser.add_argument('-v', '--verbose', action='store_true', dest='verbose', help='Be verbose')
    parser.add_argument('-p', '--progress', action='store_true', dest='progress_bar',
                        help='Prompt a progress bar while downloading packages')
    parser.add_argument('-L', '--log', action='store_true', dest='enable_logging', default=False,
                        help='Enable logging of apps status. Downloaded, failed, not available apps will be written in separate logging files')
    parser.add_argument('-ic', '--install-cronjob', action='store_true', dest='install_cronjob',
                        help='Interactively install cronjob for regular APKs update')

    if len(sys.argv) < 2:
        sys.argv.append("-h") #show help- as things were missing

    args = parser.parse_args()
    print("testing")
    cli = gplaycli.GPlaycli(args, args.config)
    logging("Using the following log file", cli.config)    

    success = False
    while (not success) and (cli.retries != 0):
        success, error = cli.connect_to_googleplay_api()
        if not success:
            cli.retries -= 1
            logging(cli, "Cannot login to GooglePlay ( %s ), remaining tries %s" % (error, cli.retries))
        if cli.retries == 0:
            sys.exit(ERRORS.CANNOT_LOGIN_GPLAY)

    if args.list:
        print cli.list_folder_apks(args.list)

    if args.update_folder:
        cli.prepare_analyse_apks()

    if args.search_string:
        cli.verbose = True
        nb_results = 10
        if args.number_results:
            nb_results = args.number_results
        cli.search(list(), args.search_string, nb_results)

    if args.load_from_file:
        args.packages_to_download = load_from_file(args.load_from_file)

    if args.packages_to_download is not None:
        if args.dest_folder is not None:
            cli.set_download_folder(args.dest_folder[0])
    cli.download_packages(args.packages_to_download)


if __name__ == "__main__":
    main()
