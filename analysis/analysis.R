library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(jsonlite)
library(scales)

#####0. HOUSEKEEPING#####
options(scipen=10) #make plots more readable by increasing the number of values before scientific notation is used

#function to calculate modal value
modeFunc <- function(x) {
  ux <- unique(x)
  ux[which.max(tabulate(match(x, ux)))]
}

#####1. READ IN INFO #####
#set up data base driver and connection
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

#get ids and general info about all analyzed apps
allAnalysedAppsInfo <- dbGetQuery(con,
                                "SELECT app_versions.id, playstore_apps.title, playstore_apps.genre, app_versions.version 
                                FROM app_versions
                                JOIN playstore_apps ON playstore_apps.id = app_versions.id                              
                                WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

#read in the list of apps with hosts, in long format
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t
appsWithHostsLong <- read_csv("~/Desktop/data-processed/appsWithHostsLongFormat.csv")

#read in the list of apps without hosts
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t
appsWithoutHosts <- read_csv("~/Desktop/data-processed/appsWithoutHosts.csv")


#####1 SUMMARY STATS
#-----1.1: ALL HOSTS
#group by id and count number of hosts
countAllHosts <- appsWithHostsLong %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  rbind(appsWithoutHosts) %>%
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

summaryAllHosts

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
  geom_histogram(aes(numHosts)) +
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
#we need host-company mapping and info about the companies
  #read in mapping from hosts to companies
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t
appsWithHostsAndCompaniesLong <- read_csv("~/Desktop/data-processed/appsWithHostsAndCompanyLong.csv")
hostsToCompany <- appsWithHostsAndCompaniesLong %>%
  select(-id) %>%
  distinct(hosts, company)

#read in company info
companyInfo <- fromJSON("data-raw/combo_str_parents2.json") %>%
  mutate(company = owner_name) %>%
  select(company, country, parent_id) %>%
  mutate(country = str_to_upper(country)) %>%
  as.tibble

#create summary of hosts
allHostsInfo <- appsWithHostsLong %>%
  group_by(hosts) %>%
  summarise(refCount = n()) %>%
  arrange(desc(refCount)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company")

#save out the top 100
head(allHostsInfo, 100) %>%
  write_csv("saveouts_RESULTS/top100Hosts.csv")

#create summary of parents
hostsAndParents <- appsWithHostsLong %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company") %>%
  group_by(parent_id) %>%
  summarise(refCount = n()) %>%
  arrange(desc(refCount)) %>%
  filter(parent_id != "NA", parent_id != "") %>%
  distinct(parent_id, refCount) %>%
  left_join(companyInfo, by = "parent_id") %>%
  distinct(parent_id, refCount, country)

#save out top 100

#-----1.2: SUMMARY OF HOSTS THAT ARE KNOWN TRACKERS
#read in the join of apps with hosts and company
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t

#count again, but exclude unknowns
countKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "unknown") %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  arrange(desc(numHosts))

#count how many we've dropped - set these to 0 host refs
appsWithHostsIds <- appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  select(id)

appsWithHostsButNoKnownTrackers <- anti_join(appsWithHostsIds, countKnownTrackers, by = "id") %>%
  mutate(numHosts = 0)

#then add non-included apps to count properly
countKnownTrackers <- countKnownTrackers %>%
  rbind(appsWithoutHosts) %>% #add the apps with no host refs at all
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
summaryKnownTrackers

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
  geom_histogram(aes(numHosts)) +
  labs(x = "#known trackers in decompiled source code",
       y = "app count: LOG SCALE") +
  scale_y_log10()
ggsave("plots/histKnownTrackersLOGY.png",width=5, height=4, dpi=600)

#log transformed x-axis
countKnownTrackers %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) + #adding here to avoid excluding the ones with zero trackers
  labs(x = "#known trackers in decompiled source code: LOG SCALE", y = "app count") +
  scale_x_log10()
ggsave("plots/histKnownTrackersLOGX.png",width=5, height=4, dpi=600)

#log transformed both axes
countKnownTrackers %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) +
  labs(x = "#known trackers in decompiled source code: LOG SCALE",
       y = "app count: LOG SCALE") +
  scale_y_log10() + scale_x_log10()
ggsave("plots/histKnownTrackersLOGBOTH.png",width=5, height=4, dpi=600)

#create summary of known trackers
knownTrackersInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company != "unknown") %>%
  group_by(hosts) %>%
  summarise(refCount = n(),
            propOfApps = refCount/nrow(countAllHosts)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company") %>%
  arrange(desc(refCount))

head(knownTrackersInfo,100) %>%
  write_csv("saveouts_RESULTS/top100KnownTrackersInfo.csv")

#create summary of unknown hosts
unknownHostsInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company == "unknown") %>%
  group_by(hosts) %>%
  summarise(refCount = n(),
            propOfApps = refCount/nrow(countAllHosts) %>% round(2)) %>%
  arrange(desc(refCount))

head(unknownHostsInfo, 100) %>%
  write_csv("saveouts_RESULTS/top100UnknownHosts.csv")

#break this down by the proportion of apps that a company is in
propAppsWithTrackingCompanyRefs <- appsWithHostsAndCompaniesLong %>%
  group_by(id) %>%
  distinct(company) %>% #exclude the distinct refs within each group
  ungroup() %>%
  count(company) %>% #then count how many times a company occurs
  filter(company != "unknown") %>%
  mutate(propApps = round(n / nrow(countAllHosts),2)) %>%
  arrange(desc(n)) %>%
  left_join(companyInfo, by = "company")

write_csv(propAppsWithTrackingCompanyRefs, "saveouts_RESULTS/propAppsWithTrackingCompanyRefs.csv")

#######DO ANALYSES AGAIN, BY GENRE
#summarise the numbers of known trackers, by genre
summaryKnownTrackersByGenre <- countKnownTrackers %>%
  left_join(allAnalysedAppsInfo, by = "id") %>%
  group_by(genre) %>%
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
  select(-numMoreThan20, -noRefs) %>%
  arrange(desc(median))

write_csv(summaryKnownTrackersByGenre, "saveouts_RESULTS/summaryKnownTrackersByGenre.csv")

#plot the distributions
numKnownTrackersByGenre <- countKnownTrackers %>%
  left_join(allAnalysedAppsInfo, by = "id")

ggplot(data = numKnownTrackersByGenre, aes(x = reorder(genre, numHosts, median, order=TRUE), y = numHosts)) + 
  geom_boxplot(varwidth = TRUE) + coord_flip() +
  labs(y = "Number of known trackers", x = "Genre", title = "Distribution of trackers by genre, apps w/ less than 70") + ylim(0,70)
ggsave("plots/DistributionOfTrackersByGenre.png", width=8, height=7, dpi=400)

#parent level

