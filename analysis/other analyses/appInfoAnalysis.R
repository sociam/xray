library(RPostgreSQL)
library(tidyverse)

drv <- dbDriver("PostgreSQL")

con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

dbExistsTable(con, "apps")



appInfo <- dbGetQuery(con,
                      "SELECT apps.id, apps.versions, app_versions.downloaded, app_versions.analyzed, app_versions.uses_reflect, playstore_apps.free, playstore_apps.genre,playstore_apps.min_installs, playstore_apps.max_installs, playstore_apps.crawl_date
                      FROM apps
                      JOIN app_versions ON apps.id = app_versions.app
                      JOIN playstore_apps ON app_versions.id = playstore_apps.id
                      LIMIT 100000") %>% 
  as.tibble() #there's 1,407,887 rows in full data set

#how many scraped apps are free vs paid
appInfo %>%
  group_by(free) %>%
  summarise(count = n())

#check if we've downloaded any paid apps
appInfo %>%
  group_by(free, downloaded) %>%
  summarise(count = n())
#these are apps we've downloaded that are paid:
appInfo %>%
  filter(free == FALSE & downloaded == TRUE) %>%
  select(id)

#check how many are free by genre
appInfo %>%
  group_by(genre, free) %>%
  summarise(count = n()) %>%
  mutate(pct_free = round(count / sum(count),2)*100) %>%
  filter(free == TRUE) %>%
  select(genre, pct_free) %>%
  ggplot() +
    geom_bar(mapping = aes(x = reorder(genre, pct_free), y = pct_free), stat = "identity") + coord_flip()
