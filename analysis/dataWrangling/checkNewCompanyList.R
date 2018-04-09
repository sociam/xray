library(tidyverse)
library(jsonlite)

#PREVIOUS VERSION
companyInfoOld <- fromJSON("companyData/deprecated/company_data_list_23_2_2018_MAN_CHECKED.json") %>%
  as.tibble() %>%
  mutate(country = str_to_upper(country)) %>%
  mutate(company = str_to_title(company))

companyInfoOld <- fromJSON("companyData/deprecated/company_data_list_23_2_2018_MAN_CHECKED.json") %>%
  as.tibble() %>%
  rename(company = owner_name) %>%
  mutate(company = str_to_title(company))

companyInfoNew <- fromJSON("companyData/company_data_list_6_4_2018.json") %>%
  as.tibble() %>%
  rename(company = owner_name) %>%
  mutate(company = str_to_title(company))

companyInfoOld %>%
  anti_join(companyInfoNew, by = "company") %>%
  arrange(company) %>%
  select(company, parent, country, doms) %>%
  unnest(doms) %>%
  write_csv("oldMissingDomains.csv")

# mutate(company = str_to_title(owner_name)) %>%
#   select(company, country, root_parent) %>%
#   mutate(country = str_to_upper(country)) %>%
#   mutate(leaf_parent = ifelse(is.na(root_parent) | root_parent == "", company, root_parent)) %>% #a company is a leaf parent if it ain't got no root_parents
#   as.tibble()

#NEW VERSION
companyInfoNew <- fromJSON("company_data_list_6_4_2018.json") 
View(companyInfoNew)
#GET ALL THE ONES THAT HAVEN'T GOT ANY DOMAINS
noDomains <- companyInfoNew %>%
  as.tibble() %>%
  rowwise() %>%
  mutate(num_doms = length(doms)) %>%
  filter(num_doms == 0) %>%
  select(owner_name, country, num_doms)
noDomains
write_csv(noDomains, "noDomains.csv")

#GET ALL THE ONES THAT HAVEN'T GOT ANY COUNTRIES
noCountry <- companyInfoNew %>%
  filter(is.na(country) | country == "") %>%
  select(owner_name, country)
write_csv(noCountry, "noCountry.csv")
noCountry
companyInfoNew %>%
  as.tibble() %>%
  View()


### THIS IS THE NEW WRANGLING
companyInfoNew <- fromJSON("data/company_data_list_6_4_2018.json") %>%
  as.tibble() %>%
  select(-doms) %>%
  rename(company = owner_name) %>%
  mutate(company = str_to_title(company)) %>%
  select(company, country, root_parent) %>%
  mutate(country = str_to_upper(country)) %>%
  mutate(leaf_parent = ifelse(is.na(root_parent) | root_parent == "", company, root_parent))
