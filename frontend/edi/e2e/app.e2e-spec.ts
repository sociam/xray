import { EdiPage } from './app.po';

describe('edi App', () => {
  let page: EdiPage;

  beforeEach(() => {
    page = new EdiPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
