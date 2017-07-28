package db

import (
	"database/sql"
	"github.com/lib/pq"
	"github.com/sociam/xray/pipeline/util"

	"fmt"
)

type xrayDb struct {
	*sql.DB
}

var useDb bool
var db xrayDb

func Open(cfg util.Config) error {
	sqlDb, err := sql.Open("postgres",
		fmt.Sprintf("dbname='%s' user='%s' password='%s' host='%s' port='%d' sslmode='disable'",
			cfg.Db.Database, cfg.Db.User, cfg.Db.Password, cfg.Db.Host, cfg.Db.Port,
		))
	if err != nil {
		return err
	}
	db = xrayDb{sqlDb}
	return nil
}

// func (db *XrayDb) insertApp(app *App) (int, error) {
// 	if !useDb {
// 		return 0, nil
// 	}

// 	var ret int
// 	err := db.QueryRow(
// 		"SELECT id FROM app_versions WHERE app = $1 AND store = $2 AND region = $3 AND version = $4",
// 		app.id, app.store, app.region, app.ver).Scan(&ret)
// 	if err != nil {
// 		return 0, err
// 	}

// 	return ret, nil
// }

func AddPerms(app *util.App, perms []util.Permission) error {
	if !useDb || app.DbId == 0 {
		return nil
	}

	sPerms := make([]string, 0, len(perms))
	for _, perm := range perms {
		sPerms = append(sPerms, perm.Id)
	}

	var dbPerms []string
	err := db.QueryRow("SELECT perms FROM app_perms WHERE id = $1", app.DbId).
		Scan(pq.Array(&dbPerms))
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		_, err := db.Query("INSERT INTO app_perms VALUES ($1, $2)",
			app.DbId, pq.Array(&sPerms))
		if err != nil {
			return err
		}
	} else {
		bothPerms := util.UniqAppend(sPerms, dbPerms)
		_, err := db.Query("UPDATE app_perms SET perms = $1 WHERE id = $2",
			pq.Array(&bothPerms), app.DbId)
		if err != nil {
			return err
		}
	}

	return nil
}

func AddHosts(app *util.App, hosts []string) error {
	if !useDb || app.DbId == 0 {
		return nil
	}

	var dbHosts []string
	err := db.QueryRow("SELECT hosts FROM app_hosts WHERE id = $1", app.DbId).
		Scan(pq.Array(&dbHosts))
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
		_, err := db.Query("INSERT INTO app_hosts VALUES ($1, $2)",
			app.DbId, pq.Array(&hosts))
		if err != nil {
			return err
		}
	} else {
		bothHosts := util.UniqAppend(hosts, dbHosts)
		_, err := db.Query("UPDATE app_host SET hosts = $1 WHERE id = $2",
			pq.Array(&bothHosts), app.DbId)
		if err != nil {
			return err
		}
	}

	return nil
}
