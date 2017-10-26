import { TestBed, inject, async } from '@angular/core/testing';
import { HttpModule } from '@angular/http';
import { LoaderService } from './loader.service';
import { AppComponent } from './app.component';

describe('LoaderService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpModule],
      providers: [LoaderService]
    });
  });

  it('should be created', inject([LoaderService], (service: LoaderService) => {
    expect(service).toBeTruthy();
  }));
  it('should load host2company data', async(() => {
    let service: LoaderService = TestBed.get(LoaderService);
    service.getHostToCompany().then((h2c: { [host: string]: string }) => {
      console.log('h2c ', h2c);
      expect(h2c).toBeDefined();
    });
  }));
  it('should load company data', async(() => {
    let service = TestBed.get(LoaderService);
    service.getCompanyInfo().then((i2c) => {
      expect(i2c).toBeDefined();
    });
  }));
  it('should know google', async(() => {
    let service = TestBed.get(LoaderService);
    service.getCompanyInfo().then((i2c) => {
      expect(i2c['Google']).toBeDefined();
    });
  }));
  it('should have a name for google that is google', async(() => {
    let service = TestBed.get(LoaderService);
    service.getCompanyInfo().then((i2c) => {
      expect(i2c['Google'].company).toBe('Google'); 
    });
  }));    
  it('should have a description for google', async(() => {
    let service = TestBed.get(LoaderService);
    service.getCompanyInfo().then((i2c) => {
      expect(i2c['Google'].description).toBeDefined(); 
    });
  }));
  


  // it('should load company data', (done: () => any) => {
  //   console.log('done ', done);
  //   inject([LoaderService], (service: LoaderService) => {
  //     service.getCompanyInfo().then((i2c) => {
  //       console.log('i2c ', i2c);
  //       expect(i2c).toBeDefined();
  //       // expect(i2c['Google']).toBeDefined();
  //       // expect(i2c['Google'].company).toBe('Google'); 
  //       console.log(i2c['Google'].description);
  //       done();
  //     }).catch((e) => {
  //       console.log('error ', e);
  //   });
  // });
  // });
});
