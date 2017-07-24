package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"github.com/sociam/xray/pipeline/analyzer/config"
)

var cfgFile = flag.String("cfg", "/etc/xray/config.json", "config file location")
var daemon = flag.Bool("daemon", false, "run analyzer as a daemon")
var useDb = flag.Bool("db", false, "add app information to the db specified in the config file")
var cfg config.Config

var db *XrayDb

func init() {
	var err error
	flag.Parse()
	cfg = config.Load(*cfgFile)
	db, err = openDb()
	if err != nil {
		log.Fatal("Failed to open a connection to the database %s", err.Error())
	}
}

func analyze(app *App) error {
	var err error

	fmt.Print("Unpacking... ")
	err = unpack(app)
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
		app.perms = manifest.getPerms()
		fmt.Printf("Permissions found: %v\n\n", app.perms)
		if *useDb {
			db.addPerms(app, app.perms)
		}
	}

	fmt.Println("Running simple analysis... ")
	app.hosts, err = simpleAnalyze(app)
	if err != nil {
		return errors.New(fmt.Sprintf("Error getting hosts: %s", err.Error()))
	}
	fmt.Printf("Hosts found: %v\n\n", app.hosts)
	if *useDb {
		err = db.addHosts(app, app.hosts)
		if err != nil {
			return errors.New(fmt.Sprintf("Error writing hosts to DB: %s", err.Error()))
		}
	}

	cleanup(app)

	return nil
}

func main() {
	if *daemon {
		fmt.Println("Starting xray analyzer daemon")
		runServer()
	} else {
		if flag.NArg() == 0 {
			flag.Usage()
			os.Exit(64)
		}

		for _, appPath := range flag.Args() {
			app := AppByPath(appPath)
			fmt.Println("Analyzing apk ", appPath)
			analyze(app)
		}
	}
}
