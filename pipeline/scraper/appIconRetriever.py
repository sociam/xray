from lxml import html
from os import mkdir, path
import requests
import json

# TODO: Scrape_links to only return a dict.
#       then each local url can be scraped
def scrape_links(page_name, page_url):
    dir_name = 'json_dumps/' + page_name + '_links/'
    if not path.exists('json_dumps'):
        mkdir('json_dumps')
    if not path.exists(dir_name):
        mkdir(dir_name)

    page = requests.get(page_url)
    tree = html.fromstring(page.content)

    all_link_text = tree.xpath('//img[@class="cover-image"]/@src')

    file_path_prefix = dir_name + page_name
    dump_page_json(file_path_prefix + '_all_link_text', all_link_text)


def dump_page_json(file_name, json_data):
    """ Opens a file and dumps json """
    json.dump(json_data, open(file_name + '.json', 'w'), indent=2)


def main():
    """ Main process flow """

    test_url = 'https://play.google.com/store/apps/details?id=com.whatsapp'
    test_name = 'whatsapp'

    scrape_links(test_name, test_url)

if __name__ == '__main__':
    main()