#####SELECT FAMILY SUBSET########
fam_appsWithHostsAndCompaniesLong <- appsWithHostsAndCompaniesLong %>%
  left_join(appInfo, by = "id") %>%
  filter(!is.na(family_genre)) %>%
  select(id, hosts, company)

fam_appsWithNoHosts <- appsWithNoHosts %>%
  left_join(appInfo, by = "id") %>%
  filter(!is.na(family_genre)) %>%
  select(id, numHosts)

fam_numAnalysed <- nrow(fam_appsWithHostsAndCompaniesLong %>% distinct(id)) + nrow(fam_appsWithNoHosts %>% distinct(id))


##### 1 SUMMARY STATS ACROSS GENRES #####
#-----1.1: SUMMARY OF HOST REFERENCES THAT ARE TO KNOWN TRACKERS
#count number of numbers of host references in apps that refer to companies on our list of trackers
fam_hostCountsInAppsWithKnownTrackers <- fam_appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(id) %>%
  summarise(numHosts = n()) %>%
  arrange(desc(numHosts))

#get apps that had hosts references but weren't on our list of trackers - set these to 0 host refs
fam_appsWithHostsButNoKnownTrackers <- fam_appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(fam_hostCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numHosts = 0)

#then add non-included apps to count properly
fam_countKnownTrackers <- fam_hostCountsInAppsWithKnownTrackers %>%
  rbind(fam_appsWithNoHosts) %>% #add the apps with no host refs at all
  rbind(fam_appsWithHostsButNoKnownTrackers) #add the apps with no hosts that are known trackers

#summarise the numbers of known trackers
fam_summaryKnownTrackers <- fam_countKnownTrackers %>%
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
write_csv(summaryKnownTrackers, "saveoutputs_family_RESULTS/fam_summaryKnownTrackers.csv")

#draw Lorenz curve and get Gini coefficient
plot(Lc(fam_countKnownTrackers$numHosts), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of tracker references")
ineq(fam_countKnownTrackers$numHosts, type='Gini')

#what number of hosts captures 99% of the distribution?
quantile(fam_countKnownTrackers$numHosts, .9999)

#------MAKE CHARTS-----
#plot ordinary histogram
fam_countKnownTrackers %>%
  filter(numHosts < 70) %>%
  ggplot() +
  geom_histogram(aes(numHosts), bins = 30) +
  labs(x = "Number of references to tracker domains", y = "Number of apps") +
  scale_y_continuous(labels = comma)
ggsave("plots/family/fam_histRefsTrackerDomains.png",width=5, height=4, dpi=600)

#log transformed y-axis
fam_countKnownTrackers %>%
  filter(numHosts < 70) %>%
  ggplot() +
  geom_histogram(aes(numHosts), bins = 30) +
  labs(x = "#known trackers in decompiled source code",
       y = "app count: LOG SCALE") +
  scale_y_log10()
ggsave("plots/family/fam_histKnownTrackersLOGY.png",width=5, height=4, dpi=600)

#log transformed x-axis
fam_countKnownTrackers %>%
  filter(numHosts < 70) %>%
  ggplot() +
  geom_histogram(aes(numHosts + .01)) + #adding here to not exclude those with zero trackers
  labs(x = "#known trackers in decompiled source code: LOG SCALE", y = "app count") +
  scale_x_log10()
ggsave("plots/family/fam_histKnownTrackersLOGX.png",width=5, height=4, dpi=600)

#log transformed both axes
fam_countKnownTrackers %>%
  filter(numHosts < 70) %>%
  ggplot() +
  geom_histogram(aes(numHosts + .01), bins = 30) +
  labs(x = "#known trackers in decompiled source code: LOG SCALE",
       y = "app count: LOG SCALE") +
  scale_y_log10() + scale_x_log10()
ggsave("plots/family/fam_histKnownTrackersLOGBOTH.png",width=5, height=4, dpi=600)


####1.2 WHAT ARE THE MOST POPULAR HOST REFERENCES?####
#creat short mapping from hostsToCompany
fam_hostsToCompany <- fam_appsWithHostsAndCompaniesLong %>%
  select(-id) %>%
  distinct(hosts, company)

#create summary of known trackers and save out top 100
fam_knownTrackersInfo <- fam_appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(hosts) %>%
  summarise(numApps = n(),
            pctOfApps = round((numApps/fam_numAnalysed)*100,2)) %>%
  left_join(hostsToCompany, by = "hosts") %>%
  left_join(companyInfo, by = "company") %>%
  arrange(desc(numApps))

head(fam_knownTrackersInfo,100) %>%
  write_csv("saveoutputs_family_RESULTS/top100KnownTrackersInfo.csv")

#create summary of unknown hosts and save out top 100
fam_unknownHostsInfo <- fam_appsWithHostsAndCompaniesLong %>%
  filter(company == "Unknown") %>%
  group_by(hosts) %>%
  summarise(refCount = n(),
            propOfApps = refCount/fam_numAnalysed %>% round(2)) %>%
  arrange(desc(refCount))

#save out top 100
head(unknownHostsInfo, 100) %>%
  write_csv("saveoutputs_family_RESULTS/top100UnknownHosts.csv")

####1.3 HOW MANY DIFFERENT COMPANIES (AT THE LOWEST LEVEL) DO APPS REFER TO?####
#count number of numbers of host references in apps that refer to companies on our list of trackers
fam_companyCountsInAppsWithKnownTrackers <- fam_appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  group_by(id) %>%
  distinct(company) %>%
  summarise(numCompanies = n()) %>%
  arrange(desc(numCompanies))

#count how many apps had hosts references but weren't on our list of trackers - set these to 0 companies
fam_appsWithHostsButNoKnownCompanies <- fam_appsWithHostsAndCompaniesLong %>%
  distinct(id) %>%
  anti_join(fam_companyCountsInAppsWithKnownTrackers, by = "id") %>%
  mutate(numCompanies = 0)

#then put all of these in same dataframe to count properly
fam_countCompanyRefs <- fam_companyCountsInAppsWithKnownTrackers %>%
  rbind(fam_appsWithNoHosts %>% mutate(numCompanies = 0) %>% select(id, numCompanies)) %>% #add the apps with no host refs at all
  rbind(fam_appsWithHostsButNoKnownCompanies) #add the apps with no hosts that are known trackers

fam_countCompanyRefs <- fam_countCompanyRefs %>%
  mutate(is_family = 1, 
         super_genre = "Family")

write_csv(fam_countCompanyRefs, "saveouts_RESULTS/fam_countCompanyRefs")


#summarise the numbers of known trackers
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
  select(-numMoreThan10, -noRefs)
fam_summaryCompanyCount
write_csv(summaryCompanyCount, "saveoutputs_family_RESULTS/summaryCompanyCount.csv")

#draw Lorenz curve and get Gini coefficient
plot(Lc(countCompanyRefs$numCompanies), col = 'red', lwd=2, xlab = "Cumulative proportion of apps",
     ylab = "Cumulative proportion of company references")
ineq(countCompanyRefs$numCompanies, type='Gini')

#plot ordinary histogram
countCompanyRefs %>%
  ggplot() +
  geom_histogram(aes(numCompanies), bins = 30) +
  labs(x = "Number of companies referred to", y = "Number of apps") +
  scale_y_continuous(labels = comma)
ggsave("plots/family/histNumCompaniesReferred.png",width=5, height=4, dpi=600)

#break this down by the proportion of apps that a company is in
propAppsWithTrackingCompanyRefs <- fam_appsWithHostsAndCompaniesLong %>%
  group_by(id) %>%
  distinct(company) %>% #exclude the distinct refs within each group
  ungroup() %>%
  filter(company != "Unknown") %>%
  count(company) %>% #then count how many times a company occurs
  mutate(pctOfApps = round((n / fam_numAnalysed)*100,2)) %>%
  arrange(desc(n)) %>%
  left_join(companyInfo, by = "company")

write_csv(propAppsWithTrackingCompanyRefs, "saveoutputs_family_RESULTS/propAppsWithTrackingCompanyRefs.csv")

#break down the coverage of companies by ultimate owners
prevalenceOfRootCompanies <- fam_appsWithHostsAndCompaniesLong %>%
  filter(company != "Unknown") %>%
  left_join(companyInfo, by = "company") %>%
  distinct(id, leaf_parent) %>%
  count(leaf_parent) %>%
  mutate(pctOfApps = round((n / fam_numAnalysed)*100,2)) %>%
  arrange(desc(n))

write_csv("saveoutputs_family_RESULTS/coverageOfRootCompanies.csv")

#create combined table
prevalenceOwnersAndSubsidiaries <- prevalenceOfRootCompanies %>%
  select(-n) %>%
  left_join(propAppsWithTrackingCompanyRefs, by = "leaf_parent") %>%
  select(-(c(n, root_parent)))

write_csv(prevalenceOwnersAndSubsidiaries, "saveoutputs_family_RESULTS/prevalenceOwnersAndSubsidiaries.csv")

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

######get prevalence of companies + root companies by super genre#######
#get all the apps we've analysed, including the ones with zero trackers
allAppsWithHostsAndGenre <- fam_appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(companyInfo, by = "company") %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre")

#get the number of apps within each super genre
numAppsBySuperGenre <- fam_appsWithHostsAndCompaniesLong %>%
  bind_rows(appsWithNoHosts) %>%
  left_join(appInfo, by = "id") %>%
  left_join(genreGrouping, by = "genre") %>%
  group_by(super_genre) %>%
  distinct(id) %>%
  summarise(numApps = n())
