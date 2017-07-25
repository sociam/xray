"""
Bare bones systemd logging functions
"""

EMERG = 0,
ALERT = 1,
CRIT = 2,
ERR = 3,
WARNING = 4,
NOTICE = 5,
INFO = 6,
DEBUG = 7

prefixes = ['<0>', '<1>', '<2>', '<3>', '<4>', '<5>', '<6>', '<7>']

def emerg(arguments):
    print(prefixes[EMERG], arguments)

def alert(arguments):
    print(prefixes[ALERT], arguments)

def crit(arguments):
    print(prefixes[CRIT], arguments)

def err(arguments):
    print(prefixes[ERR], arguments)

def warning(arguments):
    print(prefixes[WARN], arguments)

def info(arguments):
    print(prefixes[INFO], arguments)

def debug(arguments):
    print(prefixes[DEBUG], arguments)

def notice(arguments):
    print(prefixes[NOTICE], arguments)