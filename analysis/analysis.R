#####HOUSEKEEPING#####
library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(jsonlite)
library(scales)
library(ineq)
library(xtable)

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
                                "SELECT app_versions.id, playstore_apps.title, playstore_apps.genre, playstore_apps.family_genre, app_versions.version 
                                FROM app_versions
                                JOIN playstore_apps ON playstore_apps.id = app_versions.id                              
                                WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

#read in company info
companyInfo <- fromJSON("data-raw/combo_str_parents4.json") %>%
  mutate(company = str_to_title(owner_name)) %>%
  select(company, country, root_parent) %>%
  mutate(country = str_to_upper(country)) %>%
  mutate(leaf_parent = ifelse(is.na(root_parent) | root_parent == "", company, root_parent)) %>% #a company is a leaf parent if it ain't got no root_parents
  as.tibble

#read in the list of apps with hosts, in long format
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t
appsWithHostsAndCompaniesLong <- read_csv("~/Desktop/data-processed/appsWithHostsAndCompanyLong.csv") %>%
  mutate(company = str_to_title(company))

#read in the list of apps without hosts
  #NOTE: IF YOU'RE NOT ULRIK THEN READ THIS IN FROM https://drive.google.com/open?id=1qaLgjwmOZ8NIjofIoDt2VDhClJRIhz6t
appsWithNoHosts <- read_csv("~/Desktop/data-processed/appsWithoutHosts.csv")

#count how many apps we've got
numAnalysed <- nrow(appsWithHostsAndCompaniesLong %>% distinct(id)) + nrow(appsWithNoHosts %>% distinct(id))

##### 1 SUMMARY STATS ACROSS GENRES #####
#-----1.1: SUMMARY OF HOST REFERENCES THAT ARE TO KNOWN TRACKERS
#count number of numbers of host references in apps that refer to companies on our list of trackers
hostCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
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
write_csv(summaryKnownTrackers, "saveouts_RESULTS/summaryKnownTrackers.csv")

#draw Lorenz curve and get Gini coefficient
plot(Lc(countKnownTrackers$numHosts), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of tracker references")
ineq(countKnownTrackers$numHosts, type='Gini')

#what number of hosts captures 99% of the distribution?
quantile(countKnownTrackers$numHosts, .99)

#------MAKE CHARTS-----
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
  filter(numHosts < 68) %>%
  ggplot() +
  geom_histogram(aes(numHosts), bins = 30) +
  labs(x = "#known trackers in decompiled source code",
       y = "app count: LOG SCALE") +
  scale_y_log10()
ggsave("plots/histKnownTrackersLOGY.png",width=5, height=4, dpi=600)

#log transformed x-axis
countKnownTrackers %>%
  filter(numHosts < 68) %>%
  ggplot() +
  geom_histogram(aes(numHosts + .01)) + #adding here to not exclude those with zero trackers
  labs(x = "#known trackers in decompiled source code: LOG SCALE", y = "app count") +
  scale_x_log10()
ggsave("plots/histKnownTrackersLOGX.png",width=5, height=4, dpi=600)

#log transformed both axes
countKnownTrackers %>%
  filter(numHosts < 68) %>%
  ggplot() +
  geom_histogram(aes(numHosts + .01), bins = 30) +
  labs(x = "#known trackers in decompiled source code: LOG SCALE",
       y = "app count: LOG SCALE") +
  scale_y_log10() + scale_x_log10()
ggsave("plots/histKnownTrackersLOGBOTH.png",width=5, height=4, dpi=600)


####1.2 WHAT ARE THE MOST POPULAR HOST REFERENCES?####
#creat short mapping from hostsToCompany
hostsToCompany <- appsWithHostsAndCompaniesLong %>%
  select(-id) %>%
  distinct(hosts, company)

#create summary of known trackers and save out top 100
knownTrackersInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(hosts) %>%
  summarise(numApps = n(),
            pctOfApps = round((numApps/numAnalysed)*100,2)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company") %>%
  arrange(desc(numApps))

head(knownTrackersInfo,100) %>%
  write_csv("saveouts_RESULTS/top100KnownTrackersInfo.csv")

#create summary of unknown hosts and save out top 100
unknownHostsInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company == "Unknown") %>%
  group_by(hosts) %>%
  summarise(refCount = n(),
            propOfApps = refCount/numAnalysed %>% round(2)) %>%
  arrange(desc(refCount))

#save out top 100
head(unknownHostsInfo, 100) %>%
  write_csv("saveouts_RESULTS/top100UnknownHosts.csv")

####1.3 HOW MANY DIFFERENT COMPANIES (AT THE LOWEST LEVEL) DO APPS REFER TO?####
#count number of numbers of host references in apps that refer to companies on our list of trackers
companyCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(id) %>%
  distinct(company) %>%
  summarise(numCompanies = n()) %>%
  arrange(desc(numCompanies))

#count how many apps had hosts references but weren't on our list of trackers - set these to 0 companies
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
            median = median(numCompanies),
            Q1 = quantile(numCompanies, .25),
            Q3 = quantile(numCompanies, .75),
            mode = modeFunc(numCompanies),
            min = min(numCompanies),
            max = max(numCompanies),
            IQR = IQR(numCompanies),
            meanCompanies = round(mean(numCompanies),1),
            SD = round(sd(numCompanies),2),
            numMoreThan10 = sum(numCompanies > 10),
            pctMoreThan10 = round((numMoreThan10 / numApps) * 100,2),
            noRefs = sum(numCompanies == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan10, -noRefs)

write_csv(summaryCompanyCount, "saveouts_RESULTS/summaryCompanyCount.csv")

#draw Lorenz curve and get Gini coefficient
plot(Lc(countCompanyRefs$numCompanies), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of company references")
ineq(countCompanyRefs$numCompanies, type='Gini')

#plot ordinary histogram
countCompanyRefs %>%
  ggplot() +
  geom_histogram(aes(numCompanies), bins = 38) +
  labs(x = "Number of companies referred to", y = "Number of apps") +
  scale_y_continuous(labels = comma)
ggsave("plots/histNumCompaniesReferred.png",width=5, height=4, dpi=600)

#break this down by the proportion of apps that a company is in
propAppsWithTrackingCompanyRefs <- appsWithHostsAndCompaniesLong %>%
  group_by(id) %>%
  distinct(company) %>% #exclude the distinct refs within each group
  ungroup() %>%
  filter(company != "Unknown") %>%
  count(company) %>% #then count how many times a company occurs
  mutate(pctOfApps = round((n / numAnalysed)*100,2)) %>%
  arrange(desc(n)) %>%
  left_join(companyInfo, by = "company")

write_csv(propAppsWithTrackingCompanyRefs, "saveouts_RESULTS/propAppsWithTrackingCompanyRefs.csv")

#break down the coverage of companies by ultimate owners
prevalenceOfRootCompanies <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  left_join(companyInfo, by = "company") %>%
  distinct(id, leaf_parent) %>%
  count(leaf_parent) %>%
  mutate(pctOfApps = round((n / numAnalysed)*100,2)) %>%
  arrange(desc(n))

write_csv("saveouts_RESULTS/coverageOfRootCompanies.csv")

#create combined table
prevalenceOwnersAndSubsidiaries <- prevalenceOfRootCompanies %>%
  select(-n) %>%
  left_join(propAppsWithTrackingCompanyRefs, by = "leaf_parent") %>%
  select(-(c(n, root_parent)))

write_csv(prevalenceOwnersAndSubsidiaries, "saveouts_RESULTS/prevalenceOwnersAndSubsidiaries.csv")

#create a latex table from this
print(xtable(prevalenceOwnersAndSubsidiaries),floating=FALSE,latex.environments=NULL)

#######COMPANY ANALYSES BY 'SUPER GENRE'##############
#read in the super genre mapping
genreGrouping <- read_csv("other analyses/genreGrouping.csv") %>%
  select(-numApps)

summaryCompanyCountBySuperGenre <- countCompanyRefs %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre") %>%
  group_by(super_genre) %>%
  summarise(numApps = n(),
            median = median(numCompanies),
            Q1 = quantile(numCompanies, .25),
            Q3 = quantile(numCompanies, .75),
            mode = modeFunc(numCompanies),
            min = min(numCompanies),
            max = max(numCompanies),
            IQR = IQR(numCompanies),
            meanCompanies = round(mean(numCompanies),1),
            SD = round(sd(numCompanies),2),
            numMoreThan10 = sum(numCompanies > 10),
            pctMoreThan10 = round((numMoreThan10 / numApps) * 100,2),
            noRefs = sum(numCompanies == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan10, -noRefs) %>%
  arrange(desc(median))

#get this out as latex table
forLatex <- summaryCompanyCountBySuperGenre %>%
  select(super_genre, numApps, median, Q1, Q3, pctMoreThan10, pctNone) %>%
  mutate(median = as.integer(median),
         Q1 = as.integer(Q1),
         Q3 = as.integer(Q3),
         pctMoreThan10 = round(pctMoreThan10,1),
         pctNone = round(pctNone,1))
print(xtable(forLatex),floating=FALSE,latex.environments=NULL, include.rownames = FALSE)

####TRY A MILLION WAYS OF VISUALISING THIS####
companyRefsByGenre %>%
  filter(numCompanies < 30) %>%
  ggplot(mapping = aes(x = numCompanies, y = ..density..)) +
    geom_freqpoly(mapping = aes(colour = super_genre))
  
ggplot(data = companyRefsByGenre %>% filter(numCompanies < 30), mapping = aes(y = numCompanies, x = reorder(super_genre, numCompanies, FUN = median))) +
  geom_boxplot(varwidth = TRUE) + 
  coord_flip()
  #geom_jitter(position = position_jitter(width = .1, height = 0.1), alpha = 1/100)

#try plotting this as facet-wrapped histograms?
ggplot(transform(companyRefsByGenre %>% filter(numCompanies < 25),
                 super_genre = factor(super_genre,
                                                          levels = c("Communication & Social", "Education","Productivity and Tools","Art and Photography","Health & Lifestyle","Music","Games & Entertainment","News")))) +
  geom_histogram(aes(x = numCompanies, y = ..density..), bins = 10) +
  facet_wrap(~super_genre, nrow = 2)
  
  
#just for fun, try plot boxplots + jittered outliers
companyRefsByGenre2 <- 
  companyRefsByGenre %>%
  group_by(super_genre) %>%
  mutate(outlier = numCompanies > median(numCompanies) + IQR(numCompanies) * 1.5) %>%
  ungroup
  
ggplot(companyRefsByGenre2) +
  aes(x = reorder(super_genre, numCompanies, FUN = median), y = numCompanies) +
  geom_boxplot(outlier.shape = NA) +
  geom_point(data = function(x) dplyr::filter_(x, ~ outlier), position = 'jitter', alpha = 1/30) +
  coord_flip()

######get prevalence of companies + root companies by super genre#######
#get all the apps we've analysed, including the ones with zero trackers
allAppsWithHostsAndGenre <- appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(companyInfo, by = "company") %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre")

#get the number of apps within each super genre
numAppsBySuperGenre <- appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre") %>%
  group_by(super_genre) %>%
  distinct(id) %>%
  summarise(numApps = n())

#create and save out prevalence of companies + root companies for each super genre
for (curGenre in unique(genreGrouping$super_genre)) {
  #prevalence for low-lev companies
  companyPrev <- allAppsWithHostsAndGenre %>%
    filter(super_genre == curGenre) %>%
    filter(company != "Unknown") %>%
    distinct(id, company) %>%
    group_by(company) %>%
    summarise(numAppsReferring = n()) %>%
    mutate(pctOfApps = numAppsReferring / numAppsBySuperGenre %>%
             filter(super_genre == curGenre) %>%
             pull(numApps)
    ) %>%
    arrange(desc(pctOfApps)) %>%
    left_join(companyInfo, by = "company")
  
  #prevalence for root companies 
  rootCompanyPrev <- allAppsWithHostsAndGenre %>%
    filter(super_genre == curGenre) %>%
    filter(company != "Unknown") %>%
    distinct(id, leaf_parent) %>%
    group_by(leaf_parent) %>%
    summarise(numAppsReferring = n()) %>%
    mutate(pctOfApps = numAppsReferring / numAppsBySuperGenre %>%
             filter(super_genre == curGenre) %>%
             pull(numApps)
    ) %>%
    arrange(desc(pctOfApps))
  
  #create combined table
  combinedPrevalence <- rootCompanyPrev %>%
    select(-numAppsReferring) %>%
    left_join(companyPrev, by = "leaf_parent") %>%
    select(-numAppsReferring, -root_parent)
  
  saveName <- str_to_title(curGenre) %>%
    str_replace_all(" ", "") %>%
    str_replace_all("&", "And")
  
  write_csv(combinedPrevalence, str_c("saveouts_RESULTS/companies_by_genre/prevalence", saveName, ".csv"))
}

#######ANALYSE COUNTRY PREVALENCE##############
##########ACROSS GENRES
countryCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  left_join(companyInfo, by = "company") %>%
  group_by(id) %>%
  distinct(country) %>%
  summarise(numCountries = n()) %>%
  arrange(desc(numCountries))
  
#count how many apps had hosts references but weren't on our list of trackers - set these to 0 countries
country_appsWithHostsButNoKnownCompanies <- appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(countryCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numCountries = 0)

#then put all of these in same dataframe to count properly
countCountryRefs <- countryCountsInAppsWithKnownTrackers %>%
  rbind(appsWithNoHosts %>% rename(numCountries = numHosts)) #add the apps with no host refs at all
  rbind(country_appsWithHostsButNoKnownCompanies) #add the apps with no hosts that are known trackers

#summarise the numbers of countries
summaryCountryCount <- countCountryRefs %>%
  summarise(numApps = n(),
            median = median(numCountries),
            Q1 = quantile(numCountries, .25),
            Q3 = quantile(numCountries, .75),
            mode = modeFunc(numCountries),
            min = min(numCountries),
            max = max(numCountries),
            IQR = IQR(numCountries),
            meanCompanies = round(mean(numCountries),1),
            SD = round(sd(numCountries),2),
            numMoreThan10 = sum(numCountries > 10),
            pctMoreThan10 = round((numMoreThan10 / numApps) * 100,2),
            noRefs = sum(numCountries == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan10, -noRefs)

write_csv(summaryCountryCount,"saveouts_RESULTS/country_num_summary.csv")

countCountryRefs %>%
  ggplot() +
  geom_histogram(aes(numCountries)) +
  labs(x = "Number of countries referred to", y = "Number of apps") +
  scale_y_continuous(labels = comma)
ggsave("plots/histNumCountriesReferred.png",width=5, height=4, dpi=600)

#break this down by the proportion of apps that a country is in
country_propAppsWithTrackingCompanyRefs <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  left_join(companyInfo, by = "company") %>%
  group_by(id) %>%
  distinct(country) %>% #exclude the distinct countries within each app
  ungroup() %>%
  count(country) %>% #then count how many times a company occurs
  mutate(pctOfApps = round((n / numAnalysed)*100,2)) %>%
  arrange(desc(n))

write_csv(country_propAppsWithTrackingCompanyRefs,"saveouts_RESULTS/prevalenceOfCountries.csv")

#########BY SUPER GENRES
summaryCountryCountBySuperGenre <- countCountryRefs %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre") %>%
  group_by(super_genre) %>%
  summarise(numApps = n(),
            median = median(numCountries),
            Q1 = quantile(numCountries, .25),
            Q3 = quantile(numCountries, .75),
            mode = modeFunc(numCountries),
            min = min(numCountries),
            max = max(numCountries),
            IQR = IQR(numCountries),
            meanCompanies = round(mean(numCountries),1),
            SD = round(sd(numCountries),2),
            numMoreThan10 = sum(numCountries > 10),
            pctMoreThan10 = round((numMoreThan10 / numApps) * 100,2),
            noRefs = sum(numCountries == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan10, -noRefs) %>%
  arrange(desc(median))

write_csv(summaryCountryCountBySuperGenre, "saveouts_RESULTS/countries_by_genre/summaryCountryCountBySuperGenre.csv")

#get all the apps we've analysed, including the ones with zero trackers
allAppsWithHostsAndGenre <- appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(companyInfo, by = "company") %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre")

#get the number of apps within each super genre
numAppsBySuperGenre <- appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre") %>%
  group_by(super_genre) %>%
  distinct(id) %>%
  summarise(numApps = n())

#create and save out prevalence of countries for each super genre
for (curGenre in unique(genreGrouping$super_genre)) {
  #prevalence for low-lev companies
  countryPrev <- allAppsWithHostsAndGenre %>%
    filter(super_genre == curGenre) %>%
    filter(company != "Unknown") %>%
    distinct(id, country) %>%
    group_by(country) %>%
    summarise(numAppsReferring = n()) %>%
    mutate(pctOfApps = round((numAppsReferring / numAppsBySuperGenre %>%
             filter(super_genre == curGenre) %>%
             pull(numApps))*100,2)
    ) %>%
    arrange(desc(pctOfApps)) %>%
    filter(country != "")
  
  saveName <- str_to_title(curGenre) %>%
    str_replace_all(" ", "") %>%
    str_replace_all("&", "And")
  
  write_csv(countryPrev, str_c("saveouts_RESULTS/countries_by_genre/prevalence", saveName, ".csv"))
}

#######ANALYSE BY GOOGLE PLAY STORE GENRES ##############
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
##----- SUMMARY OF ALL HOSTS-----####
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


#------ MAKE SUMMARY OF MOST FREQUENT HOSTS-------
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