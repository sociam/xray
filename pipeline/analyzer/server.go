package main

import (
	"fmt"
	"net"
	"os"
	"path"
	"strconv"
	"strings"
)

func runServer() {
	checkDir(cfg.UnpackDir, "Unpacked APK directory")
	checkDir(path.Dir(cfg.SockPath), "Socket directory")

	_ = os.Remove(cfg.SockPath) // probably catch errors here?

	apkSockAddr, err := net.ResolveUnixAddr("unixgram", cfg.SockPath)
	if err != nil {
		//TODO: not this
		panic(err)
	}
	apkSock, err := net.ListenUnixgram("unixgram", apkSockAddr)
	if err != nil {
		//TODO: not this
		panic(err)
	}
	defer apkSock.Close()

	db, err := openDb()
	if err != nil {
		panic(err)
	}
	defer db.Close()

	for {
		b := make([]byte, 1024)
		n, err := apkSock.Read(b)
		if err != nil {
			//TODO: not this
			panic(err)
		}
		s := string(b[:n])

		if s == "" {
			// maybe do something else
			os.Exit(0)
		}

		split := strings.SplitN(s, "-", 5)
		if len(split) < 5 {
			fmt.Printf("failed to parse input \"%s\"\n", s)
		} else {
			id, err := strconv.Atoi(split[0])
			if err != nil {
				fmt.Printf("Given app database id %s isn't a number!\n", split[0])
				continue
			}
			app := App{id, split[1], split[2], split[3], split[4]}
			fmt.Printf("Got app %v\n", app)
			fmt.Print("Unpacking... ")
			err = unpack(app)
			if err != nil {
				fmt.Println()
				fmt.Println(err.Error())
				continue
			}
			fmt.Println("done.")

			fmt.Println("Getting permissions...")
			manifest, err := parseManifest(app)
			if err != nil {
				fmt.Println("Error parsing manifest: ", err.Error())
			} else {
				perms := manifest.getPerms()
				fmt.Printf("Permissions found: %v\n\n", perms)
				db.addPerms(app, perms)
			}

			fmt.Println("Running simple analysis... ")
			out, err := simpleAnalyze(app)
			if err != nil {
				fmt.Println(err.Error())
				continue
			}
			fmt.Printf("Hosts found: %v\n\n", out)
			err = db.addHosts(app, out)

			cleanup(app)
		}
	}
}
