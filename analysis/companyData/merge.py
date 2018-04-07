import csv, json
import tldextract

# get our co csv
company_pdpl = csv.reader(open('company_data_2018.csv'))
co_pdpl = []
for co in company_pdpl:
	co_pdpl.append(co)
co_pdpl.pop(0)

# get tim's json
company_tl = open('domain_owners.json')
company_tl = json.load(company_tl)

# create new lists


# tldextract our domains, make new entries to add to timl's list

def cleanDoms(doms):
	cleandoms = []
	for dom in doms:
		domain = tldextract.extract(dom).domain
		suffix = tldextract.extract(dom).suffix
		cleandom = domain + '.' + suffix
		cleandoms.append(cleandom)
	return cleandoms

def mergeDoms(co):
	doms1 = []
	doms2 = []
	for co1 in co_pdpl:
		if co == co1[1]:
			domains = co1[4].split()
			doms1 = domains
	for co2 in company_tl:
		if co == co2['owner_name']:
			doms2 = co2['domains']
	doms1 = cleanDoms(doms1)
	doms2 = cleanDoms(doms2)
	print doms1
	print doms2
	doms = []
	for dom in doms1:
		doms.append(dom)
	for dom in doms2:
		doms.append(dom)
	doms = list(set(doms))
	return doms

def getID():
	lastID = idcounter
	newID = idcounter +1
	return newID

def getTLParent(parent_id):
	for co in company_tl:
		if co['id'] == parent_id:
			return co['owner_name']

def getParent(co):
	tl_parent = None
	pdpl_parent = None
	for tlco in company_tl:
		if tlco['owner_name'] == co:
			tl_parent = getTLParent(tlco['parent_id'])
	for pdplco in co_pdpl:
		if co == pdplco[1]:
			pdpl_parent = pdplco[11]
	if (tl_parent == None) and (pdpl_parent == (None or '')):
		print 'Orphan'
		return None
	if (tl_parent != None) and (pdpl_parent == (None or '')):
		print 'parent in tl'
		return tl_parent
	if (tl_parent == None) and (pdpl_parent != (None or '')):
		print 'parent in pdpl'
		return pdpl_parent
	if ((tl_parent != None) and (pdpl_parent != (None or '')) and (tl_parent != pdpl_parent)):
		print 'CONFLICT'
		conflictingparents.append([tl_parent, pdpl_parent])
		return tl_parent

def getTLDoms(co):
	for co in company_tl:
		if tlco['owner_name'] == co:
			return tlco['domains']

def getPDPLDoms(co):
	for co2 in co_pdpl:
		if co == co2[1]:
			return co2[4]

conflictingparents = []

superdict = {}

allcos = []

for co in company_tl:
	allcos.append(co['owner_name'])

for co in co_pdpl:
	allcos.append(co[1])

allcos = list(set(allcos))

idcounter = 0

for co in allcos:
	info = {}
	info['owner_name'] = co
	info['parent'] = getParent(co)
	info['doms'] = mergeDoms(co)
	superdict[co] = info
# 	country = getCountry(co)
# 	aliases = getAliases(co)
# 	priv = getPriv(co)
# 	homepage_url = getHome(co)
# 	root_parent = getRootParent(co)
# 	superdict[co] = info

def getNewParent(co):
	if superdict.has_key(co):
		if (superdict[co].has_key('parent') and (superdict[co]['parent'] is not None)):
			return superdict[co]['parent']
	else:
		return None

def getRootParent(co):
	branch = co
	while getNewParent(branch) is not None:
		branch = getNewParent(branch)
	return branch

def getCountry_pdpl(co):
	for co2 in co_pdpl:
		if co2[1] == co:
			return co2[10]
			print co2[10]

for co in superdict:
	superdict[co]['root_parent'] = getRootParent(co)

for co in superdict:
	for co2 in company_tl:
		if co2['owner_name'] == superdict[co]['owner_name']:
			superdict[co]['country'] = co2['country']
			superdict[co]['aliases'] = co2['aliases']
			superdict[co]['homepage_url'] = co2['homepage_url']
			superdict[co]['privacy_policy_url'] = co2['privacy_policy_url']
			superdict[co]['notes'] = co2['notes']
		else:
			superdict[co]['country'] = getCountry_pdpl(co)
			superdict[co]['aliases'] = None
			superdict[co]['homepage_url'] = None
			superdict[co]['privacy_policy_url'] = None
			superdict[co]['notes'] = None


list_version = []

for co in superdict:
	list_version.append(superdict[co])

# with open('company_data_12_2_2018.json', 'w') as fp:
# 	json.dump(superdict, fp)

with open('company_data_list_23_2_2018.json', 'w') as fp:
	json.dump(list_version, fp)