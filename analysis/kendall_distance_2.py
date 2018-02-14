import scipy.stats as stats
import csv
import pandas
import json
from itertools import combinations

allapps = csv.reader((open("saveouts_RESULTS/prevalenceOwnersAndSubsidiaries.csv")), delimiter=',')

genre_titles = ['ArtAndPhotography', 'CommunicationAndSocial','Education','GamesAndEntertainment','HealthAndLifestyle','Music','News','ProductivityAndTools']

ArtAndPhotography = csv.reader((open("saveouts_RESULTS/companies_by_genre/ArtAndPhotography.csv")), delimiter=',')
CommunicationAndSocial = csv.reader((open("saveouts_RESULTS/companies_by_genre/CommunicationAndSocial.csv")), delimiter=',')
Education = csv.reader((open("saveouts_RESULTS/companies_by_genre/Education.csv")), delimiter=',')
GamesAndEntertainment = csv.reader((open("saveouts_RESULTS/companies_by_genre/GamesAndEntertainment.csv")), delimiter=',')
HealthAndLifestyle = csv.reader((open("saveouts_RESULTS/companies_by_genre/HealthAndLifestyle.csv")), delimiter=',')
Music = csv.reader((open("saveouts_RESULTS/companies_by_genre/Music.csv")), delimiter=',')
News = csv.reader((open("saveouts_RESULTS/companies_by_genre/News.csv")), delimiter=',')
ProductivityAndTools = csv.reader((open("saveouts_RESULTS/companies_by_genre/ProductivityAndTools.csv")), delimiter=',')

genre_csvs = {"ArtAndPhotography":ArtAndPhotography, "CommunicationAndSocial":CommunicationAndSocial, "Education":Education, "GamesAndEntertainment":GamesAndEntertainment, "HealthAndLifestyle":HealthAndLifestyle, "Music":Music, "News":News, "ProductivityAndTools":ProductivityAndTools}

# order all apps (different csv format to genres)

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

# aggregate figures by parent

def reshape(genre):
	genre1cos = {}
	for row in genre:
		if row[1] != 'pctOfApps.x':
			company = row[0]
			prev = float(row[1])
			genre1cos[company] = prev
	genre1_rank = {key[0]:1 + value for value, key in enumerate(
	                       sorted(genre1cos.iteritems(),
	                              key=lambda x: x[1],
	                              reverse=True))}
	print genre1_rank
	return genre1_rank
	return genre1cos

genre_ranks = {}

for genre in genre_csvs:
	genre_rank = reshape(genre_csvs[genre])
	genre_ranks[genre] = genre_rank

def kt_dis(genre1, genre2):
	compare = {}

	for co in genre1:
		if co in genre2:
			compare[co] = [genre1[co], genre2[co]]

	for co in genre2:
		if co in genre1:
			compare[co] = [genre2[co], genre1[co]]

	genre1rank = []
	genre2rank = []

	for co in compare:
		genre1rank.append(compare[co][0])
		genre2rank.append(compare[co][1])

	tau, p_value = stats.kendalltau(genre1rank, genre2rank)
	return tau

combos = list(combinations(genre_ranks,2))

# for each genre, what is the distance from the rank of all apps?

distance_all = {}

for key, value in genre_ranks.iteritems():
	distance = kt_dis(allco_rank,value)
	distance_all[key] = distance

# pairwise distances: what is the distance between each pair of genres?

pairwise_distances = {}

for combo in combos:
	combo_name = combo
	distance = kt_dis(genre_ranks[combo[0]], genre_ranks[combo[1]])
	print combo_name, distance
	pairwise_distances[combo_name] = distance

# remoteness: for each genre, what is the total combined distance from every other genre?

remoteness = {}
for genre in genre_titles:
	remoteness[genre] = 0
	for pair in pairwise_distances:
		if ((pair[0] == genre) or (pair[1] == genre)):
			remoteness[genre] = remoteness[genre] + pairwise_distances[pair]
