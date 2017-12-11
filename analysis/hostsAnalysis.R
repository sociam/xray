library(RPostgreSQL)
library(tidyverse)
library(stringr)
library(scales)

drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

#0 READ IN DATA
#App information: titles, hosts, and genre
appsAndRefs <- dbGetQuery(con,
                      "SELECT app_hosts.id, playstore_apps.title, app_hosts.hosts, playstore_apps.genre FROM app_hosts
	JOIN playstore_apps ON app_hosts.id = playstore_apps.id") %>% #set e.g. LIMIT 1000 when testing
  as.tibble() #there's 1,407,887 rows in full data set

#Company information: mapping of hosts to companies
hostsToCompany <- dbGetQuery(con,
                             "SELECT hosts, company, type FROM host_domain_companies") %>%
  as.tibble()

#1. HEADLINE FIGURES
#AVERAGE NUMBER OF 'TRACKERS' PER APP

#helper function to get number of hosts referenced
countHosts <- function(stringOfHosts) {
  stringOfHosts %>%
    str_replace_all("\\{", "") %>%
    str_replace_all("\\}", "") %>%
    str_split(",") %>%
    unlist() %>%
    unique() %>%  #make sure we're not counting duplicates
    length()
} 

#helper function to calculate modal value
modeFunc <- function(x) {
  ux <- unique(x)
  ux[which.max(tabulate(match(x, ux)))]
}

#count number of external references and add to dataframe
appsAndRefs <- appsAndRefs %>%
  rowwise() %>%
  mutate(numHosts = ifelse(test = (hosts == "{}"),
                                  yes = 0,
                           no = countHosts(hosts))) %>%
  ungroup()

write_rds(appsAndRefs, "saveouts_DATA/appsAndRefs.rds")
appsAndRefs <- read_rds(path = "saveouts_DATA/appsAndRefs.rds")

#calculate summary stats
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


#TOP 'TRACKERS' ACROSS ALL APPS
#create data frame of host names and their number of occurences
hostsAndCompanies <- appsAndRefs$hosts %>%
  str_replace_all("\\{", "") %>%
  str_replace_all("\\}", "") %>%
  str_split(",") %>%
  unlist() %>%
  table() %>%
  as.data.frame() %>%
  arrange(desc(Freq)) %>%
  mutate(pctOfApps = round(Freq / nrow(appsAndRefs) * 100, 2))

hostsAndCompanies <- rename(hostsAndCompanies, hosts = ., count = Freq)

#join company data
hostsAndCompanies <- hostsAndCompanies %>%
  left_join(hostsToCompany, by = "hosts")

#store it
write_rds(hostsAndCompanies, "hostsAndCompanies.rds")
hostsAndCompanies <- read_rds("saveouts_DATA/hostsAndCompanies.rds")

#have a look at the top 100
head(hostsAndCompanies, 40)

#PERCENT OF APPS W/ MORE THAN 20 'TRACKERS'
  #see summary stats

#PERCENT OF APPS W/ NO THIRD PARTY 'TRACKERS'
  #see summary stats

#TRACKERS BY JURISDICTION
#check if hosts is a unique identifier
hostsToCompany %>%
  count(hosts) %>%
  filter(n > 1)
# in 163 cases it isn't - e.g this one
hostsToCompany %>%
  filter(hosts == "amos.alicdn.com" )


#get the average number of references made to each company
byCompany <- hostsAndCompanies %>%
  group_by(company)
byCompany %>%
  summarise(count = sum(count), 
            aveRefsPerApp = round(count / nrow(appsAndRefs),2)) %>%
  arrange(desc(count)) %>%
  write_csv("saveouts_RESULTS/AveCompanyRefsPerApp.csv")

#TODO find way to map this to apps so you can e.g. say how many apps do NOT have any references to Google

#TODO missing geographical information about the companies

#TODO PERCENT OF THE PLAYSTORE COVERED BY TOP 10 'TRACKERS'


#2. AGAIN, BUT NOW BY GENRE
appsAndRefsByGenre <- appsAndRefs %>%
  group_by(genre)

#2.1 get summary stats
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

#TODO 2.2 find good way of comparing top references between genres

#2.3 PERCENT OF APPS W/ MORE THAN 20 'TRACKERS'
  #see summary stats

#2.4 PERCENT OF APPS W/ NO 'TRACKERS'
  #see summary stats





#####################DEPRECATED###########################
#COUNTING REFERENCES WERE BEFORE IN TWO STEPS
#count number of external references and add to dataframe
appsAndRefs <- appsAndRefs %>%
  rowwise() %>% #group rowwise so our custom function gets correctly applied
  mutate(numHosts = countHosts(hosts)) %>%
  ungroup()

#correct for the fact that "{}" is counted as 1 host
appsAndRefs <- appsAndRefs %>%
  mutate(numHosts = ifelse(test = (hosts == "{}"),
                                  yes = 0,
                                  no = numHosts))