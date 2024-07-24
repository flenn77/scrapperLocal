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
class ComponentiProcessor {
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
            const images = yield this.extractImages(page);
            const texts = yield this.extractTexts(page);
            const documents = yield this.extractDocuments(page);
            yield page.close();
            yield this.browser.close();
            return { images, texts, documents };
        });
    }
    extractImages(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const images = [];
            // Open the carousel
            const openCarouselSelector = '#o-carousel-product > div.o_carousel_product_outer.carousel-outer.position-relative.flex-grow-1.overflow-hidden > div > div.carousel-item.h-100.text-center.active > div > img';
            const openCarouselButton = yield page.$(openCarouselSelector);
            if (openCarouselButton) {
                yield openCarouselButton.click();
                yield page.waitForSelector('#dialog_0 > div', { visible: true, timeout: 15000 });
                // Extract all images
                const imageSelector = '#dialog_0 > div > div > div.o_wsale_image_viewer_image.position-absolute.top-0.bottom-0.start-0.end-0.align-items-center.justify-content-center.d-flex.o_with_img.overflow-hidden > div > img';
                let firstImageSrc = yield page.$eval(imageSelector, el => el.getAttribute('src'));
                let currentImageSrc = firstImageSrc;
                let nextButton;
                do {
                    const imageSrc = yield page.$eval(imageSelector, el => el.getAttribute('src'));
                    if (imageSrc) {
                        images.push({ uri: imageSrc });
                    }
                    const nextButtonSelector = '#dialog_0 > div > div > div.o_wsale_image_viewer_control.o_wsale_image_viewer_next.btn.btn-dark.position-absolute.top-0.bottom-0.end-0.align-items-center.justify-content-center.d-flex.my-auto.me-3.rounded-circle > span';
                    nextButton = yield page.$(nextButtonSelector);
                    if (nextButton) {
                        yield nextButton.click();
                        yield new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the image to load
                        currentImageSrc = yield page.$eval(imageSelector, el => el.getAttribute('src'));
                    }
                } while (nextButton && currentImageSrc !== firstImageSrc);
                // Close the carousel
                const closeCarouselSelector = '#dialog_0 > div > div > div.o_wsale_image_viewer_header.d-flex.w-100.text-white > div.d-flex.align-items-center.mb-0.px-3.h4.text-reset.cursor-pointer > span';
                const closeCarouselButton = yield page.$(closeCarouselSelector);
                if (closeCarouselButton) {
                    yield closeCarouselButton.click();
                }
            }
            return images;
        });
    }
    extractTexts(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const texts = [];
            // Description
            const descriptionButtonSelector = '#description_tab';
            const descriptionButton = yield page.$(descriptionButtonSelector);
            if (descriptionButton) {
                yield descriptionButton.click();
                const descriptionSelector = '#description_tab_pane > p';
                yield page.waitForSelector(descriptionSelector, { visible: true, timeout: 15000 });
                const description = yield page.$eval(descriptionSelector, el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                texts.push({ image: null, title: 'Description', content: description });
            }
            // Characteristics
            const characteristicsSelector = '#product_attributes_simple > table > tbody';
            const characteristicsElement = yield page.$(characteristicsSelector);
            if (characteristicsElement) {
                const rows = yield characteristicsElement.$$('tr');
                const characteristicsContent = yield Promise.all(rows.map((row) => __awaiter(this, void 0, void 0, function* () {
                    const key = yield row.$eval('b span', el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                    const value = yield row.$eval('span:nth-child(2)', el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                    return `${key}: ${value}`;
                })));
                const characteristics = characteristicsContent.join(' ');
                texts.push({ image: null, title: 'Caractéristiques', content: characteristics });
            }
            return texts.map((text) => (Object.assign(Object.assign({}, text), { title: this.sanitizeText(text.title), content: this.sanitizeText(text.content) })));
        });
    }
    extractDocuments(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const documents = [];
            const documentsButtonSelector = '#documents_tab';
            const documentsButton = yield page.$(documentsButtonSelector);
            if (documentsButton) {
                yield documentsButton.click();
                const documentSelector = '#product_documents_componenti';
                yield page.waitForSelector(documentSelector, { visible: true, timeout: 15000 });
                const titleSelector = '#print_technical_sheet > span';
                const uriSelector = '#print_technical_sheet';
                const title = yield page.$eval(titleSelector, el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                const uri = yield page.$eval(uriSelector, el => el.getAttribute('href') || '');
                documents.push({ title, uri, type: 'Unknown' });
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
                yield page.click('#cookie-accept-button'); // Modifier ce sélecteur pour correspondre au bouton d'acceptation des cookies si nécessaire
            }
            catch (error) {
                console.log('No button for cookies');
            }
        });
    }
}
// Exemple d'utilisation
(() => __awaiter(void 0, void 0, void 0, function* () {
    const processor = new ComponentiProcessor();
    const result = yield processor.execute('https://www.componenti.be/shop/pc78004-inline80tlc-16367#attr=14467,42218,43096,41592,41593,41598,41601');
    console.log('Data saved:', result);
}))();
