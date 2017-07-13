package main

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"os/exec"
	"strings"
)

type Company struct {
	ch               string
	id               string
	companyOld       string `json:"company-old"`
	name             string `json:"company"`
	domains          []string
	founded          string
	acquired         string `json:"acquired in"`
	c_type           string `json:"type"`
	typetag          string
	jurisdiction     string
	jurisdictionCode string `json:"jurisdiction_code"`
	parent           string
	capital          string
	equity           string
	size             string
	dataSource       string `json:"data source"`
	description      string
}

func simple_analyze(apk, ver string) ([]string, error) {
	//TODO: fix error handling

	//TODO: replace with DB calls
	var companies map[string]Company
	companyFile, err := os.Open("/var/xray/company_details.json")
	if err != nil {
		return []string{}, err
	}
	bytes, err := ioutil.ReadAll(companyFile)
	if err != nil {
		return []string{}, err
	}
	err = json.Unmarshal(bytes, &companies)
	if err != nil {
		return []string{}, err
	}

	for name, _ := range companies {
		if _, ok := trackers[name]; !ok {
			delete(companies, name)
		}
	}

	// getDomainCo := func(host string) *string {
	// 	for _, company := range companies {
	// 		for _, domain := range company.domains {
	// 			if strings.Contains(host, domain) {
	// 				return &company.id
	// 			}
	// 		}
	// 	}
	// 	return nil
	// }

	cmd := exec.Command("grep", "-Er", "\"https?://[^ >]+\"", outDir(apk, ver))
	err = cmd.Run()
	if err != nil {
		return []string{}, err
	}

	urls, err := cmd.Output()
	if err != nil {
		return []string{}, err
	}

	appTrackers := make([]string, 0)

	irrelevant := []string{"app", "identity", "n/a", "other", "", "library"}
	for name, company := range companies {
		for _, domain := range company.domains {
			if strings.Contains(string(domain), string(urls)) {
				toAppend := true
				for _, cat := range irrelevant {
					if companies[name].typetag == cat {
						toAppend = false
						break
					}
				}
				if toAppend {
					appTrackers = append(appTrackers, name)
				}
			}
		}
	}

	return appTrackers, nil
}
