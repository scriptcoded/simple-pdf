const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);

const { SimplePDFParser } = require('../lib');

async function runParser(fileName, options) {
  const fileBuffer = await readFile(path.join(__dirname, './pdfs/', fileName));

  const parser = new SimplePDFParser(fileBuffer, options);

  return parser.parse();
}

test('extracts all text lines', async () => {
  const result = await runParser('images-and-formatting.pdf', {
    extractImages: false,
  });

  expect(Array.isArray(result)).toBe(true);
  expect(result.filter((item) => item.type === 'text')).toHaveLength(19);
});

test('extracts all images', async () => {
  const result = await runParser('images-and-formatting.pdf');

  expect(Array.isArray(result)).toBe(true);
  expect(result.filter((item) => item.type === 'image')).toHaveLength(2);
});

test('joins paragraphs', async () => {
  const result = await runParser('images-and-formatting.pdf', {
    extractImages: false,
    joinParagraphs: true,
  });

  expect(Array.isArray(result)).toBe(true);
  expect(result.filter((item) => item.type === 'text')).toHaveLength(5);
});

test('includes empty texts', async () => {
  const result = await runParser('images-and-formatting.pdf', {
    extractImages: false,
    ignoreEmptyText: false,
  });

  expect(Array.isArray(result)).toBe(true);
  expect(result.filter((item) => item.type === 'text')).toHaveLength(24);
});
