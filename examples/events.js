/* eslint-disable no-restricted-syntax */

const fs = require('fs');
const util = require('util');
const path = require('path');

const { SimplePDFParser } = require('../lib');

// Promisifying fs.readFile so that we can use it with promises
const readFile = util.promisify(fs.readFile);

// Wrap everything in an async function so that we can use async/await
async function start() {
  // const fileBuffer = await readFile(path.join(__dirname, './pdfs/text-only.pdf'));
  const fileBuffer = await readFile(path.join(__dirname, './pdfs/images-and-formatting.pdf'));

  // Create a new parser without options
  const parser = new SimplePDFParser(fileBuffer);

  // Called with each page
  parser.on('page', (page) => {
    console.log(`Page ${page.index}:`);
    console.log('Text elements: ', page.textElements);
    console.log('Image elements:', page.imageElements);
  });

  // Called when the parsing is finished
  parser.on('done', () => {
    console.log('Parser done');
  });

  // Start the parser and wait for it to finish
  await parser.parseRaw();
}

// Start the program
start();
