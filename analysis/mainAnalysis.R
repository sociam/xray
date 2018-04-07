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

#####0. READ IN DATA #####
#set up data base driver and connection
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "xray",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

#read in apps ids and info
  #get it from the DB
appInfo <- dbGetQuery(con,
                      "SELECT app_versions.id, playstore_apps.title, playstore_apps.genre, playstore_apps.family_genre, app_versions.version 
                      FROM app_versions
                      JOIN playstore_apps ON playstore_apps.id = app_versions.id                              
                      WHERE app_versions.analyzed = TRUE") %>%
  as.tibble()

#read in company info
companyInfo <- fromJSON("companyData/company_data_list_6_4_2018.json") %>%
  as.tibble() %>%
  select(-doms) %>%
  rename(company = owner_name) %>%
  mutate(company = str_to_title(company)) %>%
  select(company, country, root_parent) %>%
  mutate(country = str_to_upper(country)) %>%
  mutate(leaf_parent = ifelse(is.na(root_parent) | root_parent == "", company, root_parent))


#read in the list of hosts included in apps' bytecode, plus corresponding app ids, in long format
#appsWithHostsAndCompaniesLong <- read_csv("data/sample_appsWithHostsAndCompaniesLong")
appsWithHostsAndCompaniesLong <- read_csv("~/Desktop/data-processed/appsWithHostsAndCompanyLong.csv") %>%
  mutate(company = str_to_title(company))

#read in the list of apps that did not include any hosts in bytecode
#appsWithNoHosts <- read_csv("data/sample_appsWithNoHosts.csv")
appsWithNoHosts <- read_csv("~/Desktop/data-processed/appsWithoutHosts.csv")

#count how many apps we've got
numAnalysed <- nrow(appsWithHostsAndCompaniesLong %>% distinct(id)) + nrow(appsWithNoHosts %>% distinct(id))

##### 1 SUMMARY STATS ACROSS GENRES #####
#-----1.1: SUMMARY OF HOST REFERENCES
#count number of hosts in apps owned by companies on our tracker list
hostCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  arrange(desc(numHosts))

#set host count to 0 for apps whose hosts were not on our tracker list
appsWithHostsButNoKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(hostCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numHosts = 0)

#put apps in a common dataframe
countKnownTrackers <- hostCountsInAppsWithKnownTrackers %>%
  rbind(appsWithHostsButNoKnownTrackers) %>% 
  rbind(appsWithNoHosts) #include the apps with no hosts at all

#calculate summary statistics of number of tracker hosts per app
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

write_csv(summaryKnownTrackers, "results/hostAnalysis/summaryNumTrackerHostsPerApp.csv")

#check out level of inequality: draw Lorenz curve and get Gini coefficient
plot(Lc(countKnownTrackers$numHosts), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of tracker references")
ineq(countKnownTrackers$numHosts, type='Gini')

#plot the distribution in a histogram
countKnownTrackers %>%
  filter(numHosts < 65) %>%
  ggplot() +
  geom_histogram(aes(numHosts), bins = 65) +
  labs(x = "Number of tracker hosts per app", y = "Number of apps") +
  scale_y_continuous(labels = comma, breaks = seq(0,100000, 20000)) + 
  theme_minimal() + theme(axis.title.y = element_text(margin = margin(t = 0, r = 10, b = 0, l = 0)),
                          axis.title.x = element_text(margin = margin(t = 10, r = 0, b = 0, l = 0)))

ggsave("plots/histTrackerHostsPerApp.png",width=5, height=4, dpi=600)



####1.2 WHAT ARE THE MOST FREQUENT HOSTS?####
#create short mapping from hostsToCompany
hostsToCompany <- appsWithHostsAndCompaniesLong %>%
  select(-id) %>%
  distinct(hosts, company)

#create summary of tracker hosts and save out top 250
knownTrackersInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(hosts) %>%
  summarise(numApps = n(),
            pctOfApps = round((numApps/numAnalysed)*100,2)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company") %>%
  arrange(desc(numApps))

head(knownTrackersInfo,250) %>%
  select(-leaf_parent) %>%
  write_csv("results/hostAnalysis/top250TrackerHosts.csv")

#create summary of 'unknown' hosts (i.e. not on our tracker list) and save out top 250
unknownHostsInfo <- appsWithHostsAndCompaniesLong %>%
  filter(company == "Unknown") %>%
  group_by(hosts) %>%
  summarise(refCount = n(),
            propOfApps = refCount/numAnalysed %>% round(2)) %>%
  arrange(desc(refCount))

head(unknownHostsInfo, 250) %>%
  write_csv("results/hostAnalysis/top250UnknownHosts.csv")



####1.3 HOW MANY DISTINCT TRACKER COMPANIES ARE APPS ASSOCIATED WITH?####
#count number of distinct companies in apps that include hosts that are on our tracker list
companyCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(id) %>%
  distinct(company) %>%
  summarise(numCompanies = n()) %>%
  arrange(desc(numCompanies))

#set number of companies to 0 for apps who included only hosts not on our tracker list
appsWithHostsButNoTrackerCompanies <- appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(companyCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numCompanies = 0)

#put the apps in a common dataframe
countCompanyRefs <- companyCountsInAppsWithKnownTrackers %>%
  rbind(appsWithHostsButNoTrackerCompanies) %>%
  rbind(appsWithNoHosts %>% mutate(numCompanies = 0) %>% select(id, numCompanies)) #add also the apps that include no apps at all, and set their company count to 0

#calculate summary statistics of distinct tracker companies per app
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

write_csv(summaryCompanyCount, "results/companyAnalysis/summaryCompanyCount.csv")

#draw Lorenz curve and get Gini coefficient
plot(Lc(countCompanyRefs$numCompanies), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of company references")
ineq(countCompanyRefs$numCompanies, type='Gini')

#explore the extreme outliers
countCompanyRefs %>%
 filter(numCompanies > 27) %>%
 left_join(appInfo) %>%
 write_csv("results/outliers/extreme_outliers_NumCompanies.csv")

#plot the distribution in a histogram
countCompanyRefs %>%
  filter(numCompanies < 26) %>%
  ggplot() +
  geom_histogram(aes(numCompanies), bins = 26) +
  labs(x = "Number of distinct companies per app", y = "Number of apps") +
  scale_y_continuous(labels = comma, breaks = seq(0, 140000, 40000)) +
  scale_x_continuous(breaks = c(0,5,10,15,20)) +
  theme_minimal() + theme(axis.title.y = element_text(margin = margin(t = 0, r = 5, b = 0, l = 0)),
                          axis.title.x = element_text(margin = margin(t = 10, r = 0, b = 0, l = 0)))

ggsave("plots/histTrackerCompaniesPerApp.png",width=5, height=4, dpi=600)




####1.4 WHAT PROPORTION OF APPS ARE SPECIFIC COMPANIES PRESENT IN?####
#calculate how many percent of apps each company (immediate owner) is present in
propAppsWithTrackingCompanyRefs <- appsWithHostsAndCompaniesLong %>%
  group_by(id) %>%
  distinct(company) %>% #exclude the distinct refs within each group
  ungroup() %>%
  filter(company != "Unknown") %>%
  count(company) %>% #then count how many times a company occurs
  mutate(pctOfApps = (n / numAnalysed)*100) %>%
  arrange(desc(n)) %>%
  left_join(companyInfo, by = "company")

#calculate how many percent of apps each root company is present in
prevalenceOfRootCompanies <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  left_join(companyInfo, by = "company") %>%
  distinct(id, leaf_parent) %>%
  count(leaf_parent) %>%
  mutate(pctOfApps = (n / numAnalysed)*100) %>%
  arrange(desc(n))

#then combine the two
prevalenceOwnersAndSubsidiaries <- prevalenceOfRootCompanies %>%
  left_join(propAppsWithTrackingCompanyRefs, by = "leaf_parent") %>%
  select(-root_parent)

write_csv(prevalenceOwnersAndSubsidiaries, "results/companyAnalysis/prevalenceRootParentsAndSubsidiaries.csv")

#create a latex table from this
# forLatex_prevalenceOwnersAndSubsidiaries <- prevalenceOwnersAndSubsidiaries %>%
#   select(-n.x, -n.y)
# print(xtable(forLatex_prevalenceOwnersAndSubsidiaries),floating=FALSE,latex.environments=NULL, include.rownames = FALSE)

####1.5 ANALYSES BY 'SUPER GENRE'####
####1.5.1 NUMBER OF DISTINCT TRACKER COMPANIES PER APP####
#first describe the number of distinct tracker companies per app for family apps
fam_countCompanyRefs <- countCompanyRefs %>%
  left_join(appInfo, by = "id") %>%
  filter(!is.na(family_genre)) %>%
  mutate(super_genre = "Family")

fam_summaryCompanyCount <- fam_countCompanyRefs %>%
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
  mutate(super_genre = "Family")

#then describe the number of tracker companies per app by super genre, and add a row with the description for family apps to the output
genreGrouping <- read_csv("otherAnalyses/genreGrouping.csv") %>% select(-numApps)

summaryCompanyCountBySuperGenreAddFamily <- countCompanyRefs %>%
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
  bind_rows(fam_summaryCompanyCount) %>%
  arrange(desc(pctMoreThan10))

write_csv(summaryCompanyCountBySuperGenreAddFamily, "results/companyAnalysis/bySuperGenre/summaryCompanyCountBySuperGenreAddFamily.csv")

# get out for latex
# forLatex <- summaryCompanyCountBySuperGenreAddFamily %>%
#   select(super_genre, numApps, median, Q1, Q3, pctMoreThan10, pctNone) %>%
#   mutate(median = as.integer(median),
#          Q1 = as.integer(Q1),
#          Q3 = as.integer(Q3),
#          pctMoreThan10 = round(pctMoreThan10,1),
#          pctNone = round(pctNone,1))
# print(xtable(forLatex),floating=FALSE,latex.environments=NULL, include.rownames = FALSE)


#visualise this in a box plot
countCompanyRefs %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre") %>%
  bind_rows(fam_countCompanyRefs) %>%
  filter(numCompanies < 22) %>%
  ggplot(mapping = aes(y = numCompanies, x = reorder(super_genre, numCompanies, FUN = quantile, prob = 0.75))) +
  geom_boxplot(varwidth = TRUE, outlier.shape = NA) + 
  labs(x = "Super genre", y = "Number of distinct companies per app") +
  coord_flip() + theme_minimal() +
  theme(axis.title.y = element_text(margin = margin(t = 0, r = 5, b = 0, l = 0)),
        axis.title.x = element_text(margin = margin(t = 10, r = 0, b = 0, l = 0)))
  
ggsave("plots/boxNumCompaniesPerAppBySuperGenre.png",width=5, height=4, dpi=600)

####1.5.2 PERCENTAGE PREVALENCE OF TRACKER COMPANIES IN APPS####
#get all the apps we've analysed, including the ones with zero hosts
allAppsWithHostsAndGenre <- appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(companyInfo, by = "company") %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre")

familyAppsWithHostsAndGenre <- allAppsWithHostsAndGenre %>%
  filter(!is.na(family_genre)) %>%
  mutate(super_genre = "Family")

allAppsWithHostsAndGenreAddFamily <- allAppsWithHostsAndGenre %>%
  bind_rows(familyAppsWithHostsAndGenre)

#get the number of apps within each super genre (including family)
numAppsBySuperGenre <- allAppsWithHostsAndGenreAddFamily %>%
  group_by(super_genre) %>%
  distinct(id) %>%
  summarise(numApps = n())

#create and save out prevalence of companies + root companies for each super genre
for (curGenre in numAppsBySuperGenre$super_genre) {
  #prevalence for low-lev companies
  companyPrev <- allAppsWithHostsAndGenreAddFamily %>%
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
  rootCompanyPrev <- allAppsWithHostsAndGenreAddFamily %>%
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
  
  write_csv(combinedPrevalence, str_c("results/companyAnalysis/bySuperGenre/companyPrevalence", saveName, ".csv"))
}



#######1.6 ANALYSE COUNTRY PREVALENCE##############
####1.6.1 FOR ALL APPS####
countryCountsInAppsWithKnownTrackers <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  left_join(companyInfo, by = "company") %>%
  select(-c(country, root_parent)) %>%
  gather(key = subsidiary_level, value = company, -c(id, hosts)) %>%
  left_join(companyInfo %>% select(-c(root_parent, leaf_parent)), by = "company") %>%
  filter(!is.na(country), country != "", country != "N/A") %>% #exclude where we don't know what country is
  group_by(id) %>%
  distinct(country) %>%
  summarise(numCountries = n()) %>%
  arrange(desc(numCountries))

#set country count to 0 for apps that include hosts not on our list of trackers
country_appsWithHostsButNoKnownCompanies <- appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(countryCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numCountries = 0)

#put in same dataframe
countCountryRefs <- countryCountsInAppsWithKnownTrackers %>%
  rbind(country_appsWithHostsButNoKnownCompanies) %>%
  rbind(appsWithNoHosts %>% rename(numCountries = numHosts)) #include apps with no host refs at all

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

write_csv(summaryCountryCount,"results/countryAnalysis/countrySummary.csv")

#plot this summary
countCountryRefs %>%
  filter(numCountries < 6) %>%
  ggplot() +
  geom_histogram(aes(numCountries)) +
  labs(x = "Number of countries", y = "Number of apps") +
  scale_y_continuous(labels = comma) +
  theme_minimal()
ggsave("plots/histNumCountriesPerApp.png",width=5, height=4, dpi=600)

#break this down by the proportion of apps a given country is referred to via a tracker company being based there
propAppsWithCompaniesFromAGivenCountry <- appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  left_join(companyInfo, by = "company") %>%
  select(-c(country, root_parent)) %>%
  gather(key = subsidiary_level, value = company, -c(id, hosts)) %>%
  left_join(companyInfo %>% select(-c(root_parent, leaf_parent)), by = "company") %>%
  filter(!is.na(country), country != "", country != "N/A") %>% #exclude where we don't know what the country is
  group_by(id) %>%
  distinct(country) %>% #exclude the distinct countries within each app
  ungroup() %>%
  count(country) %>% #then count how many times a country occurs
  mutate(pctOfApps = round((n / numAnalysed)*100,2)) %>%
  arrange(desc(n))

write_csv(propAppsWithCompaniesFromAGivenCountry,"results/countryAnalysis/propAppsWithCompaniesFromAGivenCountry.csv")
# get out for latex
#print(xtable(propAppsWithCompaniesFromAGivenCountry),floating=FALSE,latex.environments=NULL, include.rownames = FALSE)


####1.6.2 BY SUPER GENRE####
####1.6.2.1 SUMMARISE DISTRIBUTION####
#first summarise number of countries in family apps
fam_countCountryRefs <- countCountryRefs %>%
  left_join(appInfo, by = "id") %>%
  filter(!is.na(family_genre)) %>%
  mutate(super_genre = "Family")

fam_summaryCountryCount <- fam_countCountryRefs %>%
  summarise(numApps = n(),
            median = median(numCountries),
            Q1 = quantile(numCountries, .25),
            Q3 = quantile(numCountries, .75),
            mode = modeFunc(numCountries),
            min = min(numCountries),
            max = max(numCountries),
            IQR = IQR(numCountries),
            meanCountries = round(mean(numCountries),1),
            SD = round(sd(numCountries),2),
            numMoreThan10 = sum(numCountries > 10),
            pctMoreThan10 = round((numMoreThan10 / numApps) * 100,2),
            noRefs = sum(numCountries == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan10, -noRefs) %>%
  mutate(super_genre = "Family")

#then summarise number of countries by super genres, and add family row
summaryCountryCountBySuperGenreAddFamily <- countCountryRefs %>%
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
            meanCountries = round(mean(numCountries),1),
            SD = round(sd(numCountries),2),
            numMoreThan10 = sum(numCountries > 10),
            pctMoreThan10 = round((numMoreThan10 / numApps) * 100,2),
            noRefs = sum(numCountries == 0),
            pctNone = round((noRefs / numApps) * 100,2)) %>%
  select(-numMoreThan10, -noRefs) %>%
  bind_rows(fam_summaryCountryCount) %>%
  arrange(desc(meanCountries))

write_csv(summaryCountryCountBySuperGenreAddFamily, "results/countryAnalysis/bySuperGenre/summaryCountryCountBySuperGenreAddFamily.csv")

####1.6.2.2 GET PREVALENCE OF COUNTRIES WITHIN EACH SUPER GENRE
#create and save out prevalence of countries for each super genre
for (curGenre in numAppsBySuperGenre$super_genre) {
  countryPrev <- allAppsWithHostsAndGenreAddFamily %>%
    filter(super_genre == curGenre) %>%
    filter(company != "Unknown") %>%
    select(id, hosts, company, leaf_parent) %>%
    gather(key = subsidiary_level, value = company, -c(id, hosts)) %>%
    left_join(companyInfo %>% select(-c(root_parent, leaf_parent)), by = "company") %>%
    filter(!is.na(country), country != "", country != "N/A") %>% #exclude where we don't know what country is 
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
  
  write_csv(countryPrev, str_c("results/countryAnalysis/bySuperGenre/countryPrevalence", saveName, ".csv"))
}


########################END#######################
