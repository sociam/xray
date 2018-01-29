library(RPostgreSQL)
library(tidyverse)
library(stringr)

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


# read in the manually curated list - main-toit
companyData <- read_csv("data-raw/company-metadata-v4.csv")

companySmaller <- companyData %>%
  select(company, domains, type, typetag, jurisdiction)

#these companies don't have any domain names listed?
companySmaller %>%
  filter(is.na(domains))

#and these companies have more than one entry
companySmaller %>%
  filter(!is.na(domains)) %>%
  group_by(company) %>%
  summarise(no_entries = n()) %>%
  filter(no_entries > 1)

companiesGoogleSheet <- companySmaller %>%
  mutate(company = str_to_lower(company)) %>%
  group_by(company) %>%
  arrange(company) %>%
  summarise(no_entries = n())

# read in the manually curated list - main-CHI
companyCHIData <- read_csv("data-raw/company-metadata-v4-main-chi.csv")
companyCHIDataSmaller <- companyCHIData %>%
  select(company, domains, type, typetag, jurisdiction_code)

companiesCHIData <- companyCHIDataSmaller %>%
  mutate(company = str_to_lower(company)) %>%
  group_by(company) %>%
  arrange(company) %>%
  summarise(no_entries = n())
companiesCHIData
companiesDB
anti_join(companiesCHIData, companiesDB, by="company")

# read in the company info from the data base
dbCompanyInfo <- dbGetQuery(con,
                             "SELECT * FROM company_domains") %>%
  as.tibble()

companiesDB <- dbCompanyInfo %>%
  mutate(company = str_to_lower(company)) %>%
  group_by(company) %>%
  arrange(company) %>%
  summarise(no_entries = n())

#check DB vs main-toit
no_match_GoogleSheet <- anti_join(companiesGoogleSheet, companiesDB, by="company") %>%
  select(company)
no_match_GoogleSheet %>% arrange()
write_csv(no_match_GoogleSheet, "no_match_main_toit.csv")
no_match_DB <- anti_join(companiesDB, companiesGoogleSheet, by="company") %>%
  select(company)
no_match_DB %>% arrange()
write_csv(no_match_DB, "no_match_DB.csv")


#check DB vs main-toit
no_match_main_CHI <- anti_join(companiesCHIData, companiesDB, by="company") %>%
  select(company)
no_match_main_CHI %>% arrange()
write_csv(no_match_GoogleSheet, "no_match_main_toit.csv")
no_match_DB <- anti_join(companiesDB, companiesGoogleSheet, by="company") %>%
  select(company)
no_match_DB %>% arrange()
write_csv(no_match_DB, "no_match_DB.csv")