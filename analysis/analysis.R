library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(jsonlite)
library(scales)

options(scipen=10) #make plots more readable by increasing the number of values before scientific notation is used

#set up data base driver and connection
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

#calculate modal value
modeFunc <- function(x) {
  ux <- unique(x)
  ux[which.max(tabulate(match(x, ux)))]
}

#get the ids of all analyzed apps
allAnalysedAppIds <- dbGetQuery(con,
                                "SELECT app_hosts.id FROM app_hosts
                                JOIN app_versions ON app_versions.id = app_hosts.id
                                WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

#get all of the analyzed apps and their hosts in long format
appsWithHostsLong <- dbGetQuery(con,
                          "SELECT app_hosts.id, UNNEST(hosts) AS hosts, playstore_apps.title, playstore_apps.genre, app_versions.version FROM app_hosts
JOIN playstore_apps ON playstore_apps.id = app_hosts.id
                          JOIN app_versions ON app_versions.id = app_hosts.id
                          WHERE app_versions.analyzed = TRUE") %>%
  as.tibble() %>% #put it in tidyverse's data frame format
  group_by(id) %>%
  distinct(hosts) %>% #remove duplicate hosts within each app
  ungroup()

#get all of the apps that don't have hosts
appsWithoutHosts <- dbGetQuery(con,
                                "SELECT app_hosts.id, app_hosts.hosts, playstore_apps.title, playstore_apps.genre, app_versions.version 
FROM app_hosts
                                JOIN playstore_apps ON playstore_apps.id = app_hosts.id
                                JOIN app_versions ON app_versions.id = app_hosts.id
                                WHERE app_versions.analyzed = TRUE AND app_hosts.hosts = '{}'") %>%
  as.tibble() %>% #put it in tidyverse's data frame format
  mutate(numHosts = 0) #give it a numHosts variable we set to 0

idAndNumHostsOfAppsWithoutHosts <- appsWithoutHosts %>%
  select(id, numHosts)


#####1 SUMMARY STATS
#-----1.1: ALL HOSTS
#group by id and count number of hosts
countAllHosts <- appsWithHostsLong %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  rbind(idAndNumHostsOfAppsWithoutHosts) %>%
  arrange(desc(numHosts))

  #take a look at references in the top scoring app
appsWithHostsLong %>%
  filter(id == 762343) %>%
  View()

#summarise numbers of all hosts
summaryAllHosts <- countAllHosts %>%
  summarise(numApps = n(),
            meanTrackers = round(mean(numHosts),1),
            median = median(numHosts),
            mode = modeFunc(numHosts),
            min = min(numHosts),
            max = max(numHosts),
            SD = round(sd(numHosts),2),
            numMoreThan20 = sum(numHosts > 20),
            pctMoreThan20 = round((numMoreThan20 / numApps) * 100,2),
            noRefs = sum(numHosts == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan20, -noRefs)
write_csv(summaryAllHosts, "saveouts_RESULTS/summaryAllHosts.csv")

#------MAKE CHARTS
#plot ordinary histogram
countAllHosts %>%
  ggplot() +
  geom_histogram(aes(numHosts)) +
  labs(x = "#hosts in decompiled source code", y = "app count") +
  scale_y_continuous(labels = comma)
ggsave("plots/histAllHosts.png",width=5, height=4, dpi=600)

#log transformed y-axis
countAllHosts %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) +
  labs(x = "#hosts in decompiled source code",
       y = "app count: LOG SCALE") +
  scale_y_log10()
ggsave("plots/histAllHostsLOGY.png",width=5, height=4, dpi=600)

#log transformed x-axis
countAllHosts %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) + #adding 1 here to avoid excluding the ones with zero trackers
  labs(x = "#hosts in decompiled source code: LOG SCALE", y = "app count") +
  scale_x_log10()
ggsave("plots/histAllHostsLOGX.png",width=5, height=4, dpi=600)

#log transformed both axes
countAllHosts %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) +
  labs(x = "#hosts in decompiled source code: LOG SCALE",
       y = "app count: LOG SCALE") +
  scale_y_log10() + scale_x_log10()
ggsave("plots/histAllHostsLOGBOTH.png",width=5, height=4, dpi=600)


#------ MAKE SUMMARY OF MOST FREQUENT HOSTS
#we need join company, type, and jurisdiction info
  #read in mapping from hosts to companies from the database
hostsToCompany <- dbGetQuery(con,
                             "SELECT hosts, company, type FROM host_domain_companies") %>%
  as.tibble()

  #read in jurisdiction info
companyInfo <- fromJSON("data-raw/company_details.json")
getJurisdiction <- function(company) {
  return(companyInfo[[company]]$jurisdiction)
}
companyJurisdiction <- tibble(company = names(companyInfo),
                              jurisdiction = map(names(companyInfo), getJurisdiction))

#create summary of hosts
allHostsInfo <- appsWithHostsLong %>%
  group_by(hosts) %>%
  summarise(refCount = n()) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyJurisdiction, by = "company") %>%
  mutate(jurisdiction = as.character(jurisdiction)) %>%
  arrange(desc(refCount))

#TODO: MAKE THIS WITH COMPANIES

#-----1.2: SUMMARY OF HOSTS THAT ARE KNOWN TRACKERS
#add company info to the long form hosts data frame
appsWithHostsLong <- appsWithHostsLong %>%
  left_join(hostsToCompany, by = "hosts")

#count again, but exclude unknowns
countKnownTrackers <- appsWithHostsLong %>%
  filter(company != "unknown") %>%
  filter(type == "advertising" | type == "analytics") %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  arrange(desc(numHosts))

#count how many we've dropped - set these to 0 host refs
appsWithHostsButNoKnownTrackers <- anti_join(appsWithHostsIDs, countKnownTrackers, by="id") %>%
  mutate(numHosts = 0)

#then add non-included apps to count properly
countKnownTrackers <- countKnownTrackers %>%
  rbind(subsetToAdd) %>% #add the apps with no host refs at all
  rbind(appsWithHostsButNoKnownTrackers) #add the apps with no hosts that are known trackers

#summarise the numbers of known trackers
summaryKnownTrackers <- countKnownTrackers %>%
  summarise(numApps = n(),
            meanTrackers = round(mean(numHosts),1),
            median = median(numHosts),
            mode = modeFunc(numHosts),
            min = min(numHosts),
            max = max(numHosts),
            SD = round(sd(numHosts),2),
            numMoreThan20 = sum(numHosts > 20),
            pctMoreThan20 = round((numMoreThan20 / numApps) * 100,2),
            noRefs = sum(numHosts == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan20, -noRefs)
write_csv(summaryKnownTrackers, "saveouts_RESULTS/summaryKnownTrackers.csv")

#------MAKE CHARTS
#plot ordinary histogram
countKnownTrackers %>%
  ggplot() +
  geom_histogram(aes(numHosts)) +
  labs(x = "#known trackers in decompiled source code", y = "app count") +
  scale_y_continuous(labels = comma)
ggsave("plots/histKnownTrackers.png",width=5, height=4, dpi=600)

#log transformed y-axis
countKnownTrackers %>%
  ggplot() +
  geom_histogram(aes(numHosts + 0.01)) +
  labs(x = "#known trackers in decompiled source code",
       y = "app count: LOG SCALE") +
  scale_y_log10()
ggsave("plots/histKnownTrackersLOGY.png",width=5, height=4, dpi=600)

#log transformed x-axis
countKnownTrackers %>%
  ggplot() +
  geom_histogram(aes(numHosts + 0.01)) + #adding here to avoid excluding the ones with zero trackers
  labs(x = "#known trackers in decompiled source code: LOG SCALE", y = "app count") +
  scale_x_log10()
ggsave("plots/histKnownTrackersLOGX.png",width=5, height=4, dpi=600)

#log transformed both axes
countAllHosts %>%
  ggplot() +
  geom_histogram(aes(numHosts + 0.01)) +
  labs(x = "#known trackers in decompiled source code: LOG SCALE",
       y = "app count: LOG SCALE") +
  scale_y_log10() + scale_x_log10()
ggsave("plots/histKnownTrackersLOGBOTH.png",width=5, height=4, dpi=600)

#create summary of known trackers
knownTrackersInfo <- appsWithHostsLong %>%
  filter(company != "unknown") %>%
  filter(type == "advertising" | type == "analytics") %>%
  group_by(hosts) %>%
  summarise(refCount = n()) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyJurisdiction, by = "company") %>%
  mutate(jurisdiction = as.character(jurisdiction)) %>%
  arrange(desc(refCount))

write_csv(knownTrackersInfo, "saveouts_RESULTS/knownTrackersInfo.csv")

  #break this down by the proportion of apps that a company is in

#1. don't take into account whether a host ref is for advertising
propAppsWithCompanyRefs <- appsWithHostsLong %>%
  group_by(id) %>%
  distinct(company) %>% #exclude the distinct refs within each group
  ungroup() %>%
  count(company) %>% #then count how many times a company occurs
  filter(company != "unknown") %>%
  mutate(propApps = n / nrow(allAnalysedAppIds)) %>%
  arrange(desc(n))

write_csv(propAppsWithCompanyRefs, "saveouts_RESULTS/propAppsWithCompanyRefs.csv")

#2. take into account whether a host ref is for advertising
propAppsWithKnownTrackerCompanyRefs <- appsWithHostsLong %>%
  filter(company != "unknown") %>%
  filter(type == "advertising" | type == "analytics") %>%
  group_by(id) %>%
  distinct(company) %>% #exclude the distinct refs within each group
  ungroup() %>%
  count(company) %>% #then count how many times a company occurs
  mutate(propApps = n / nrow(allAnalysedAppIds)) %>%
  arrange(desc(n))

write_csv(propAppsWithKnownTrackerCompanyRefs, "saveouts_RESULTS/propAppsWithKnownTrackerCompanyRefs.csv")

#we want to also look by genre

