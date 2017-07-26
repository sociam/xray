package main

import (
	"encoding/json"
	"encoding/xml"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
)

type StaticAnalyzer struct{}

type Permission struct {
	Id        string `xml:"name,attr"`
	maxSdkVer string `xml:"maxSdkVersion,attr"`
}

type AndroidManifest struct {
	Package    string       `xml:"package,attr"`
	Perms      []Permission `xml:"uses-permission"`
	Sdk23Perms []Permission `xml:"uses-permission-sdk-23"`
}

func parseManifest(app *App) (*AndroidManifest, error) {
	manifest := AndroidManifest{}
	manifestFile, err := os.Open(path.Join(app.outDir(), "AndroidManifest.xml"))
	if err != nil {
		return nil, err
	}
	bytes, err := ioutil.ReadAll(manifestFile)
	if err != nil {
		return nil, err
	}
	err = xml.Unmarshal(bytes, &manifest)
	if err != nil {
		return nil, err
	}

	if manifest.Package != "" {
		app.id = manifest.Package
	}
	return &manifest, nil
}

func (manifest *AndroidManifest) getPerms() []Permission {
	return append(manifest.Perms, manifest.Sdk23Perms...)
}

type Company struct {
	Id           string   `json:"id"`
	Name         string   `json:"company"`
	Domains      []string `json:"domains"`
	Founded      string   `json:"founded"`
	Acquired     string   `json:"acquired in"`
	CType        string   `json:"type"`
	TypeTag      string   `json:"typetag"`
	Jurisdiction string   `json:"jurisdiction_code"`
	Parent       string   `json:"parent"`
	Capital      string   `json:"capital"`
	Equity       string   `json:"equity"`
	Size         string   `json:"size"`
	DataSource   string   `json:"data source"`
	Description  string   `json:"description"`
}

func simpleAnalyze(app *App) ([]string, error) {
	//TODO: fix error handling

	//TODO: replace with DB calls
	var companies map[string]Company
	companyFile, err := os.Open(path.Join(cfg.DataDir, "company_details.json"))
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

	cmd := exec.Command("grep", "-Earho", "\"https?://[^ >]+\"", app.outDir())
	urls, err := cmd.Output()
	if err != nil {
		return []string{}, err
	}

	appTrackers := make([]string, 0)

	irrelevant := []string{"app", "identity", "n/a", "other", "", "library"}
	for name, company := range companies {
		for _, domain := range company.Domains {
			if strings.Contains(string(urls), string(domain)) {
				toAppend := true
				for _, cat := range irrelevant {
					if companies[name].TypeTag == cat {
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

func findPackages(app *App) ([]string, error) {
	// TODO: fix error handling
	paths := make(map[string]Unit)
	err := os.Chdir(path.Join(app.outDir(), "smali"))
	if err != nil {
		return []string{}, err
	}

	err = filepath.Walk(".",
		func(fname string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			if path.Ext(fname) == ".smali" {
				paths[path.Dir(fname)] = unit
			}

			return nil
		})

	pkgs := make([]string, 0, 20)
	for path, _ := range paths {
		//pkg := strings.Replace(path, string(os.PathSeparator), ".", -1)
		pkg := strings.Map(func(ch rune) rune {
			if ch == os.PathSeparator {
				return '.'
			} else {
				return ch
			}
		}, path)
		pkgs = append(pkgs, pkg)
	}

	return pkgs, err
}
