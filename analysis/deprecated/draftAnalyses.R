######OLD MATCHING OF COMPANIES AND DOMAINS######
#read in companies and their domains
company_domains <- dbGetQuery(con,
                              "SELECT * FROM company_domains") %>%
  as.tibble() %>% #put it in tidyverse's data frame formae
  arrange(desc(str_length(domain)))

#WARNING: THIS TAKES A LONG TIME - IT iterates over each company domain and sets the info in the hosts list accordingly
for (i in 1:2) {
  copyOfAppsWithHost <- copyOfAppsWithHost %>%
    mutate(company = ifelse(company == "unknown",
                            replace(company, 
                                    str_detect(hosts, company_domains[[i,"domain"]]), 
                                    str_c(company_domains[[i,"company"]], ",", company_domains[[i,"type"]])
                            ),
                            company))
  print(paste(i, "out of", nrow(company_domains), "complete"))
}