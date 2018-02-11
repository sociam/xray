appInfo <- dbGetQuery(con,
                      "SELECT app_versions.id, playstore_apps.title, playstore_apps.genre, playstore_apps.family_genre, app_versions.version 
                      FROM app_versions
                      JOIN playstore_apps ON playstore_apps.id = app_versions.id                              
                      WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

#apps with hosts in long format
appsWithHostsAndCompaniesLong <- read_csv("~/Desktop/data-processed/appsWithHostsAndCompanyLong.csv") %>%
  mutate(company = str_to_title(company))
#apps with no hosts
appsWithNoHosts <- read_csv("~/Desktop/data-processed/appsWithoutHosts.csv")

#combine the two
allAppsWithHostsAndGenre <- appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(appInfo, by = "id")

#####1 SUMMARY STATS
#-----1.1: NUMBER OF REFERENCES TO TRACKER DOMAINS-----
#count number of numbers of host references in apps that refer to companies on our list of trackers
hostCountsInAppsWithKnownTrackersFamily <- allAppsWithHostsAndGenre %>%
  filter(!is.na(family_genre)) %>%
  filter(company != "Unknown") %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  arrange(desc(numHosts))

#get apps that had hosts references but weren't on our list of trackers - set these to 0 host refs
appsWithHostsButNoKnownTrackers <- allAppsWithHostsAndGenre %>%
  filter(!is.na(family_genre)) %>%
  distinct(id) %>%
  anti_join(hostCountsInAppsWithKnownTrackersFamily, by = "id") %>%
  mutate(numHosts = 0)

#then add non-included apps to count properly
countKnownTrackersFamily <- hostCountsInAppsWithKnownTrackersFamily %>%
  rbind(appsWithHostsButNoKnownTrackers) #add the apps with no hosts that are known trackers

#summarise the numbers of known trackers
summaryKnownTrackersFamily <- countKnownTrackersFamily %>%
  summarise(numApps = n(),
            median = median(numHosts),
            Q1 = quantile(numHosts, .25),
            Q3 = quantile(numHosts, .75),
            IQR = IQR(numHosts),
            min = min(numHosts),
            max = max(numHosts),
            mode = modeFunc(numHosts),
            mean = round(mean(numHosts),1),
            SD = round(sd(numHosts),2),
            numMoreThan20 = sum(numHosts > 20),
            pctMoreThan20 = round((numMoreThan20 / numApps) * 100,2),
            noRefs = sum(numHosts == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan20, -noRefs)

write_csv(summaryKnownTrackersFamily, "saveoutputs_family_RESULTS/summaryKnownFamilyTrackers.csv")  
