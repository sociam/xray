import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LoaderService } from './loader.service';
import { HttpModule } from '@angular/http';
import { AppComponent } from './app.component';
import { RefinebarComponent } from './refinebar/refinebar.component';
import { UsagetableComponent } from './usagetable/usagetable.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    RefinebarComponent,
    UsagetableComponent
  ],
  imports: [
    HttpModule,
    BrowserModule,
    FormsModule
  ],
  providers: [LoaderService],
  bootstrap: [AppComponent]
})
export class AppModule { }
