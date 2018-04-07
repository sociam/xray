library(RPostgreSQL)
library(tidyverse)
#set up data base driver and connection
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

appGenres <- dbGetQuery(con,
                      "SELECT app_versions.id, playstore_apps.genre
                      FROM app_versions
                      JOIN playstore_apps ON playstore_apps.id = app_versions.id
                      WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

#save out a list of the genres and how many apps are in each
appGenres %>%
  group_by(genre) %>%
  summarise(numApps = n()) %>%
  write_csv("other analyses/genres.csv")

groupingAttempt <- read_csv("other analyses/genreGrouping.csv")

groupingAttempt %>%
  group_by(super_genre) %>%
  summarise(apps = sum(numApps)) %>%
  arrange(desc(apps))
