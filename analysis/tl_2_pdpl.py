import csv, json
import tldextract

# get tl json
company_tl = open('tl_xray_04_04_2018.json')
company_tl = json.load(company_tl)

pdpl_Format = []

def getCo(id):
	for co in company_tl:
		if co['id'] == id:
			return co

def getRootParent(co):
	branch = getCo(co)
	while branch['parent_id'] is not None:
		branch = getCo(branch['parent_id'])
	if branch['id'] == co:
		return None
	else:
		return branch

newFormat = []

for co in company_tl:
	info = {}
	info['owner_name'] = co['owner_name']
	parent = getCo(co['parent_id'])
	if parent is not None:
		info['parent'] = getCo(co['parent_id'])['owner_name']
	else:
		info['parent'] = None
	root_parent = getRootParent(co['id'])
	if root_parent is not None:
		info['root_parent'] = root_parent['owner_name']
	else:
		info['root_parent'] = None
	info['country'] = co['country']
	if info['country'] is not None:
		info['country'] = info['country'].lower()
	info['doms'] = co['domains']
	newFormat.append(info)

with open('company_data_list_6_4_2018.json', 'w') as fp:
	json.dump(newFormat, fp)
