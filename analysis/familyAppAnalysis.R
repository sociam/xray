familyApps <- dbGetQuery(con,
                          "SELECT app_versions.id, playstore_apps.title, playstore_apps.genre, app_versions.version FROM app_versions
                          JOIN playstore_apps ON playstore_apps.id = app_versions.id                              
                          WHERE app_versions.analyzed = TRUE and playstore_apps.family_genre is not Null") %>%
  as.tibble()

table(familyTypes$family_genre)
familyTypes %>%
  filter(!is.na(family_genre))


#####1 SUMMARY STATS
#-----1.1: ALL HOSTS
#group by id and count number of hosts
countAllFamilyHosts <- appsWithHostsAndCompaniesLong %>%
  right_join(familyApps, by = "id") %>%
  group_by(id) %>%
  summarise(numFamilyHosts = n()) %>%
  arrange(desc(numFamilyHosts)) %>%
  left_join(familyApps, by = "id") %>%
  write_csv("saveouts_RESULTS/FamilyHosts.csv")  
  
#take a look at references in the top scoring app
appsWithHostsAndCompaniesLong %>%
  filter(id == 802020) %>%
  View()


#summarise numbers of all hosts
summaryAllHosts <- countAllFamilyHosts %>%
  summarise(numApps = n(),
            meanTrackers = round(mean(numFamilyHosts),1),
            median = median(numFamilyHosts),
            mode = modeFunc(numFamilyHosts),
            min = min(numFamilyHosts),
            max = max(numFamilyHosts),
            SD = round(sd(numFamilyHosts),2),
            numMoreThan20 = sum(numFamilyHosts > 20),
            pctMoreThan20 = round((numMoreThan20 / numApps) * 100,2),
            noRefs = sum(numFamilyHosts == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan20, -noRefs)
write_csv(summaryAllHosts, "saveouts_RESULTS/summaryFamilyHosts.csv")


#------MAKE CHARTS
#plot ordinary histogram
countAllFamilyHosts %>%
  ggplot() +
  geom_histogram(aes(numFamilyHosts)) +
  labs(x = "#hosts in decompiled source code", y = "app count") +
  scale_y_continuous(labels = comma)
ggsave("plots/histFamilyHosts.png",width=5, height=4, dpi=600)


#log transformed y-axis
countAllFamilyHosts %>%
  ggplot() +
  geom_histogram(aes(numFamilyHosts)) +
  labs(x = "#hosts in decompiled source code",
       y = "app count: LOG SCALE") +
  scale_y_log10()
ggsave("plots/histFamilyHostsLOGY.png",width=5, height=4, dpi=600)


familyHostsInfo <- appsWithHostsAndCompaniesLong %>%
  right_join(familyApps, by = "id") %>%
  group_by(hosts) %>%
  summarise(refFamilyCount = n()) %>%
  arrange(desc(refFamilyCount)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company")


#save out the top 500
head(familyHostsInfo, 500) %>%
  write_csv("saveouts_RESULTS/top500FamilyHosts.csv")


#count again, but exclude unknowns
countKnownFamilyTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "unknown") %>%
  right_join(familyApps, by = "id") %>%
  group_by(id) %>%
  summarise(numFamilyHosts = n()) %>%
  arrange(desc(numFamilyHosts))%>%
  left_join(familyApps, by = "id") %>%
  write_csv("saveouts_RESULTS/knownFamilyTrackers.csv") 

summaryFamilyKnownTrackers <- countKnownFamilyTrackers %>%
  left_join(allAnalysedAppsInfo, by = "id") %>%
  summarise(numApps = n(),
            meanTrackers = round(mean(numFamilyHosts),1),
            median = median(numFamilyHosts),
            mode = modeFunc(numFamilyHosts),
            min = min(numFamilyHosts),
            max = max(numFamilyHosts),
            SD = round(sd(numFamilyHosts),2),
            numMoreThan20 = sum(numFamilyHosts > 20),
            pctMoreThan20 = round((numMoreThan20 / numApps) * 100,2),
            noRefs = sum(numFamilyHosts == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan20, -noRefs) %>%
  arrange(desc(median))

write_csv(summaryFamilyKnownTrackers, "saveouts_RESULTS/summaryKnownFamilyTrackers.csv")

appsWithHostsAndCompaniesLong %>%
  filter(id == 629603) %>%
  distinct(company)%>%
  View()
