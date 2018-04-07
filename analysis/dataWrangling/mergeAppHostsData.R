library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(jsonlite)
library(purrr)

#open database
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")


########1. CHECK FOR OVERLAP BETWEEN WHAT'S IN TABLES APP_ANALYSES AND APP_HOSTS ###########
#get app ids from app_analyses table and app_hosts table
allApp_Analyses_Ids <- dbGetQuery(con, "SELECT id FROM app_analyses") %>% as.tibble()
allApp_Hosts_Ids <- dbGetQuery(con, "SELECT id FROM app_hosts") %>% as.tibble()

#get the apps in app_analyses that don't have a match in app_hosts
appsNotInBoth <- anti_join(allApp_Analyses_Ids, allApp_Hosts_Ids, by="id")

#turns out that's all of them
nrow(appsNotInBoth) == nrow(allApp_Analyses_Ids)  #TRUE

########2. THEN JOIN THE DATA FROM THE TWO TABLES ###########
##GRAB INFO FROM TABLE APP_HOSTS ##
#get hosts of analyzed apps in long format
appsWithHostsLong_app_hosts <- dbGetQuery(con,
                                          "SELECT app_hosts.id, UNNEST(hosts) AS hosts FROM app_hosts
                                          JOIN app_versions ON app_versions.id = app_hosts.id
                                          WHERE app_versions.analyzed = TRUE") %>%
  as.tibble() %>% #put it in tidyverse's data frame format
  group_by(id) %>%
  distinct(hosts) %>% #remove duplicate hosts within each app
  ungroup()

#get analyzed apps that don't have any hosts
appsWithoutHosts_app_hosts <- dbGetQuery(con,
                                         "SELECT app_hosts.id, app_hosts.hosts FROM app_hosts
                                         JOIN app_versions ON app_versions.id = app_hosts.id
                                         WHERE app_versions.analyzed = TRUE AND app_hosts.hosts = '{}'") %>%
  as.tibble() %>% #put it in tidyverse's data frame format
  mutate(numHosts = 0) #create numHosts variable set to 0


##GRAB INFO FROM TABLE APP_ANALYSES##
#read in info
app_analyses <- dbGetQuery(con,
                           "SELECT app_analyses.id, app_analyses.analysis FROM app_analyses
                           JOIN app_versions ON app_versions.id = app_analyses.id
                           WHERE app_versions.analyzed = TRUE") %>%
  as.tibble() %>%
  mutate(parsedJSON = map(analysis, fromJSON)) %>% #use jsonlite to parse every entry
  mutate(hosts = parsedJSON %>% map("hosts")) #create a variable with just the hosts array

#put the apps with hosts in long format
appsWithHostsLong_app_analyses <- app_analyses %>%
  select(id, hosts) %>%
  filter(!map_lgl(hosts, is.null)) %>% #they all have a list, but the list might be empty
  unnest(hosts)

#get the apps that don't have hosts
appsWithoutHosts_app_analyses <- app_analyses %>%
  select(id, hosts) %>%
  filter(map_lgl(hosts, is.null)) %>% #pick the ones with an empty hosts list
  mutate(numHosts = 0) #create numHosts variable set to 0


##MERGE AND SAVE OUT INFO FROM TABLES APP_HOSTS AND APP_ANALYSES##
#merge the apps with hosts into one data frame
appsWithHostsLong <- rbind(appsWithHostsLong_app_hosts, appsWithHostsLong_app_analyses)
write_csv(appsWithHostsLong, "~/Desktop/data-processed/appsWithHostsLongFormat.csv")

#merge the apps without hosts into one data frame
appsWithoutHosts <- rbind(appsWithoutHosts_app_hosts, appsWithoutHosts_app_analyses) %>%
  select(id, numHosts)
write_csv(appsWithoutHosts, "~/Desktop/data-processed/appsWithoutHosts.csv")