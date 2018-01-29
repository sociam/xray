library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(jsonlite)
library(scales)

#set up data base driver and connection
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

#get apps
allApp_Hosts_Ids <- dbGetQuery(con,
                                "SELECT id FROM app_hosts ") %>%
  as.tibble()

allApp_Analyses_Ids <- dbGetQuery(con,
                                  "SELECT id FROM app_analyses") %>%
  as.tibble()

#see what's not matching
appsNotInBoth <- anti_join(allApp_Analyses_Ids, allApp_Hosts_Ids, by="id")

appsNotInBoth

allAnalysed_App_Analyses_Ids <- dbGetQuery(con,
                                           "SELECT app_analyses.id FROM app_analyses
                                           JOIN app_versions ON app_versions.id = app_analyses.id
                                WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

allAnalysed_App_Hosts_Ids <- dbGetQuery(con,
                               "SELECT app_hosts.id FROM app_hosts
                               JOIN app_versions ON app_versions.id = app_hosts.id
                                WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

allAnalysed_App_Hosts_Ids
