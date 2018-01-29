familyTypes <- dbGetQuery(con,
                          "SELECT family_genre FROM playstore_apps
                          JOIN app_versions ON playstore_apps.id = app_versions.id                              
                          WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

table(familyTypes$family_genre)
familyTypes %>%
  filter(!is.na(family_genre))
