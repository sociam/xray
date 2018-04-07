begin;

create table apps(
  id        text primary key not null, --internal; global id - each app at all will have a unique
  --id. The id here identifies the app - all the different versions of e.g. Facebook
  --will have the same
  
  versions int[] --array of app_versions.ids - e.g. the ids in app_versions for all versions of Facebook
);

create table app_versions(
  id                      serial         primary key not null, 
  app                       text references apps(id) not null, --references apps.id
  store                     text                     not null, --this will always be google play store for now
  region                    text                     not null, --the regional app store we scraped from; specified by us
  version                   text                     not null, --version number; probably from store
  screen_flags               int                             , --from manifest?
  downloaded                bool                     not null, --internal
  analyzed                  bool                     not null, --internal
  last_dl_attempt      timestamp                             , --internal
  icon                      text                             , --from app
  uses_reflect              bool                             , --indicator that it might be dodgy - a coding practice that opens dangerous backdoors
  last_analyze_attempt timestamp                             , --internal
  last_alt_checked     timestamp --scraper from https://alternativeto.net; mostly not used because most recommendations were crap; on refine is now manual curated
);

create table developers(
  id         serial primary key not null, --internal; the developers are joined up with apps in playstore_apps table
  email      text[]             not null, --app store
  name         text             not null, --app store
  store_site   text                     , 
  site         text
);

create table alt_apps( --all this is from alternativeto.net
   app_id                text             references apps(id) not null,  --this is the original app we want an alternative to
   alt_app_title         text                                 not null,
   alt_to_url            text                                 not null, --on alternativeto.net
   g_play_url            text                                         , --play store
   g_play_id             text                                         , --there's a play store id
   icon_url              text                                         , --alternativeto's icon for alternative
   official_site_url     text                                         , --
   is_scraped            bool                                 not null, --has alternative app been scraped from app store
   primary key (app_id, alt_app_title) --technical to avoid duplication
);

create table playstore_apps(  --all scraped from the google play store
  id                      int primary key references app_versions(id) not null, 
  title                  text                                         not null,
  summary                text                                                 ,
  description            text                                                 ,
  store_url              text                                         not null,
  price                  text                                         not null,
  free                   bool                                         not null,
  rating         numeric(2,1)                                                 ,
  num_reviews          bigint                                                 ,
  genre                  text                                                 ,
  family_genre           text                                                 ,
  min_installs         bigint                                                 ,
  max_installs         bigint                                                 ,
  developer               int               references developers(id) not null,
  updated                date                                         not null,
  android_ver            text                                         not null, --for which version of operating system
  content_rating         text                                                 ,
  screenshots          text[]                                                 ,
  video                  text                                                 ,
  recent_changes       text[]                                                 ,
  crawl_date             date                                         not null, --internal
  permissions          text[] --we might now have scraped this unfortunately
);

create table search_terms( --internal, storing of the actual terms we used - came from autocomplete
  search_term            text                              primary key not null,
  last_searched          date                                          not null
);

create table app_packages ( --from apps; haven't been used for anything yet
  id            int  references app_versions(id) primary key not null,
  packages   text[]                                          not null
);

create table app_perms( --from manifest
  id             int references app_versions(id) primary key not null,
  permissions text[]                                         not null
);

-- Contains the hostnames that were found in apps via analysis
create table app_hosts(
  id       int references app_versions(id) primary key not null,
  hosts text[]                                                 ,
  pis    int[] --we don't actually have this
);

--not sure what this is?
create table app_companies(
  id         int references app_versions(id) primary key not null,
  companies  text[]
);

--manually curated list
create table manual_alts(
  source_id  text not null,
  alt_id     text not null,
  primary key (source_id, alt_id) --source_id is original app; these ids are not internal, but from google play store ids
);

--companies behind hosts - max might have a json with this info from previously
create table companies(
  id             text     primary key not null,
  name           text                 not null,
  hosts         int[]                         ,
  founded        text                         ,
  acquired       text                         ,
  type         text[]                         ,
  typetag        text                         ,
  jurisdiction   text                         ,
  parent         text references companies(id),
  capital        text                         ,
  equity         text                         ,
  min_size        int                         ,
  max_size        int                         ,
  data_sources text[]                         ,
  description    text
);

create table hosts(
  hostname text     primary key not null, --should be the same as app_hosts.hosts if we have a match
  company  text references companies(id)
);

create table company_domains ( --helper data to help identify companies behind hosts by knowing which domains they're associated with
  company text not null,
  domain  text not null,
  type    text         ,
  primary key(company, domain)
);

create user explorer;
create user retriever;
create user downloader;
create user analyzer;
create user apiserv;
create user suggester;

grant insert, select on search_terms to explorer;

grant select, insert, update on apps to retriever;
grant select, insert on app_versions to retriever;
grant usage on app_versions_id_seq to retriever;
grant select, insert on playstore_apps to retriever;
grant select, update on search_terms to retriever;
grant select, insert, update on developers to retriever;
grant usage on developers_id_seq to retriever;

grant select, update on app_versions to downloader;
grant select on playstore_apps to downloader;

grant select, insert, update on apps to analyzer;
grant select, insert, update on app_versions to analyzer;
grant usage on app_versions_id_seq to analyzer;
grant select  on playstore_apps to analyzer;
grant select, insert, update on app_perms to analyzer;

grant select, insert, update on app_hosts to analyzer;
grant select on companies to analyzer;
grant select, insert, update on alt_apps to analyzer;

grant select on apps to apiserv;
grant select on app_versions to apiserv;
grant select on playstore_apps to apiserv;
grant select on developers to apiserv;
grant select on app_perms to apiserv;
grant select on app_hosts to apiserv;
grant select on companies to apiserv;
grant select on hosts to apiserv;
grant select on alt_apps to apiserv;
grant select on manual_alts to apiserv;
grant select on company_domains to apiserv;

grant select, update, insert on alt_apps to suggester;
grant select, update, insert on manual_alts to suggester;
grant select, update, insert on company_domains to suggester;
grant select, update on app_versions to suggester;
grant select on playstore_apps to suggester;

commit;