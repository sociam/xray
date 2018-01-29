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

#read in new apps
app_analyses <- dbGetQuery(con,
                                "SELECT app_analyses.id, app_analyses.analysis FROM app_analyses
                                JOIN app_versions ON app_versions.id = app_analyses.id
                                WHERE app_versions.analyzed = TRUE") %>%
  as.tibble() %>%
  mutate(parsedJSON = map(analysis, fromJSON)) %>% #use jsonlite to parse every entry
  mutate(hosts = parsedJSON %>% map("hosts"))

#create app_host table for the new apps
apps_and_hosts_to_add <- app_analyses %>%
  select(id, hosts) %>%
  filter(!map_lgl(hosts, is.null)) %>% #they all have a list, but the list might be empty
  unnest(hosts) %>%
  right_join(select(app_analyses, id)) #add back in the 1,9990 that didn't have hosts

apps_and_hosts_to_add %>% #they are just NA's if they ain't got no hosts
  filter(id == 1248403)
