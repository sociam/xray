package main

import (
	"fmt"
	"github.com/sociam/xray/pipeline/util"
	"net"
	"os"
	"path"
	"strconv"
	"strings"
)

func runServer() {
	util.CheckDir(cfg.UnpackDir, "Unpacked APK directory")
	util.CheckDir(path.Dir(cfg.SockPath), "Socket directory")

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
			app := util.NewApp(id, split[1], split[2], split[3], split[4])
			fmt.Printf("Got app %v\n", app)
			analyze(app)
		}
	}
}
