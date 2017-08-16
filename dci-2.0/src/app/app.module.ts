import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LoaderService } from './loader.service';
import { HttpModule } from '@angular/http';
import { AppComponent } from './app.component';
import { RefinebarComponent } from './refinebar/refinebar.component';
import { UsageListenerComponent } from './usage-listener/usage-listener.component';
import { UsagetableComponent } from './usagetable/usagetable.component';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { FoobarComponent } from './foobar/foobar.component';
import { ErrorComponent } from './error/error.component';
import { UsageConnectorService } from './usage-connector.service';
import { CompanybarComponent } from './companybar/companybar.component';
import { Ng2CompleterModule } from 'ng2-completer';
import { HttpClientModule } from '@angular/common/http';

import { SingleDisplayComponent } from './single-display/single-display.component';
import { TiledDisplayComponent } from './tiled-display/tiled-display.component';
import { CompareComponent } from './compare/compare.component';
import { CompanyListComponent } from './company-list/company-list.component';
import { CompareContainerComponent } from './compare-container/compare-container.component';
import { AutocompleteComponent } from './autocomplete/autocomplete.component';
import { HostUtilsService } from "app/host-utils.service";
import { AppinfoComponent } from './appinfo/appinfo.component';
import { CompanyinfoComponent } from './companyinfo/companyinfo.component';
import { FocusService } from "app/focus.service";

import { APIService } from './services/api.service';
import { APITypesService } from './services/apitypes.service';

const appRoutes: Routes = [
  {
    path: 'single',
    component: SingleDisplayComponent,
    children: [
      {
        path: 'refinebar', 
        component: UsageListenerComponent
      },
      {
        path: 'companybar',
        component: CompanybarComponent
      },
      {
        path: 'foobar',
        component: FoobarComponent
      }
    ]    
  },
  {
    path: 'alternatives/:app',
    component: CompareContainerComponent
  },  
  {
    path: 'tiled',
    component: TiledDisplayComponent,
  },  
  { path: '', redirectTo: '/single/refinebar', pathMatch: 'full' },
  { path: '**', component: ErrorComponent, data: { message: 'page not found' } }
];


@NgModule({
  declarations: [
    AppComponent,
    RefinebarComponent,
    UsagetableComponent,
    SingleDisplayComponent,
    TiledDisplayComponent,    
    FoobarComponent,
    ErrorComponent,
    CompanybarComponent,
    CompareComponent,
    CompanyListComponent,
    UsageListenerComponent,
    CompareContainerComponent,
    AutocompleteComponent,
    AppinfoComponent,
    CompanyinfoComponent
  ],
  imports: [
    HttpModule,
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: true } // <-- debugging purposes only
    ),
    Ng2CompleterModule,
    HttpClientModule,
  ],
  providers: [LoaderService, UsageConnectorService, HostUtilsService, FocusService, APIService, APITypesService],
  bootstrap: [AppComponent]
})
export class AppModule { }
