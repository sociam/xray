import { Injectable } from '@angular/core';

/**
 * AppStub represents the app information returned from the API when
 * the 'isFull' flag is set to false.
 * title - Title of the app the stub is for
 * appID - ID of the app that the stub is for
 */
export interface AppStub {
  title: string;
  appID: string;
}

/**
 * Installs represents the range of install that an app may have.
 * The install data scraped from google proviedes a max and a min
 * amount
 * min - The minimum amount of installs that a specific app could have
 * max - The maximum amount of installs that a specific app could have
 */
export interface Installs {
  min: number;
  max: number;
}

/**
 * StoreInfo is all of the information that could be scraped from
 * an app's google playstore a page. This information is returned
 * from the xray API when the 'isFull' flag is set to true.
 */
export interface StoreInfo {
  title: string;
  summary: string;
  description: string;
  storeURL: string;
  price: string;
  free: boolean;
  rating: string;
  numReviews: number;
  genre: string;
  familyGenre:string;
  installs: Installs;
  developer: number;
  updated: string;
  androidVer: string;
  contentRating: string;
  screenshots: string[];
  video: string;
  recentChanges: string[];
  crawlDate: string;
  permissions: string[];

}

export interface Developer {
  emails: string[];
  name: string;
  storeSite: string;
  site: string;
}

export interface FullApp {
  id: string;
  app: string;
  store: string;
  region: string;
  ver: string;
  screenFlags: number;
  storeinfo: StoreInfo;
  icon: string;
  developer: Developer;
  hosts: string[];
  perms: string[];
  packages: string[];
}

@Injectable()
export class APITypesService {

  constructor() { }

}
