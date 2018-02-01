library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(jsonlite)
library(scales)
library(ineq)

#####0. HOUSEKEEPING#####
options(scipen=10) #make plots more readable by increasing the number of values before scientific notation is used

#function to calculate modal value
modeFunc <- function(x) {
  ux <- unique(x)
  ux[which.max(tabulate(match(x, ux)))]
}

#####0. READ IN INFO #####
#set up data base driver and connection
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

#get ids and general info about all analyzed apps
appInfo <- dbGetQuery(con,
                                "SELECT app_versions.id, playstore_apps.title, playstore_apps.genre, app_versions.version 
                                FROM app_versions
                                JOIN playstore_apps ON playstore_apps.id = app_versions.id                              
                                WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

#read in company info
companyInfo <- fromJSON("data-raw/combo_str_parents2.json") %>%
  mutate(company = owner_name) %>%
  select(company, country, parent_id) %>%
  mutate(country = str_to_upper(country)) %>%
  as.tibble

#read in the list of apps with hosts, in long format
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t
appsWithHostsAndCompaniesLong <- read_csv("~/Desktop/data-processed/appsWithHostsAndCompanyLong.csv")

#read in the list of apps without hosts
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t
appsWithNoHosts <- read_csv("~/Desktop/data-processed/appsWithoutHosts.csv")

#count how many apps we've got
numAnalysed <- nrow(appsWithHostsAndCompaniesLong %>% distinct(id)) + nrow(appsWithNoHosts %>% distinct(id))

##### 1 SUMMARY STATS #####
#-----1.1: SUMMARY OF HOST REFERENCES THAT ARE TO KNOWN TRACKERS
#count number of numbers of host references in apps that refer to companies on our list of trackers
hostCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "unknown") %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  arrange(desc(numHosts))

#get apps that had hosts references but weren't on our list of trackers - set these to 0 host refs
appsWithHostsButNoKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(hostCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numHosts = 0)

#then add non-included apps to count properly
countKnownTrackers <- hostCountsInAppsWithKnownTrackers %>%
  rbind(appsWithNoHosts) %>% #add the apps with no host refs at all
  rbind(appsWithHostsButNoKnownTrackers) #add the apps with no hosts that are known trackers

#summarise the numbers of known trackers
summaryKnownTrackers <- countKnownTrackers %>%
  summarise(numApps = n(),
            mean = round(mean(numHosts),1),
            median = median(numHosts),
            mode = modeFunc(numHosts),
            min = min(numHosts),
            max = max(numHosts),
            IQR = IQR(numHosts),
            SD = round(sd(numHosts),2),
            numMoreThan20 = sum(numHosts > 20),
            pctMoreThan20 = round((numMoreThan20 / numApps) * 100,2),
            noRefs = sum(numHosts == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan20, -noRefs)
write_csv(summaryKnownTrackers, "saveouts_RESULTS/summaryKnownTrackers.csv")

#draw Lorenz curve and get Gini coefficient
plot(Lc(countKnownTrackers$numHosts), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of tracker references")
ineq(countKnownTrackers$numHosts, type='Gini')

#what number of hosts captures 99.99% of the distribution?
quantile(countKnownTrackers$numHosts, .9999)

#------MAKE CHARTS
#plot ordinary histogram
countKnownTrackers %>%
  filter(numHosts < 68) %>%
  ggplot() +
  geom_histogram(aes(numHosts), bins = 68) +
  labs(x = "Number of references to tracker domains", y = "Number of apps") +
  scale_y_continuous(labels = comma)
ggsave("plots/histRefsTrackerDomains.png",width=5, height=4, dpi=600)

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


###1.2 WHAT ARE THE MOST POPULAR HOST REFERENCES?
#creat short mapping from hostsToCompany
hostsToCompany <- appsWithHostsAndCompaniesLong %>%
  select(-id) %>%
  distinct(hosts, company)

#create summary of known trackers and save out top 100
knownTrackersInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company != "unknown") %>%
  group_by(hosts) %>%
  summarise(numApps = n(),
            pctOfApps = round((numApps/numAnalysed)*100,2)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company") %>%
  arrange(desc(numApps))
knownTrackersInfo
head(knownTrackersInfo,100) %>%
  write_csv("saveouts_RESULTS/top100KnownTrackersInfo.csv")

#create summary of unknown hosts and save out top 100
unknownHostsInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company == "unknown") %>%
  group_by(hosts) %>%
  summarise(refCount = n(),
            propOfApps = refCount/numAnalysed %>% round(2)) %>%
  arrange(desc(refCount))

#save out top 100
head(unknownHostsInfo, 100) %>%
  write_csv("saveouts_RESULTS/top100UnknownHosts.csv")

###1.3 HOW MANY DIFFERENT COMPANIES (AT THE LOWEST LEVEL) DO APPS REFER TO?
#count number of numbers of host references in apps that refer to companies on our list of trackers
companyCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "unknown") %>%
  group_by(id) %>%
  distinct(company) %>%
  summarise(numCompanies = n()) %>%
  arrange(desc(numCompanies))

#count how apps had hosts references but weren't on our list of trackers - set these to 0 companies
appsWithHostsButNoKnownCompanies <- appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(companyCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numCompanies = 0)

#then put all of these in same dataframe to count properly
countCompanyRefs <- companyCountsInAppsWithKnownTrackers %>%
  rbind(appsWithNoHosts %>% mutate(numCompanies = 0) %>% select(id, numCompanies)) %>% #add the apps with no host refs at all
  rbind(appsWithHostsButNoKnownCompanies) #add the apps with no hosts that are known trackers

#summarise the numbers of known trackers
summaryCompanyCount <- countCompanyRefs %>%
  summarise(numApps = n(),
            meanCompanies = round(mean(numCompanies),1),
            median = median(numCompanies),
            mode = modeFunc(numCompanies),
            min = min(numCompanies),
            max = max(numCompanies),
            IQR = IQR(numCompanies),
            SD = round(sd(numCompanies),2),
            numMoreThan10 = sum(numCompanies > 10),
            pctMoreThan10 = round((numMoreThan10 / numApps) * 100,2),
            noRefs = sum(numCompanies == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan10, -noRefs)
write_csv(summaryCompanyCount, "saveouts_RESULTS/summaryCompanyCount.csv")
summaryCompanyCount
#draw Lorenz curve and get Gini coefficient
plot(Lc(countCompanyRefs$numCompanies), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of company references")
ineq(countCompanyRefs$numCompanies, type='Gini')

#break this down by the proportion of apps that a company is in
propAppsWithTrackingCompanyRefs <- appsWithHostsAndCompaniesLong %>%
  group_by(id) %>%
  distinct(company) %>% #exclude the distinct refs within each group
  ungroup() %>%
  filter(company != "unknown") %>%
  count(company) %>% #then count how many times a company occurs
  mutate(propApps = round(n / numAnalysed,2)) %>%
  arrange(desc(n)) %>%
  left_join(companyInfo, by = "company")

write_csv(propAppsWithTrackingCompanyRefs, "saveouts_RESULTS/propAppsWithTrackingCompanyRefs.csv")

#######DO ANALYSES AGAIN, BY GENRE
#summarise the numbers of known trackers, by genre
summaryKnownTrackersByGenre <- countKnownTrackers %>%
  left_join(appInfo, by = "id") %>%
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


#proportions w/ all
propsAll <- countKnownTrackers %>%
  left_join(appInfo, by = "id") %>%
  group_by(genre) %>%
  summarise(numApps = n(), 
            prop = round(numApps / nrow(countKnownTrackers), 4)) %>%
  arrange(desc(prop))
View(propsAll)

#proportions w/ only 0 trackers
noKnownTrackers <- countKnownTrackers %>%
  left_join(appInfo, by = "id") %>%
  group_by(genre) %>%
  filter(numHosts == 0) %>%
  summarise(numApps = n(), 
            prop = round(numApps / nrow(noKnownTrackers), 4)) %>%
  arrange(desc(prop))
View(noKnownTrackers)


write_csv(summaryKnownTrackersByGenre, "saveouts_RESULTS/summaryKnownTrackersByGenre.csv")

#plot the distributions
numKnownTrackersByGenre <- countKnownTrackers %>%
  left_join(appInfo, by = "id")

ggplot(data = numKnownTrackersByGenre, aes(x = reorder(genre, numHosts, median, order=TRUE), y = numHosts)) + 
  geom_boxplot(varwidth = TRUE) + coord_flip() +
  labs(y = "Number of known trackers", x = "Genre", title = "Distribution of trackers by genre, apps w/ less than 70") + ylim(0,70)
ggsave("plots/DistributionOfTrackersByGenre.png", width=8, height=7, dpi=400)

#parent level






#######OTHER ANALYSES#########
##----- SUMMARY OF ALL HOSTS
#group by id and count number of hosts
countAllHosts <- appsWithHostsAndCompaniesLong %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  rbind(appsWithNoHosts) %>%
  arrange(desc(numHosts))

#take a look at references in the top scoring app
appsWithHostsAndCompaniesLong %>%
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
#create summary of hosts
allHostsInfo <- appsWithHostsAndCompaniesLong %>%
  group_by(hosts) %>%
  summarise(refCount = n()) %>%
  arrange(desc(refCount)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company")

#save out the top 100
head(allHostsInfo, 100) %>%
  write_csv("saveouts_RESULTS/top100Hosts.csv")

#create summary of parents
hostsAndParents <- appsWithHostsAndCompaniesLong %>%
  left_join(companyInfo, by = "company") %>%
  group_by(parent_id) %>%
  summarise(refCount = n()) %>%
  arrange(desc(refCount)) %>%
  filter(parent_id != "NA", parent_id != "") %>%
  distinct(parent_id, refCount) %>%
  left_join(companyInfo, by = "parent_id") %>%
  distinct(parent_id, refCount, country)