package main

import (
	"os/exec"
	"path"
)

type Unit struct{}

var unit Unit

func apkPath(apk, ver string) string {
	return path.Join(cfg.ApkDir, apk)
}

func outDir(apk, ver string) string {
	return path.Join(cfg.UnpackDir, ver+"-"+apk+".apk")
}

func unpack(apk, ver string) {
	cmd := exec.Command("apktool", "d", apkPath(apk, ver), "-o", outDir(apk, ver))
	err := cmd.Run()
	if err != nil {
		//TODO: not this
		panic(err)
	}
}

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
