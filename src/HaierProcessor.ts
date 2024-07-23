import * as puppeteer from 'puppeteer';

interface Document {
  title: string;
  uri: string;
  type: string;
}

interface Image {
  uri: string;
}

interface Text {
  image: string | null;
  title: string;
  content: string;
}

interface ScrapperResult {
  images: Image[];
  texts: Text[];
  documents: Document[];
}

class HaierProcessor {
  private browser?: puppeteer.Browser;

  private async initBrowser() {
    this.browser = await puppeteer.launch({ headless: false });
  }

  async execute(url: string): Promise<ScrapperResult> {
    if (!this.browser) {
      await this.initBrowser();
    }

    if (!this.browser) {
      throw new Error('Browser is not initialized');
    }

    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await this.acceptCookies(page);

    const images = await this.extractImages(page);
    const texts = await this.extractTexts(page);
    const documents = await this.extractDocuments(page);

    await page.close();
    await this.browser.close();

    return { images, texts, documents };
  }

  private async extractImages(page: puppeteer.Page): Promise<Image[]> {
    const selector = '#gatsby-focus-wrapper > main > div > div.product-detail > div.container-fluid > div > div > div > div.col-left.align-self-start > div.product-detail__slider > div';
    const clickSelector = await page.$(selector);
    if (clickSelector) {
      await clickSelector.click();
      await page.waitForSelector('div.lightbox-modal', { visible: true, timeout: 15000 });
    } else {
      return [];
    }

    const imagesSelector = 'div.lightbox-modal > div > div.slick-slider.slider-zoom-img-prod.slick-initialized > div > div > div.slick-slide > div > div > picture > img';
    await page.waitForSelector(imagesSelector, { timeout: 15000 });

    const images: Image[] = await page.$$eval(imagesSelector, (nodes) =>
      nodes.map((node) => ({ uri: node.getAttribute('src') as string }))
    );

    const closeButtonSelector = 'body > div.lightbox-modal > div > div.lightbox-modal__toolbar > button';
    const closeButton = await page.$(closeButtonSelector);
    if (closeButton) {
      await closeButton.click();
    }

    return images;
  }

  private async extractTexts(page: puppeteer.Page): Promise<Text[]> {
    const buttonSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div > div > div > h4.technical-spec__title.d-none.d-md-block > button';
    const contentSelectors = [
      '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div.col-7.d-none.d-md-flex.justify-content-center.align-items-center',
      '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div.col-7.d-none > div'
    ];

    const imageSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div.col-7.d-none.d-md-flex.justify-content-center.align-items-center.flex-column > div > div > button';

    const buttons = await page.$$(buttonSelector);
    const texts: Text[] = [];

    for (const button of buttons) {
      const title = await button.evaluate(el => el.textContent?.trim() || '');
      await button.click();

      let content = '';
      let imageUrl = null;

      const imgButton = await page.$(imageSelector);
      if (imgButton) {
        try {
          await imgButton.click();
          await page.waitForSelector('div.lightbox-modal', { visible: true, timeout: 15000 });

          const imagesSelector = 'div.lightbox-modal > div > div.slick-slider.slider-zoom-img-prod.slick-initialized > div > div > div.slick-slide > div > div > picture > img';
          await page.waitForSelector(imagesSelector, { timeout: 15000 });

          const images: Image[] = await page.$$eval(imagesSelector, (nodes) =>
            nodes.map((node) => ({ uri: node.getAttribute('src') as string }))
          );

          if (images.length > 0) {
            imageUrl = images[0].uri;
          }

          const closeButtonSelector = 'body > div.lightbox-modal > div > div.lightbox-modal__toolbar > button';
          const closeButton = await page.$(closeButtonSelector);
          if (closeButton) {
            await closeButton.click();
          }

        } catch (error) {
          console.error('Error clicking image button:', error);
        }
      }

      for (const contentSelector of contentSelectors) {
        const element = await page.$(contentSelector);
        if (element) {
          const rows = await element.$$('.technical-spec__row');
          const sectionContent = await Promise.all(rows.map(async row => {
            const key = await row.$eval('.col-md-8', el => el.textContent?.trim() || '');
            const value = await row.$eval('.col-md-4', el => el.textContent?.trim() || '');
            return `${key} ${value}`;
          }));
          content = sectionContent.join(' ');
          break;
        }
      }

      texts.push({ image: imageUrl, title, content });

      await button.click();
    }

    return texts.map((text) => ({
      ...text,
      title: this.sanitizeText(text.title),
      content: this.sanitizeText(text.content),
    }));
  }

  private async extractDocuments(page: puppeteer.Page): Promise<Document[]> {
    const linkSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div > div > ul > li > a';
    const buttonSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div > div > ul > li > button';

    const links = await page.$$(linkSelector);
    const buttons = await page.$$(buttonSelector);
    const documents: Document[] = [];

    for (const link of links) {
      const title = await link.evaluate(el => el.textContent?.trim() || '');
      const uri = await link.evaluate(el => el.getAttribute('href') || '');
      documents.push({ title, uri, type: 'Unknown' });
    }

    for (const button of buttons) {
      const title = await button.evaluate(el => el.textContent?.trim() || '');

      const [newPage] = await Promise.all([
        new Promise<puppeteer.Page | null>(resolve => page.once('popup', resolve)),
        button.click(),
      ]);

      if (newPage) {
        const newUrl = newPage.url();
        await newPage.close();
        documents.push({ title, uri: newUrl, type: 'Unknown' });
      }
    }

    return documents;
  }

  private sanitizeText(value: string): string {
    return value.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ').replace(/\t/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  private async acceptCookies(page: puppeteer.Page) {
    try {
      await page.click('#onetrust-accept-btn-handler');
    } catch (error) {
      console.log('No button for cookies');
    }
  }
}

(async () => {
  const processor = new HaierProcessor();
  const result = await processor.execute('https://www.haier-europe.com/fr_FR/preparateurs-de-boissons/37800001/hmb5a-011/');
  console.log('Data saved:', result);
})();
