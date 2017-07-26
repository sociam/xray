package main

import (
	"flag"
	"fmt"
	"github.com/sociam/xray/pipeline/analyzer/config"
)

var cfgFile = flag.String("cfg", "/etc/xray/config.json", "config file location")
var cfg config.Config

func init() {
	flag.Parse()
	cfg = config.Load(*cfgFile)
}

func main() {
	fmt.Println("Starting xray analyzer daemon")
	runServer()
}
