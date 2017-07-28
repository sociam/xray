package main

import (
	"errors"
	"flag"
	"fmt"
	"github.com/sociam/xray/pipeline/db"
	"github.com/sociam/xray/pipeline/util"
	"log"
	"os"
)

var cfgFile = flag.String("cfg", "/etc/xray/config.json", "config file location")
var daemon = flag.Bool("daemon", false, "run analyzer as a daemon")
var useDb = flag.Bool("db", false, "add app information to the db specified in the config file")
var cfg util.Config

func init() {
	var err error
	flag.Parse()
	util.LoadCfg(*cfgFile)
	err = db.Open(cfg)
	if err != nil {
		log.Fatal("Failed to open a connection to the database %s", err.Error())
	}
}

func analyze(app *util.App) error {
	var err error

	// if app.store == "cli" {
	// 	app.dbId, err = db.insertApp(app)
	// 	if err != nil {
	// 		fmt.Printf("Error getting database id of app %s: %s", app.id, err.Error())
	// 	}
	// }

	fmt.Print("Unpacking... ")
	err = app.Unpack()
	if err != nil {
		fmt.Println()
		fmt.Println(err.Error())
		return errors.New(fmt.Sprintf("Error unpacking apk: %s", err.Error()))
	}
	fmt.Println("done.")

	fmt.Println("Getting permissions...")
	manifest, err := parseManifest(app)
	if err != nil {
		fmt.Println("Error parsing manifest: ", err.Error())
	} else {
		app.Perms = manifest.getPerms()
		fmt.Printf("Permissions found: %v\n\n", app.Perms)
		db.AddPerms(app, app.Perms)
		if err != nil {
			fmt.Printf("Error writing permissions to DB: %s\n", err.Error())
		}
	}

	fmt.Println("Running simple analysis... ")
	app.Hosts, err = simpleAnalyze(app)
	if err != nil {
		fmt.Printf("Error getting hosts: %s\n", err.Error())
	}
	fmt.Printf("Hosts found: %v\n\n", app.Hosts)
	err = db.AddHosts(app, app.Hosts)
	if err != nil {
		fmt.Printf("Error writing hosts to DB: %s\n", err.Error())
	}

	app.Packages, err = findPackages(app)
	if err != nil {
		fmt.Println("Error finding packages: ", err.Error())
	}
	fmt.Println("Packages found: ", app.Packages)

	app.Cleanup()

	return nil
}

func main() {
	if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
		panic(err)
	}
	if err := os.MkdirAll(cfg.AppDir, 0755); err != nil {
		panic(err)
	}
	if err := os.MkdirAll(cfg.UnpackDir, 0755); err != nil {
		panic(err)
	}

	if *daemon {
		fmt.Println("Starting xray analyzer daemon")
		runServer()
	} else {
		if flag.NArg() == 0 {
			flag.Usage()
			os.Exit(64)
		}

		for _, appPath := range flag.Args() {
			app := util.AppByPath(appPath)
			app.Store = "cli"
			fmt.Println("Analyzing apk ", appPath)
			analyze(app)
		}
	}
}
