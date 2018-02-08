import scipy.stats as stats
import csv
import pandas


allcos = {}

allapps = csv.reader((open("analysis/prevalenceOwnersAndSubsidiaries.csv")), delimiter=',')

allapps.next()
for row in allapps:
	company = row[2]
	prev = row[1]
	allcos[company] = prev

allco_rank = {key[0]:1 + value for value, key in enumerate(
                       sorted(allcos.iteritems(),
                              key=lambda x: x[1],
                              reverse=True))}

artcos = {}

art = csv.reader((open("analysis/prevalenceCompaniesArtAndPhoto.csv")), delimiter=',')

art.next()
for row in art:
	company = row[2]
	prev = row[1]
	artcos[company] = prev

artco_rank = {key[0]:1 + value for value, key in enumerate(
                       sorted(artcos.iteritems(),
                              key=lambda x: x[1],
                              reverse=True))}

compare = {}

for co in allcos:
	if co in artcos:
		compare[co] = [allco_rank[co], artco_rank[co]]

for co in artcos:
	if co in allcos:
		compare[co] = [allco_rank[co], artco_rank[co]]

allrank = []
artrank = []

for co in compare:
	allrank.append(compare[co][0])
	artrank.append(compare[co][1])

tau, p_value = stats.kendalltau(allrank, artrank)
print tau
print p_value