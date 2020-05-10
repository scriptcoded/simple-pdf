import EventEmitter from 'events';
import sharp from 'sharp';
import PDFJS from 'pdfjs-dist';
import PDFJSWorker from 'pdfjs-dist/build/pdf.worker.entry';

import NodeCanvasFactory from './NodeCanvasFactory';

/**
 @typedef generatedPoint
 @type {Object}
 @property {number} x The x coordinate.
 @property {number} y The y coordinate.
 */

const DEFAULT_PARSER_OPTIONS = {
  /**
   * The minimum distance between two lines on the y-axis to consider them part
   * of separate paragraphs. This option only affects the `parse` method.
   *
   * Default: `25`.
   */
  paragraphThreshold: 25,
  /**
   * The minimum distance between two lines on the y-axis to consider them part
   * of the same line. PDFs usually suffer from issues with floating point
   * numbers. This value is used to give a little room for error. You shouldn't
   * have to change this value unless you're dealing with PDFs generated with
   * OCR or other odd PDFs.
   *
   * Default: `1`.
   */
  lineThreshold: 1,
  /**
   * Scaling applied to the PDF before extrating images. Higher value results in
   * greater image resolution, but quadratically increases rendering times.
   *
   * Default: `2`
   */
  imageScale: 2,
  /**
   * Controls whether or not to extract images. Image extraction requires
   * rendering of each page, which might take a long time depending on the size
   * of the PDF, configured `imageScale` and underlying hardware. If you don't
   * need to extract images, setting this option to `false` is recommended.
   *
   * Default: `true`
   */
  extractImages: true,
  /**
   * Controls whether or not to ignore empty text elements. Text elements are
   * considered empty if their text content contains nothing by whitespace.
   *
   * Default: `true`
   */
  ignoreEmptyText: true,
  /**
   * Controls whether or not to join paragraphs. Enabling this option will join
   * each line that's not separated by a non-text element (paragraph break or
   * image) which will effectively make each line contain a paragraph. Paragraph
   * breaks will be omitted from the final output. This option only affects the
   * `parse` method.
   *
   * Default: `false`
   */
  joinParagraphs: false,
  /**
   * Controls what format the image is exported as. Defaults to 'png'. Passed
   * directly to Sharp: https://sharp.pixelplumbing.com/api-output#toformat
   */
  imageOutputFormat: 'png',
};

/**
 * Parses a PDF file into its components and exposes them through either events
 * or promises.
 */
export default class SimplePDFParser extends EventEmitter {
  /**
   *
   * @param {Buffer} fileBuffer Buffer containing PDF file
   * @param {DEFAULT_PARSER_OPTIONS} [options]
   */
  constructor(fileBuffer, options = {}) {
    super();

    /**
     * Contains the PDF passed in through the constructor
     * @type {Buffer}
     */
    this.fileBuffer = fileBuffer;

    /**
     * Options for the parser
     * @type {DEFAULT_PARSER_OPTIONS}
     */
    this.options = {
      ...DEFAULT_PARSER_OPTIONS,
      ...options,
    };
  }

  /**
   * Parses the PDF file passed in the constructor. Returns a promise that
   * resolves with an array of all elements.
   */
  async parse() {
    const pages = await this.parseRaw();

    const elements = [];

    for (let i = 0; i < pages.length; i += 1) {
      for (let j = 0; j < pages[i].textElements.length; j += 1) {
        const element = pages[i].textElements[j];

        elements.push({
          type: 'text',
          pageIndex: i,
          y: element.y,
          items: element.items,
        });
      }

      if (this.options.extractImages) {
        for (let j = 0; j < pages[i].imageElements.length; j += 1) {
          const element = pages[i].imageElements[j];

          elements.push({
            type: 'image',
            pageIndex: i,
            y: element.y,
            imageBuffer: element.imageBuffer,
          });
        }
      }
    }

    const elementsSorted = elements
      .slice()
      .sort((a, b) => (a.pageIndex - b.pageIndex !== 0 ? a.pageIndex - b.pageIndex : a.y - b.y));

    const elementsJoined = [];

    for (let i = 0; i < elementsSorted.length; i += 1) {
      const elem = elementsSorted[i];
      const { y: _, ...elemClean } = elem;
      const lastElem = elementsSorted[i - 1];

      let deltaY = null;
      if (lastElem && lastElem.type === 'text') {
        deltaY = elem.y - lastElem.y;
        deltaY = deltaY > 0 ? deltaY : -deltaY;
      }

      if (deltaY !== null && deltaY > this.options.paragraphThreshold) {
        if (!this.options.joinParagraphs) {
          elementsJoined.push({
            type: 'paragraphBreak',
          });
        }
        elementsJoined.push(elemClean);
      } else {
        const lastJoined = elementsJoined[elementsJoined.length - 1];
        if (this.options.joinParagraphs && lastJoined && lastJoined.type === 'text') {
          if (lastJoined.items.length > 0) {
            const lastItem = lastJoined.items[lastJoined.items.length - 1];
            lastItem.text = `${lastItem.text} `;
          }

          lastJoined.items = [
            ...lastJoined.items,
            ...elemClean.items,
          ];
        } else {
          elementsJoined.push(elemClean);
        }
      }
    }

    return elementsJoined;
  }

  /**
   * Parses the PDF file passed in the constructor. Returns a promise that
   * resolves with an object containing text and image elements separately.
   */
  async parseRaw() {
    PDFJS.GlobalWorkerOptions.workerSrc = PDFJSWorker;
    const loadingTask = PDFJS.getDocument(new Uint8Array(this.fileBuffer));
    const pdf = await loadingTask.promise;

    const pagePromises = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      pagePromises.push(this.parsePage(pdf, i));
    }

    const results = await Promise.all(pagePromises);

    this.emit('done');

    return results
      .sort((a, b) => a.index - b.index)
      .map((page) => ({
        textElements: page.textElements,
        imageElements: page.imageElements,
      }));
  }

  async parsePage(pdf, pageIndex) {
    const page = await pdf.getPage(pageIndex);

    const textData = await page.getTextContent();

    const textElements = [];
    let imageElements = null;

    for (let i = 0; i < textData.items.length; i += 1) {
      const item = textData.items[i];

      let shouldParse = true;

      if (this.options.ignoreEmptyText) {
        const textContent = item.str.replace(/\u200B/, ''); // Remove zero-width spaces

        shouldParse = textContent.trim().length !== 0;
      }

      if (shouldParse) {
        const lastElem = textElements[textElements.length - 1];

        const y = page.view[3] - item.transform[5];

        let deltaY = null;
        if (lastElem) {
          deltaY = y - lastElem.y;
          deltaY = deltaY > 0 ? deltaY : -deltaY;
        }

        if (deltaY !== null && deltaY < this.options.lineThreshold) {
          lastElem.items.push({
            text: item.str,
            font: item.fontName,
          });
        } else {
          textElements.push({
            x: item.transform[4],
            y,
            items: [{
              text: item.str,
              font: item.fontName,
            }],
          });
        }
      }
    }

    if (this.options.extractImages) {
      imageElements = await this.extractPageImages(page);
    }

    const result = {
      index: pageIndex,
      textElements,
      imageElements,
    };

    this.emit('page', result);

    return result;
  }

  async extractPageImages(page) {
    const ops = await page.getOperatorList();

    /**
     * `[width, skew, skew, height, x, y]`
     */
    let lastMatrix;
    const imageRects = [];

    const pageWidth = page.view[2];
    const pageHeight = page.view[3];

    for (let i = 0; i < ops.fnArray.length; i += 1) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      switch (fn) {
        case PDFJS.OPS.transform: {
          lastMatrix = args;
          break;
        }
        case PDFJS.OPS.paintImageXObject: {
          // For the matrix see https://github.com/mozilla/pdf.js/issues/10498
          // Also, this comment
          // https://github.com/mozilla/pdf.js/issues/5643#issuecomment-496648719
          // links to a PDF reference file explaining the translation array
          // format. You can find it on page 142:
          // https://via.hypothes.is/https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/pdf_reference_archives/PDFReference.pdf#annotations:SVudloF5EemLBgPm0gmY3Q
          // Or this actually seems to be the original link:
          // https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/pdf_reference_archives/PDFReference.pdf

          const width = lastMatrix[0];
          const height = lastMatrix[3];
          const heightAbs = height > 0 ? height : -height;

          // x is always relative to the left edge
          const x = lastMatrix[4];
          // y might be relative to the top or bottom edge depending on previous
          // transformations. We later calculate `top` later to unify it.
          // y is always relative to the bottom edge of the image.
          const y = lastMatrix[5];

          // If height is negative, y is relative to the top edge.
          // If height is positive, y is relative to the bottom edge.
          // Subtract the absolute height.
          const top = (height < 0 ? y : pageHeight - y) - heightAbs;

          // Clamp the width and height so that they don't overflow the page.
          const widthClamped = (x + width) > pageWidth ? (pageWidth - x) : width;
          const heightClamped = (top + heightAbs) > pageHeight ? (pageHeight - top) : heightAbs;

          imageRects.push({
            x,
            y: top,
            width: widthClamped,
            height: heightClamped,
          });

          break;
        }
        default:
          // do nothing
      }
    }

    let images = [];

    if (imageRects.length > 0) {
      const pageImageBuffer = await this.renderPage(page);
      const pageSharp = sharp(pageImageBuffer);

      images = await Promise.all(imageRects.map(async (elem) => ({
        ...elem,
        imageBuffer: await pageSharp
          .clone()
          .extract({
            left: Math.round(elem.x * this.options.imageScale),
            top: Math.round(elem.y * this.options.imageScale),
            width: Math.round(elem.width * this.options.imageScale),
            height: Math.round(elem.height * this.options.imageScale),
          })
          .toFormat(this.options.imageOutputFormat)
          .toBuffer(),
      })));
    }

    return images;
  }

  async renderPage(page) {
    const viewport = page.getViewport({
      scale: this.options.imageScale,
    });

    const canvasFactory = new NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(
      viewport.width,
      viewport.height,
    );
    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    };

    const renderTask = page.render(renderContext);
    await renderTask.promise;

    return canvasAndContext.canvas.toBuffer();
  }
}
