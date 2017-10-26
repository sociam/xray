import { DciPage } from './app.po';

describe('dci App', () => {
  let page: DciPage;

  beforeEach(() => {
    page = new DciPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!!');
  });
});
