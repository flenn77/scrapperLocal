"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = __importStar(require("puppeteer"));
class HaierProcessor {
    initBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser = yield puppeteer.launch({ headless: false });
        });
    }
    execute(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.browser) {
                yield this.initBrowser();
            }
            if (!this.browser) {
                throw new Error('Browser is not initialized');
            }
            const page = yield this.browser.newPage();
            yield page.goto(url, { waitUntil: 'networkidle2' });
            yield this.acceptCookies(page);
            const images = yield this.extractImages(page);
            const texts = yield this.extractTexts(page);
            const documents = yield this.extractDocuments(page);
            yield page.close();
            yield this.browser.close();
            const baseUrl = 'https://www.haier-europe.com';
            images.forEach(image => image.uri = baseUrl + image.uri);
            texts.forEach(text => {
                if (text.image) {
                    text.image = baseUrl + text.image;
                }
            });
            return { images, texts, documents };
        });
    }
    extractImages(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const selector = '#gatsby-focus-wrapper > main > div > div.product-detail > div.container-fluid > div > div > div > div.col-left.align-self-start > div.product-detail__slider > div';
            const clickSelector = yield page.$(selector);
            if (clickSelector) {
                yield clickSelector.click();
                yield page.waitForSelector('div.lightbox-modal', { visible: true, timeout: 15000 });
            }
            else {
                return [];
            }
            const imagesSelector = 'div.lightbox-modal > div > div.slick-slider.slider-zoom-img-prod.slick-initialized > div > div > div.slick-slide > div > div > picture > img';
            yield page.waitForSelector(imagesSelector, { timeout: 15000 });
            const images = yield page.$$eval(imagesSelector, (nodes) => nodes.map((node) => ({ uri: node.getAttribute('src') })));
            const closeButtonSelector = 'body > div.lightbox-modal > div > div.lightbox-modal__toolbar > button';
            const closeButton = yield page.$(closeButtonSelector);
            if (closeButton) {
                yield closeButton.click();
            }
            return images;
        });
    }
    extractTexts(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const buttonSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div > div > div > h4.technical-spec__title.d-none.d-md-block > button';
            const contentSelectors = [
                '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div.col-7.d-none.d-md-flex.justify-content-center.align-items-center',
                '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div.col-7.d-none > div'
            ];
            const imageSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div.col-7.d-none.d-md-flex.justify-content-center.align-items-center.flex-column > div > div > button';
            const buttons = yield page.$$(buttonSelector);
            const texts = [];
            for (const button of buttons) {
                const title = yield button.evaluate(el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                yield button.click();
                let content = '';
                let imageUrl = null;
                const imgButton = yield page.$(imageSelector);
                if (imgButton) {
                    try {
                        yield imgButton.click();
                        yield page.waitForSelector('div.lightbox-modal', { visible: true, timeout: 15000 });
                        const imagesSelector = 'div.lightbox-modal > div > div.slick-slider.slider-zoom-img-prod.slick-initialized > div > div > div.slick-slide > div > div > picture > img';
                        yield page.waitForSelector(imagesSelector, { timeout: 15000 });
                        const images = yield page.$$eval(imagesSelector, (nodes) => nodes.map((node) => ({ uri: node.getAttribute('src') })));
                        if (images.length > 0) {
                            imageUrl = images[0].uri;
                        }
                        const closeButtonSelector = 'body > div.lightbox-modal > div > div.lightbox-modal__toolbar > button';
                        const closeButton = yield page.$(closeButtonSelector);
                        if (closeButton) {
                            yield closeButton.click();
                        }
                    }
                    catch (error) {
                        console.error('Error clicking image button:', error);
                    }
                }
                for (const contentSelector of contentSelectors) {
                    const element = yield page.$(contentSelector);
                    if (element) {
                        const rows = yield element.$$('.technical-spec__row');
                        const sectionContent = yield Promise.all(rows.map((row) => __awaiter(this, void 0, void 0, function* () {
                            const key = yield row.$eval('.col-md-8', el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                            const value = yield row.$eval('.col-md-4', el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                            return `${key} ${value}`;
                        })));
                        content = sectionContent.join(' ');
                        break;
                    }
                }
                texts.push({ image: imageUrl, title, content });
                yield button.click();
            }
            return texts.map((text) => (Object.assign(Object.assign({}, text), { title: this.sanitizeText(text.title), content: this.sanitizeText(text.content) })));
        });
    }
    extractDocuments(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const linkSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div > div > ul > li > a';
            const buttonSelector = '#gatsby-focus-wrapper > main > div > div.product-detail > section > div > div > div > div > div > ul > li > button';
            const links = yield page.$$(linkSelector);
            const buttons = yield page.$$(buttonSelector);
            const documents = [];
            for (const link of links) {
                const title = yield link.evaluate(el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                const uri = yield link.evaluate(el => el.getAttribute('href') || '');
                documents.push({ title, uri, type: 'Unknown' });
            }
            for (const button of buttons) {
                const title = yield button.evaluate(el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                const [newPage] = yield Promise.all([
                    new Promise(resolve => page.once('popup', resolve)),
                    button.click(),
                ]);
                if (newPage) {
                    const newUrl = newPage.url();
                    yield newPage.close();
                    documents.push({ title, uri: newUrl, type: 'Unknown' });
                }
            }
            return documents;
        });
    }
    sanitizeText(value) {
        return value.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ').replace(/\t/g, '').replace(/\s{2,}/g, ' ').trim();
    }
    acceptCookies(page) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield page.click('#onetrust-accept-btn-handler');
            }
            catch (error) {
                console.log('No button for cookies');
            }
        });
    }
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const processor = new HaierProcessor();
    const result = yield processor.execute('https://www.haier-europe.com/fr_FR/preparateurs-de-boissons/37800001/hmb5a-011/');
    console.log('Data saved:', result);
}))();
