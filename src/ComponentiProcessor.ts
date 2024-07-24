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

class ComponentiProcessor {
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

    const images = await this.extractImages(page);
    const texts = await this.extractTexts(page);
    const documents = await this.extractDocuments(page);

    await page.close();
    await this.browser.close();

    return { images, texts, documents };
  }

  private async extractImages(page: puppeteer.Page): Promise<Image[]> {
    const images: Image[] = [];

    // Open the carousel
    const openCarouselSelector = '#o-carousel-product > div.o_carousel_product_outer.carousel-outer.position-relative.flex-grow-1.overflow-hidden > div > div.carousel-item.h-100.text-center.active > div > img';
    const openCarouselButton = await page.$(openCarouselSelector);
    if (openCarouselButton) {
      await openCarouselButton.click();
      await page.waitForSelector('#dialog_0 > div', { visible: true, timeout: 15000 });

      // Extract all images
      const imageSelector = '#dialog_0 > div > div > div.o_wsale_image_viewer_image.position-absolute.top-0.bottom-0.start-0.end-0.align-items-center.justify-content-center.d-flex.o_with_img.overflow-hidden > div > img';
      let firstImageSrc = await page.$eval(imageSelector, el => el.getAttribute('src'));
      let currentImageSrc = firstImageSrc;
      let nextButton;
      do {
        const imageSrc = await page.$eval(imageSelector, el => el.getAttribute('src'));
        if (imageSrc) {
          images.push({ uri: imageSrc });
        }

        const nextButtonSelector = '#dialog_0 > div > div > div.o_wsale_image_viewer_control.o_wsale_image_viewer_next.btn.btn-dark.position-absolute.top-0.bottom-0.end-0.align-items-center.justify-content-center.d-flex.my-auto.me-3.rounded-circle > span';
        nextButton = await page.$(nextButtonSelector);
        if (nextButton) {
          await nextButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the image to load
          currentImageSrc = await page.$eval(imageSelector, el => el.getAttribute('src'));
        }
      } while (nextButton && currentImageSrc !== firstImageSrc);

      // Close the carousel
      const closeCarouselSelector = '#dialog_0 > div > div > div.o_wsale_image_viewer_header.d-flex.w-100.text-white > div.d-flex.align-items-center.mb-0.px-3.h4.text-reset.cursor-pointer > span';
      const closeCarouselButton = await page.$(closeCarouselSelector);
      if (closeCarouselButton) {
        await closeCarouselButton.click();
      }
    }

    return images;
  }

  private async extractTexts(page: puppeteer.Page): Promise<Text[]> {
    const texts: Text[] = [];

    // Description
    const descriptionButtonSelector = '#description_tab';
    const descriptionButton = await page.$(descriptionButtonSelector);
    if (descriptionButton) {
      await descriptionButton.click();
      const descriptionSelector = '#description_tab_pane > p';
      await page.waitForSelector(descriptionSelector, { visible: true, timeout: 15000 });
      const description = await page.$eval(descriptionSelector, el => el.textContent?.trim() || '');
      texts.push({ image: null, title: 'Description', content: description });
    }

    // Characteristics
    const characteristicsSelector = '#product_attributes_simple > table > tbody';
    const characteristicsElement = await page.$(characteristicsSelector);
    if (characteristicsElement) {
      const rows = await characteristicsElement.$$('tr');
      const characteristicsContent = await Promise.all(rows.map(async row => {
        const key = await row.$eval('b span', el => el.textContent?.trim() || '');
        const value = await row.$eval('span:nth-child(2)', el => el.textContent?.trim() || '');
        return `${key}: ${value}`;
      }));
      const characteristics = characteristicsContent.join(' ');
      texts.push({ image: null, title: 'Caractéristiques', content: characteristics });
    }

    return texts.map((text) => ({
      ...text,
      title: this.sanitizeText(text.title),
      content: this.sanitizeText(text.content),
    }));
  }

  private async extractDocuments(page: puppeteer.Page): Promise<Document[]> {
    const documents: Document[] = [];

    const documentsButtonSelector = '#documents_tab';
    const documentsButton = await page.$(documentsButtonSelector);
    if (documentsButton) {
      await documentsButton.click();
      const documentSelector = '#product_documents_componenti';
      await page.waitForSelector(documentSelector, { visible: true, timeout: 15000 });

      const titleSelector = '#print_technical_sheet > span';
      const uriSelector = '#print_technical_sheet';

      const title = await page.$eval(titleSelector, el => el.textContent?.trim() || '');
      const uri = await page.$eval(uriSelector, el => el.getAttribute('href') || '');

      documents.push({ title, uri, type: 'Unknown' });
    }

    return documents;
  }

  private sanitizeText(value: string): string {
    return value.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ').replace(/\t/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  private async acceptCookies(page: puppeteer.Page) {
    try {
      await page.click('#cookie-accept-button'); // Modifier ce sélecteur pour correspondre au bouton d'acceptation des cookies si nécessaire
    } catch (error) {
      console.log('No button for cookies');
    }
  }
}

// Exemple d'utilisation
(async () => {
  const processor = new ComponentiProcessor();
  const result = await processor.execute('https://www.componenti.be/shop/pc78004-inline80tlc-16367#attr=14467,42218,43096,41592,41593,41598,41601');
  console.log('Data saved:', result);
})();
