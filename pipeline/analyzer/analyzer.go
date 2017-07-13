package main

import (
	"./config"
	"fmt"
	"net"
	"os"
	"strings"
)

var cfg = config.Load()

func main() {
	fmt.Println("Starting xray analyzer daemon")

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

		split := strings.SplitN(s, "-", 2)
		if len(split) < 2 {
			fmt.Printf("failed to parse input \"%s\"\n", s)
		} else {
			apk, ver := split[0], split[1]
			fmt.Printf("Got apk '%s' version '%s'\n", apk, ver)
			unpack(apk, ver)
			simple_analyze(apk, ver)
		}
	}
}
