package util

import (
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path"
)

type Unit struct{}

var unit Unit

type App struct {
	DbId                   int
	Id, Store, Region, Ver string
	Path, UnpackDir        string
	Perms                  []Permission
	Hosts                  []string
	Packages               []string
}

type Permission struct {
	Id        string `xml:"name,attr"`
	MaxSdkVer string `xml:"maxSdkVersion,attr"`
}

func NewApp(dbId int, id, store, region, ver string) *App {
	return &App{DbId: dbId, Id: id, Store: store, Region: region, Ver: ver}
}

func AppByPath(path string) *App {
	return &App{Path: path}
}

func (app *App) ApkPath() string {
	if app.Path != "" {
		return app.Path
	} else {
		return path.Join(
			Cfg.AppDir, app.Id, app.Store, app.Region,
			app.Ver, app.Id+".apk")
	}
}

func (app *App) OutDir() string {
	if app.UnpackDir == "" {
		if app.Path != "" {
			var err error
			app.UnpackDir, err = ioutil.TempDir(Cfg.UnpackDir, path.Base(app.Path))
			if err != nil {
				// maybe do something else?
				log.Fatal("Failed to create temp dir in ", Cfg.UnpackDir, ": ", err)
			}
		} else {
			app.UnpackDir = path.Join(Cfg.UnpackDir, app.Id, app.Store, app.Region, app.Ver)
		}
	}
	return app.UnpackDir
}

func (app *App) Unpack() error {
	cmd := exec.Command("apktool", "d", app.ApkPath(), "-o", app.OutDir(), "-f")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return errors.New(fmt.Sprintf("Error '%s' unpacking apk; output below:\n%s",
			err.Error(), string(out)))
	}
	return nil
}

func (app *App) Cleanup() error {
	return os.RemoveAll(app.OutDir())
}

func CheckDir(dir, name string) {
	fif, err := os.Stat(dir)
	if err != nil {
		if os.IsNotExist(err) {
			err = os.MkdirAll(dir, 0644)
			if err != nil {
				//TODO: something else
				panic(fmt.Sprintf("Couldn't create %s: %s", name, err.Error()))
			}
		} else {
			//TODO: something else
			panic(err)
		}
	} else if !fif.IsDir() {
		panic(fmt.Sprintf("%s isn't a directory!", name))
	}
}

func UniqAppend(a []string, b []string) []string {
	ret := make([]string, 0, len(a)+len(b))
	for _, e := range a {
		ret = append(ret, e)
	}
	// set ret = a

	for _, be := range b {
		add := true
		for _, ae := range a {
			if ae == be {
				add = false
				break
			}
		}
		if add {
			ret = append(ret, be)
		}
	}
	return ret
}

/*
func uniqAppend(a []interface{}, b []interface{}) []interface{} {
	eMap = map[interface{}]Unit
	for _, e := range a {
		eMap[e] := unit
	}
	for _, e := range b {
		eMap[e] := unit
	}

	ret := make([]interface{}, 0, len(eMap))
	for e, _ := range eMap {
		ret := append(ret, e)
	}
	return ret
}
*/

func Combine(a, b map[string]Unit) map[string]Unit {
	ret := a
	for e, _ := range b {
		ret[e] = unit
	}
	return ret
}

func StrMap(args ...string) map[string]Unit {
	ret := make(map[string]Unit)
	for _, e := range args {
		ret[e] = unit
	}

	return ret
}
