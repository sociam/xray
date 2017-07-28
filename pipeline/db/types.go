package db

type App struct {
	Id   string `json:"id"`
	Vers []int  `json:"vers"`
}

type AppVersion struct {
	Id          int    `json:"id"`
	App         string `json:"app"`
	Store       string `json:"string"`
	Region      string `json:"region"`
	Ver         string `json:"ver"`
	ScreenFlags int    `json:"screenFlags"`
}

type Developer struct {
	Id        int      `json:"id"`
	Emails    []string `json:"emails"`
	Name      string   `json:"name"`
	StoreSite string   `json:"storeSite"`
	Site      string   `json:"site"`
}
