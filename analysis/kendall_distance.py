import scipy.stats as stats
import csv
import pandas
import json

allapps = csv.reader((open("saveouts_RESULTS/prevalenceOwnersAndSubsidiaries.csv")), delimiter=',')

genres = ['ArtAndPhotography', 'CommunicationAndSocial','Education','GamesAndEntertainment','HealthAndLifestyle','Music','News','ProductivityAndTools']

# ArtAndPhotography = csv.reader((open("saveouts_RESULTS/companies_by_genre/ArtAndPhotography.csv")), delimiter=',')
# CommunicationAndSocial = csv.reader((open("saveouts_RESULTS/companies_by_genre/CommunicationAndSocial.csv")), delimiter=',')
# Education = csv.reader((open("saveouts_RESULTS/companies_by_genre/Education.csv")), delimiter=',')
# GamesAndEntertainment = csv.reader((open("saveouts_RESULTS/companies_by_genre/GamesAndEntertainment.csv")), delimiter=',')
# HealthAndLifestyle = csv.reader((open("saveouts_RESULTS/companies_by_genre/HealthAndLifestyle.csv")), delimiter=',')
# Music = csv.reader((open("saveouts_RESULTS/companies_by_genre/Music.csv")), delimiter=',')
# News = csv.reader((open("saveouts_RESULTS/companies_by_genre/News.csv")), delimiter=',')
# ProductivityAndTools = csv.reader((open("saveouts_RESULTS/companies_by_genre/ProductivityAndTools.csv")), delimiter=',')

# get ranking for all apps

allcos = {}

allapps.next()

for row in allapps:
	company = row[2]
	prev = row[1]
	allcos[company] = prev

allco_rank = {key[0]:1 + value for value, key in enumerate(
                       sorted(allcos.iteritems(),
                              key=lambda x: x[1],
                              reverse=True))}

# function to compare any genre rank distribution to the total

def kt_dis(genre):
	genrecos = {}

	genre.next()
	for row in genre:
		company = row[2]
		prev = row[1]
		genrecos[company] = prev

	genre_rank = {key[0]:1 + value for value, key in enumerate(
	                       sorted(genrecos.iteritems(),
	                              key=lambda x: x[1],
	                              reverse=True))}

	compare = {}

	for co in allcos:
		if co in genre:
			compare[co] = [allco_rank[co], genre_rank[co]]

	for co in genrecos:
		if co in allcos:
			compare[co] = [allco_rank[co], genre_rank[co]]

	allrank = []
	genrerank = []

	for co in compare:
		allrank.append(compare[co][0])
		genrerank.append(compare[co][1])

	tau, p_value = stats.kendalltau(allrank, genrerank)
	return tau

genre_distances = {}

for genre in genres:
	genre_csv = csv.reader((open("saveouts_RESULTS/companies_by_genre/%s.csv" % genre)), delimiter=',')
	dis = kt_dis(genre_csv)
	genre_distances[genre] = dis

# with open('genre_rank_diffs_12_2_2018.json', 'w') as fp:
# 	json.dump(genre_distances, fp)

with open('genre_diffs.csv','wb') as f:
    w = csv.writer(f)
    w.writerows(genre_distances.items())