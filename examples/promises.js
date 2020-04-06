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

  // Create a new parser with joinParagraphs enabled
  const parser = new SimplePDFParser(fileBuffer, {
    joinParagraphs: true,
  });

  // Run the parser
  const result = await parser.parse();

  // Print each line
  for (const line of result) {
    // If it's a text line, print it. Else, print the type.
    if (line.type === 'text') {
      console.log(line.items.map((item) => item.text).join(''));
    } else {
      console.log(`[${line.type}]`);
    }
  }
}

// Start the program
start();
