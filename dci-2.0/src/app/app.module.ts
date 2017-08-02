import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LoaderService } from './loader.service';
import { HttpModule } from '@angular/http';
import { AppComponent } from './app.component';
import { RefinebarComponent } from './refinebar/refinebar.component';
import { UsagetableComponent } from './usagetable/usagetable.component';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { FoobarComponent } from './foobar/foobar.component';
import { ErrorComponent } from './error/error.component';
import { UsageConnectorService } from './usage-connector.service';
import { CompanybarComponent } from './companybar/companybar.component';
import { Ng2CompleterModule } from 'ng2-completer';

import { SingleDisplayComponent } from './single-display/single-display.component';
import { TiledDisplayComponent } from './tiled-display/tiled-display.component';

const appRoutes: Routes = [
  {
    path: 'single',
    component: SingleDisplayComponent,
    children: [
      {
        path: 'refinebar', 
        component: RefinebarComponent
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
    path: 'tiled',
    component: TiledDisplayComponent,
  },  
  { path: '', redirectTo: '/experiment/refinebar', pathMatch: 'full' },
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
    CompanybarComponent
  ],
  imports: [
    HttpModule,
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(
      appRoutes,
      { enableTracing: true } // <-- debugging purposes only
    ),
    Ng2CompleterModule
  ],
  providers: [LoaderService, UsageConnectorService],
  bootstrap: [AppComponent]
})
export class AppModule { }
