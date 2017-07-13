package config

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"path"
)

type Config struct {
	ApkDir    string `json:"apkdir"`
	UnpackDir string `json:"unpackdir"`
	SockPath  string `json:"sockpath"`
}

var UnpackDir string

var cfgFile = flag.String("cfg", "./config.json", "config file location")

func Load() Config {
	flag.Parse()
	file, err := os.Open(*cfgFile)
	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		panic("Couldn't read config file " + *cfgFile)
	}
	var cfg Config
	err = json.Unmarshal(bytes, &cfg)
	if err != nil {
		panic("Error reading JSON: " + err.Error())
	}

	if cfg.ApkDir == "" {
		cfg.ApkDir = "./apks"
	}
	if cfg.UnpackDir == "" {
		cfg.UnpackDir = "."
	}
	if cfg.SockPath == "" {
		cfg.SockPath = "/run/apkScraper"
	}

	cfg.ApkDir = path.Clean(cfg.ApkDir)
	cfg.UnpackDir = path.Clean(cfg.UnpackDir)
	cfg.SockPath = path.Clean(cfg.SockPath)

	fmt.Println("Config:")
	fmt.Println("\tAPK directory:", cfg.ApkDir)
	fmt.Println("\tUnpacked APK directory:", cfg.UnpackDir)
	fmt.Println("\tMessage socket path:", cfg.SockPath)

	return cfg
}
