library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(scales)

#0 READ IN DATA AND CREATE HELPER FUNCTIONS
#1 CALCULATE MISSING VARIABLES
#2 ANALYSE DATA

###########
#0 READ IN DATA AND CREATE HELPER FUNCTIONS
#set up data base driver and connection
drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

#Read in app information: id, title, version, hosts and genre for apps that are analysed
appsAndRefs <- dbGetQuery(con,
                      "SELECT apps.id, playstore_apps.title, app_versions.version, app_hosts.hosts, playstore_apps.genre 
	FROM app_versions
                      JOIN apps ON apps.id = app_versions.app
                      JOIN playstore_apps ON playstore_apps.id = app_versions.id
                      JOIN app_hosts ON app_hosts.id = app_versions.id
                      WHERE app_versions.analyzed = TRUE") %>%
  as.tibble() #put it in tidyverse's format

#Read in company information: mapping of hosts to companies
hostsToCompany <- dbGetQuery(con,
                             "SELECT hosts, company FROM host_domain_companies") %>%
  as.tibble()

#HELPER FUNCTIONS
#calculate modal value
modeFunc <- function(x) {
  ux <- unique(x)
  ux[which.max(tabulate(match(x, ux)))]
}

#split hosts and return unique ones in a list
splitHosts <- function(stringOfHosts) {
  stringOfHosts %>%
    str_replace_all("\\{", "") %>%
    str_replace_all("\\}", "") %>%
    str_split(",") %>%
    unlist() %>%
    unique() %>%  #make sure we're not counting duplicates
    list()
}

#split list of hosts and return count
countHosts <- function(stringOfHosts) {
  stringOfHosts %>%
    str_replace_all("\\{", "") %>%
    str_replace_all("\\}", "") %>%
    str_split(",") %>%
    unlist() %>%
    unique() %>%  #make sure we're not counting duplicates
    length()
} 

####################
#1 CALCULATE MISSING VARIABLES
#count number of external references and add to AppsAndRefs
appsAndRefs <- appsAndRefs %>%
  rowwise() %>%
  mutate(numHosts = ifelse(test = (hosts == "{}"),
                           yes = 0,
                           no = countHosts(hosts))) %>%
  ungroup()

#if desired, split hosts up into neat list and add to AppsAndRefs
appsAndRefs <- appsAndRefs %>%
  rowwise() %>%
  mutate(hostList = splitHosts(hosts)) %>%
  ungroup()

#create data frame of host names and their number of occurences
hostsAndCompanies <- appsAndRefs$hosts %>%
  str_replace_all("\\{", "") %>%
  str_replace_all("\\}", "") %>%
  str_split(",") %>%
  unlist() %>%
  table() %>%
  as.data.frame() %>%
  arrange(desc(Freq)) %>%
  mutate(pctOfApps = round(Freq / nrow(appsAndRefs) * 100, 2)) %>%
  as.tibble()

hostsAndCompanies <- rename(hostsAndCompanies, hosts = ., count = Freq)

#join company data
hostsAndCompanies <- hostsAndCompanies %>%
  left_join(hostsToCompany, by = "hosts")

#store it
write_rds(hostsAndCompanies, "~/Desktop/saveouts_DATA/hostsAndCompanies.rds")
hostsAndCompanies <- read_rds("~/Desktop/saveouts_DATA/hostsAndCompanies.rds")

#create data frame of just the known hosts
knownHosts <- hostsToCompany %>%
  filter(company != "unknown")

#create new column where the host domains are replaced by company names - WARNING: THIS IMPLEMENTATION TAKES ~6 HOURS TO RUN 
#copy hosts to replacedCompanies
appsAndRefs$replacedCompanies <- appsAndRefs$hosts
#sort knownHosts by the number of characters in the host domain
knownHosts <- knownHosts %>%
  arrange(desc(str_length(hosts)))
#for each host, replace all entries in replacedCompanies with the company name
for (i in 1:nrow(knownHosts)) {
  appsAndRefs$replacedCompanies <- str_replace_all(pattern = knownHosts[i,"hosts"], replacement = knownHosts[i,"company"], appsAndRefs$replacedCompanies, fixed = TRUE)
  print(i)
}

#if desired, put them companies in nice list of uniques for each app
appsAndRefs <- appsAndRefs %>%
  rowwise() %>%
  mutate(listCompanies = splitHosts(replacedCompanies)) %>%
  ungroup()

#save it out so we can read it in in the future instead of re-computing
write_rds(appsAndRefs, "~/Desktop/saveouts_DATA/appsAndRefs.rds")
appsAndRefs <- read_rds(path = "~/Desktop/saveouts_DATA/appsAndRefs.rds")

#2 ANALYSE
#2.1 NUMBER OF EXTERNAL REFERENCES PER APP, ACROSS ALL GENRES
#calculate stats
sumStats <- appsAndRefs %>%
  summarise(numApps = n(),
            mean = round(mean(numHosts),1),
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
write_csv(sumStats, "saveouts_RESULTS/sumStats.csv")

#plot ordinary histogram
appsAndRefs %>%
  ggplot() +
    geom_histogram(aes(numHosts)) +
    labs(x = "#external references in decompiled source code") +
  scale_y_continuous(labels = comma)

#log transformed y-axis
appsAndRefs %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) +
  labs(x = "#external references in decompiled source code",
       y = "count: LOG SCALE") +
  scale_y_log10()

#log transformed x-axis
appsAndRefs %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) + #adding 1 here to avoid excluding the ones with zero trackers
  labs(x = "#external references in decompiled source code: LOG SCALE") +
  scale_x_log10()

#log transformed both axes
appsAndRefs %>%
  ggplot() +
  geom_histogram(aes(numHosts + 1)) +
  labs(x = "#external references in decompiled source code: LOG SCALE",
       y = "count: LOG SCALE") +
  scale_y_log10() + scale_x_log10()

#2.2 NUMBER OF EXTERNAL REFERENCES PER APP, BY GENRE
appsAndRefsByGenre <- appsAndRefs %>%
  group_by(genre)

#calculate summary stats
sumStatsByGenre <- appsAndRefsByGenre %>%
  summarise(numApps = n(),
            mean = round(mean(numHosts),1),
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
write_csv(sumStatsByGenre, "saveouts_RESULTS/sumStatsByGenre.csv")

#2.3 TOP 'TRACKERS' ACROSS ALL APPS
#top host domains, aggregating total number of references
hostsAndCompanies %>% 
  filter(hosts != "") %>%
  head(100)

#top companies, aggregating total number of references
byCompany <- hostsAndCompanies %>%
  group_by(company)
summaryByCompany <- byCompany %>%
  summarise(refCount = sum(count), 
            aveRefsPerApp = round(count / nrow(appsAndRefs),2)) %>%
  arrange(desc(count))
write_csv(summaryByCompany, "saveouts_RESULTS/AveCompanyRefsPerApp.csv")
summaryByCompany %>%
  filter(!is.na(company)) %>%
  head(100) %>%
  View()

#TOP COMPANIES, IN TERMS OF NUMBER OF APPS THEY'RE PRESENT IN
#calculate number and proportion of apps each company occurs
for (i in 1:nrow(summaryByCompany)) {
  summaryByCompany$numAppsPresent[[i]] <- sum(str_detect(appsAndRefs$replacedCompanies, summaryByCompany[[i,"company"]]))
  print(i)
}
summaryByCompany <- summaryByCompany %>%
  mutate(propAppsPresent = round(numAppsPresent / nrow(appsAndRefs),2))
summaryByCompany %>%
  filter(company != "unknown") %>%
  write_csv("saveouts_RESULTS/CompanyPresenceInApps.csv")

#TRACKERS BY JURISDICTION
#check if hosts is a unique identifier
hostsToCompany %>%
  count(hosts) %>%
  filter(n > 1)
# in 163 cases it isn't - e.g this one
hostsToCompany %>%
  filter(hosts == "amos.alicdn.com" )

#TODO missing geographical information about the companies

#TODO PERCENT OF THE PLAYSTORE COVERED BY TOP 10 'TRACKERS'

#TODO find good way of comparing top hosts/companies between genres

