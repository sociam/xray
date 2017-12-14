library(tidyverse)

appsAndRefs <- read_rds(path = "~/Desktop/saveouts_DATA/appsAndRefs.rds") %>% select(-replacedCompanies)
hostsAndCompanies <- read_rds("~/Desktop/saveouts_DATA/hostsAndCompanies.rds")

drv <- dbDriver("PostgreSQL")
con <- dbConnect(drv, dbname = "final_test",
                 host = "localhost", port = 5432,
                 user = "ulyngs")

######HELPER FUNCTIONS#####
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

#look up company for each host name
lookupCompanies <- function(myInput) {
  result <- vector("character", length(myInput))
  for(i in 1:length(myInput)) {
    result[i] <- hostsAndCompanies %>%
      filter(hosts == myInput[[i]]) %>%
      select(company) %>%
      pull()
  }
  return(list(result))
}

######READ IN PARENNIAL INFO#######
#check which parennial apps we've actually got
fullParennials <- c("Winnie", "Life360", "Cozi", "Peanut", "OurPact", "The Wonder Weeks", "PBS Kids Video", "WebMD Baby App", "UrbanSitter")

#put the one's we've got in a vector
parennialsWeGot <- c("Cozi Family Organizer", "Peanut - Moms, Meet", "OurPact – Parental Control & Screen Time Manager", "WebMD Baby" )

#grab their metadata
parennialMetaData <- dbGetQuery(con,
                      "SELECT * FROM playstore_apps 
                      WHERE playstore_apps.title IN ('Cozi Family Organizer', 'Peanut - Moms, Meet', 'OurPact – Parental Control & Screen Time Manager', 'WebMD Baby')") %>% 
  as.tibble()

#then store their tracking info
parennialRefs <- appsAndRefs %>%
  filter(title %in% parennialsWeGot)

#split their hosts up into neat list and add to data frame
parennialRefs <- parennialRefs %>%
  rowwise() %>%
  mutate(hostList = splitHosts(hosts)) %>%
  ungroup()

#add variable where the host list is companies instead
parennialRefs <- parennialRefs %>%
  rowwise() %>%
  mutate(companyList = lookupCompanies(unlist(hostList))) %>%
  ungroup()

#add variable where it's just the unique companies
parennialRefs <- parennialRefs %>%
  rowwise() %>%
  mutate(uniqueCompanies = list(unique(unlist(companyList)))) %>%
  ungroup()

#join the two data frames
parennialEverything <- left_join(parennialMetaData, select(parennialRefs, -id, -genre))

#save it out
parennialEverything %>%
  mutate(hostList = as.character(hostList), #convert our lists into flat strings so we can write to csv
         companyList = as.character(companyList),
         uniqueCompanies = as.character(uniqueCompanies)) %>%
  write_csv("saveouts_RESULTS/parennialAppData.csv")
