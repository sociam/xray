package config

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path"
)

type DbCfg struct {
	Database string `json:"database"`
	User     string `json:"-"`
	Password string `json:"-"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
}

type DbCreds struct {
	User     string `json:"user"`
	Password string `json:"password"`
}

type AnalyzerCfg struct {
	Db DbCreds `json:"db"`
}

type Config struct {
	DataDir   string      `json:"datadir"`
	AppDir    string      `json:"-"`
	UnpackDir string      `json:"unpackdir"`
	SockPath  string      `json:"sockpath"`
	Analyzer  AnalyzerCfg `json:"analyzer"`
	Db        DbCfg       `json:"db"`
}

var UnpackDir string

func Load(cfgFile string) Config {
	file, err := os.Open(cfgFile)
	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		panic("Couldn't read config file " + cfgFile)
	}
	var cfg Config
	err = json.Unmarshal(bytes, &cfg)
	if err != nil {
		panic("Error reading JSON: " + err.Error())
	}

	if cfg.DataDir == "" {
		cfg.DataDir = "/usr/local/var/xray"
	}
	cfg.AppDir = path.Join(cfg.DataDir, "apps")
	if cfg.UnpackDir == "" {
		cfg.UnpackDir = "/tmp/unpacked_apks"
	}
	if cfg.SockPath == "" {
		cfg.SockPath = "/var/run/apkScraper"
	}

	cfg.AppDir = path.Clean(cfg.AppDir)
	cfg.UnpackDir = path.Clean(cfg.UnpackDir)
	cfg.SockPath = path.Clean(cfg.SockPath)

	cfg.Db.User = cfg.Analyzer.Db.User
	cfg.Db.Password = cfg.Analyzer.Db.Password

	fmt.Println("Config:")
	fmt.Println("\tApp directory:", cfg.AppDir)
	fmt.Println("\tUnpacked app directory:", cfg.UnpackDir)
	fmt.Println("\tMessage socket path:", cfg.SockPath)

	fmt.Println("%v", cfg)
	return cfg
}
