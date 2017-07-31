import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LoaderService } from './loader.service';
import { HttpModule } from '@angular/http';
import { AppComponent } from './app.component';
import { RefinebarComponent } from './refinebar/refinebar.component';
import { UsagetableComponent } from './usagetable/usagetable.component';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ExperimentComponent } from './experiment/experiment.component';
import { FoobarComponent } from './foobar/foobar.component';
import { ErrorComponent } from './error/error.component';
import { UsageConnectorService } from './usage-connector.service';
import { CompanybarComponent } from './companybar/companybar.component';
import { Ng2CompleterModule } from 'ng2-completer';

const appRoutes: Routes = [
  {
    path: 'experiment',
    component: ExperimentComponent,
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
  { path: '', redirectTo: '/experiment/refinebar', pathMatch: 'full' },
  { path: '**', component: ErrorComponent, data: { message: 'page not found' } }
];


@NgModule({
  declarations: [
    AppComponent,
    RefinebarComponent,
    UsagetableComponent,
    ExperimentComponent,
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
