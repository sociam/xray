package main

import (
	"fmt"
	"github.com/sociam/xray/pipeline/db"
	"github.com/sociam/xray/pipeline/util"
	"log"
	"net/http"
	"strconv"
)

// convenience struct for marshalling errors
type Err struct {
	Code    string `json:"err"`
	Message string `json:"err_msg"`
}

func werr(w http.ResponseWriter, status int, err, msg string, vals ...interface{}) {
	w.WriteHeader(status)
	w.Header().Set("Content-Type", "application/json")
	err1 := util.WriteJSON(w, Err{err, fmt.Sprintf(msg, vals...)})
	if err1 != nil {
		log.Println(err1)
	}
}

func deanerr(w http.ResponseWriter, status int, err, msg string, vals ...interface{}) {
	w.WriteHeader(status)
	w.Header().Set("Content-Type", "application/nahmate")
	w.Write([]byte(err + "\n"))
	err1 := w.Write([]byte("Nah, " + fmt.Sprintf(msg, vals...) + ", mate.\n"))
	if err1 != nil {
		log.Println(err1)
	}
}

func hello(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Got request on " + r.URL.Path)
	switch r.Header.Get("Accept") {
	case "application/nahmate":
		deanerr(w, http.StatusNotFound, "not_found", "Nah mate!")
	case "application/json":
		fallthrough
	case "":
		werr(w, http.StatusNotFound, "not_found", "Nah mate!")
	default:
		http.Error(http.StatusNotFound, "Nah mate!")
	}
}

func notImpl(w http.ResponseWriter, r *http.Request) {
}

func appEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		if r.Header.Get("Accept") == "application/nahmate" {
			deanerr(w, http.StatusNotImplemented, "m8", "Nah mate.")
			return
		} else if r.Header.Get("Accept") != "application/json" && r.Header.Get("Accept") != "" {
			werr(w, http.StatusNotAcceptable, "not_acceptable", "This API only supports JSON at the moment.")
		}

		//apps, err := db.GetAllAppInfo()
	} else {
		werr(w, http.StatusBadRequest, "bad_method", "You must POST this endpoint!")
	}
}

func appVerEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		if r.Header.Get("Accept") == "application/nahmate" {
			deanerr(w, http.StatusNotImplemented, "m8", "Nah mate.")
			return
		} else if r.Header.Get("Accept") != "application/json" && r.Header.Get("Accept") != "" {
			werr(w, http.StatusNotAcceptable, "not_acceptable", "This API only supports JSON at the moment.")
		}

	}
}

func appsEndpoint(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		if r.Header.Get("Accept") == "application/nahmate" {
			deanerr(w, http.StatusNotImplemented, "m8", "Nah mate.")
			return
		} else if r.Header.Get("Accept") != "application/json" && r.Header.Get("Accept") != "" {
			werr(w, http.StatusNotAcceptable, "not_acceptable", "This API only supports JSON at the moment.")
		}

		err := r.ParseForm()
		if err != nil {
			werr(w, http.StatusBadRequest, "bad_form", "Error parsing form input: %s", err.Error())
		}

		num, start := 10, 0
		if v, ok := r.Form["num"]; ok && len(v) > 0 {
			if len(v) > 1 {
				werr(w, http.StatusBadRequest, "bad_form", "num must have a single value")
				return
			}
			num, err = strconv.Atoi(v[0])
			if err != nil {
				werr(w, http.StatusBadRequest, "bad_form", "num value must be a number")
				return
			}
			if num < 1 || num > 100 {
				werr(w, http.StatusBadRequest, "bad_form", "num value must be between 1 and 100")
			}
		}

		if v, ok := r.Form["start"]; ok && len(v) > 0 {
			if len(v) > 1 {
				werr(w, http.StatusBadRequest, "bad_form", "start must have a single value")
			}
			start, err = strconv.Atoi(v[0])
			if err != nil {
				werr(w, http.StatusBadRequest, "bad_form", "start value must be a number")
				return
			}
			if start < 0 {
				werr(w, http.StatusBadRequest, "bad_form", "start value must positive")
			}
		}

		apps, err := db.GetApps(num, start)
		if err != nil {
			fmt.Println("Error querying database: ", err.Error())
			werr(w, http.StatusInternalServerError, "db_err", "Error querying db")
		}

		util.WriteJSON(w, apps)
	} else {
		werr(w, http.StatusBadRequest, "bad_method", "You must POST this endpoint!")
	}
}

func main() {
	http.HandleFunc("/", hello)
	http.HandleFunc("/api/app", appEndpoint)
	http.HandleFunc("/api/apps", appsEndpoint)
	panic(http.ListenAndServe(":8080", nil))
}
