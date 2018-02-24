library(tidyverse)
library(stringr)
library(jsonlite)
library(scales)

#read in company info
companyInfo_vOld <- fromJSON("data-raw/combo_str_parents2.json") %>%
  as.tibble

companyInfo_old <- fromJSON("data-raw/company_data_list_14_2_2018.json") %>%
  as.tibble %>%
  rename(domains = doms)

companyInfo <- fromJSON("data-raw/company_data_list_23_2_2018_MAN_CHECKED.json") %>%
  as.tibble() %>%
  rename(domains = doms)

#unnest hosts in company info and arrange by length, so that we start with the longest domain names when doing the mapping
company_domains <- companyInfo %>%
  select(owner_name, domains) %>%
  unnest(domains) %>%
  filter(domains != "") %>% #exclude the ones with no domains
  arrange(desc(str_length(domains)))

#add column where domain is its corresponding regular expression
company_domains <- company_domains %>%
  mutate(regex = str_replace(domains, "\\.", "\\\\.")) %>% #make the dot into a regex
  mutate(regex = str_c("(^|\\.)", regex, "([^ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\\.]?)")) #domain either starts here or is preceded by dot; does not end in alphabetic character or dot

#read in appsWithHosts
appsWithHostsLong <- read_csv("~/Desktop/data-processed/appsWithHostsLongFormat.csv")
appsWithHostsAndCompanyLong <- appsWithHostsLong %>%
  mutate(company = "unknown")

#then do the matching
for (i in 1:nrow(company_domains)) {
  print(paste("checking domain", company_domains[[i,"domains"]], "with regex", company_domains[[i,"regex"]]))
  #print(company_domains[[i,"domains"]] %in% copyOfAppsWithHost$hosts)
  #print(table(str_detect(copyOfAppsWithHost$hosts, company_domains[[i,"domains"]])))
  appsWithHostsAndCompanyLong <- appsWithHostsAndCompanyLong %>%
    mutate(company = ifelse(company == "unknown",
                            replace(company, 
                                    str_detect(hosts, company_domains[[i,"regex"]]), 
                                    company_domains[[i,"owner_name"]]
                            ),
                            company))
  print(paste(i, "out of", nrow(company_domains), "complete"))
}

write_csv(appsWithHostsAndCompanyLong, "~/Desktop/data-processed/appsWithHostsAndCompanyLong.csv")

###########TESTING
#test of new regex
x <- c("g.cn", ".g.cn", ".g,cnb", ".g.cna", "big.cn", "big.cna", "g.cn.com")
str_view(x, "(^|\\.)g.cn([^ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\\.]?)")

regex = str_c("(^|\\.)", regex, "($|\\.|/)") #old regex: specified that domain either ends or is followed by dot or forward slash

