package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path"
)

type Unit struct{}

var unit Unit

type App struct {
	dbId                   int
	id, store, region, ver string
}

func apkPath(app App) string {
	return path.Join(
		cfg.AppDir, app.id, app.store, app.region,
		app.ver, app.id+".apk")
}

func outDir(app App) string {
	return path.Join(cfg.UnpackDir, app.id, app.store, app.region, app.ver)
}

func unpack(app App) error {
	cmd := exec.Command("apktool", "d", apkPath(app), "-o", outDir(app))
	out, err := cmd.CombinedOutput()
	if err != nil {
		return errors.New(fmt.Sprintf("Error '%s' unpacking apk; output below:\n%s",
			err.Error(), string(out)))
	}
	return nil
}

func cleanup(app App) error {
	return os.RemoveAll(outDir(app))
}

func checkDir(dir, name string) {
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

func uniqAppend(a []string, b []string) []string {
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

func combine(a, b map[string]Unit) map[string]Unit {
	ret := a
	for e, _ := range b {
		ret[e] = unit
	}
	return ret
}

func strmap(args ...string) map[string]Unit {
	ret := make(map[string]Unit)
	for _, e := range args {
		ret[e] = unit
	}

	return ret
}
