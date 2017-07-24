package main

import (
	"database/sql"
	"github.com/lib/pq"

	"fmt"
)

type XrayDb struct {
	*sql.DB
}

func openDb() (*XrayDb, error) {
	db, err := sql.Open("postgres",
		fmt.Sprintf("dbname='%s' user='%s' password='%s' host='%s' port='%s'",
			cfg.Db.Database, cfg.Db.User, cfg.Db.Password, cfg.Db.Host, cfg.Db.Port,
		))
	if err != nil {
		return nil, err
	}
	return &XrayDb{db}, nil
}

func (db *XrayDb) addPerms(app *App, pPerms []Permission) error {
	perms := make([]string, 0, len(pPerms))
	for _, perm := range pPerms {
		perms = append(perms, perm.Id)
	}
	var dbPerms []string
	err := db.QueryRow("SELECT perms FROM app_perms WHERE id = $1", app.dbId).
		Scan(pq.Array(&dbPerms))
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		_, err := db.Query("INSERT INTO app_perms VALUES ($1, $2)",
			app.dbId, pq.Array(&perms))
		if err != nil {
			return err
		}
	} else {
		bothPerms := uniqAppend(perms, dbPerms)
		_, err := db.Query("UPDATE app_perms SET perms = $1 WHERE id = $2",
			pq.Array(&bothPerms), app.dbId)
		if err != nil {
			return err
		}
	}

	return nil
}

func (db *XrayDb) addHosts(app *App, hosts []string) error {
	var dbHosts []string
	err := db.QueryRow("SELECT hosts FROM app_hosts WHERE id = $1", app.dbId).
		Scan(pq.Array(&dbHosts))
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		_, err := db.Query("INSERT INTO app_hosts VALUES ($1, $2)",
			app.dbId, pq.Array(&hosts))
		if err != nil {
			return err
		}
	} else {
		bothHosts := uniqAppend(hosts, dbHosts)
		_, err := db.Query("UPDATE app_host SET hosts = $1 WHERE id = $2",
			pq.Array(&bothHosts), app.dbId)
		if err != nil {
			return err
		}
	}

	return nil
}
