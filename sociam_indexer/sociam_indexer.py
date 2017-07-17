from lxml import html
import requests
import json

sociam_page = requests.get('http://sociam.org')
tree = html.fromstring(sociam_page.content)

all_link_text = tree.xpath('//a/text()')
all_link_href = list(map(lambda a: a.get('href'), tree.xpath('//a')))

all_link_json = dict(zip(all_link_text, all_link_href))
# link_json['link_text'] = link_text
# link_json['link_href'] = link_href

local_link_json = dict(filter(lambda item: str(item[1]).startswith('/'), all_link_json.iteritems))


json.dump(all_link_json, open('all_link_json.json', 'w'), indent=2)
json.dump(all_link_text, open('all_link_text.json', 'w'), indent=2)
json.dump(all_link_href, open('all_link_href.json', 'w'), indent=2)
json.dump(local_link_json, open('local_link_json.json', 'w'), indent=2)
