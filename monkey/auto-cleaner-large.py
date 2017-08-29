import re
import csv

WIRESHARK_NAME = 'wireshark.csv'
NETWORKLOG_NAME = 'networklog.csv'

temp = []
regex = ur"[a-zA-Z0-9._]+\+complete\+cdtdphil"

###################

f = open(WIRESHARK_NAME, 'r')
f.readline() # don't do anything with the file header

for line in f:
    temp.append(line)
    result = re.findall(regex, line)
    if (result):
        package = result[0][:result[0].find('+')]
        print 'Found marker for package ' + package
        g = open(package + '.csv', 'w')
        for outputline in temp:
            g.write(outputline)
        print 'Done writing raw file.'
        #print '---'
        g.close()
        temp = []

        #####
        
        addresses = []
        
        h = open(NETWORKLOG_NAME, 'r')
        print 'Loading NetworkLog CSV...'
        h.readline()

        for loggerline in h:
            loggerline = loggerline.replace('"', '')
            row = loggerline.split(',')
            #quit()
            if (row[2] == package):
                if (row[8] not in addresses):
                    newaddress = row[8]
                    if (newaddress[0:7] != '192.168'):
                        addresses.append(row[8])

        print 'Total unique IP addresses: ' + str(len(addresses))

        #####

        print 'Reading raw file...'
        g = open(package + '.csv', 'r')
        csvdata = csv.reader(g)
        print 'Done reading raw file.'

        wiresharkframes = []

        for row in csvdata:
            wiresharkframes.append(row)


        relevant = []
        for row in wiresharkframes[1:]:
            if (row[2] in addresses or row[3] in addresses):
                relevant.append(row)

        #####

        b = open(package + '-auto.csv', 'wb')
        a = csv.writer(b)

        a.writerows(relevant)
        b.close()
        print 'Done writing clean file.'
        print '---'
        #####
