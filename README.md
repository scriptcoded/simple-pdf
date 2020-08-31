# simple-pdf

[![npm](https://img.shields.io/npm/v/simple-pdf)](https://www.npmjs.com/package/simple-pdf)
[![Tests](https://github.com/scriptcoded/simple-pdf/workflows/Tests/badge.svg?branch=master)](https://github.com/scriptcoded/simple-pdf/actions?query=workflow%3ATests+branch%3Amaster)
[![david-dm](https://david-dm.org/scriptcoded/simple-pdf.svg)](https://david-dm.org/scriptcoded/simple-pdf)

`simple-pdf` aims to be a simple drop-in module for extracting text and images
from PDF files. It exposes a promise-based and an event-based API.

## Table of contents
- [Features](#features)
- [Reasons not to use this library](#reasons-not-to-use-this-library)
- [Minimal example](#minimal-example)
- [Installation](#installation)
- [Docs](#docs)
  - [Options](#options)
  - [Basic parsing](#basic-parsing)
  - [Advanced parsing](#advanced-parsing)
- [Tests](#tests)
- [Contributing](#contributing)
- [License](#license)

## Features

- Extracts both text and images
- Handles most image encodings

## Reasons not to use this library

Let's be real. This might not be the library for you. Here are a few reasons why.

- **Slow with images** - Images can be embedded in a PDF in many different ways. To ensure that all types of images can be extracted we render the whole PDF and then use [sharp](https://github.com/lovell/sharp) to extract the images from the rendered page. This adds extra processing time for pages that contains images (provided that you don't disable image extraction).
- **New to the game** - This library is brand new and hasn't been battle tested yet. If you're looking for a reliable solution, this library might not be the best choice for you.
- **No automated testing** - Though I'm working on this 🙃

## Examples

**Minimal example:**

```javascript
const fs = require('fs')
const { SimplePDFParser } = require('simple-pdf')

const fileBuffer = fs.readFileSync('somefile.pdf')

const parser = new SimplePDFParser(fileBuffer)

parser.parse().then((result) => {
  console.log(result)
})
```

More examples can be found in the `examples` directory and can be run with the following commands:

```bash
npm run example:events
npm run example:promises
```

## Installation

```bash
npm i simple-pdf
```

## Docs

The only exposed interface is the `SimplePDFParser` class. It takes a `Buffer` containing a PDF file as well as an optional options object.

```javascript
new SimplePDFParser(fileBuffer, {
  // options
})
```

### Options
|Option|Value type|Default value|Description|
|-|-|-|-|
|`paragraphThreshold`|integer|`25`|The minimum distance between two lines on the y-axis to consider them part of separate paragraphs. This option only affects the `parse` method.
|`lineThreshold`|integer|`1`|The minimum distance between two lines on the y-axis to consider them part of the same line. PDFs usually suffer from issues with floating point numbers. This value is used to give a little room for error. You shouldn't have to change this value unless you're dealing with PDFs generated with OCR or other odd PDFs.
|`imageScale`|integer|`2`|Scaling applied to the PDF before extrating images. Higher value results in greater image resolution, but quadratically increases rendering times.
|`extractImages`|boolean|`true`|Controls whether or not to extract images. Image extraction requires rendering of each page, which might take a long time depending on the size of the PDF, configured `imageScale` and underlying hardware. If you don't need to extract images, setting this option to `false` is recommended.
|`ignoreEmptyText`|boolean|`true`|Controls whether or not to ignore empty text elements. Text elements are considered empty if their text content contains nothing by whitespace.
|`joinParagraphs`|boolean|`false`|Controls whether or not to join paragraphs. Enabling this option will join each line that's not separated by a non-text element (paragraph break or image) which will effectively make each line contain a paragraph. Paragraph breaks will be omitted from the final output. This option only affects the `parse` method.
|`imageOutputFormat`|string|`png`|Controls what format the image is exported as. Defaults to 'png'. Passed directly to Sharp: https://sharp.pixelplumbing.com/api-output#toformat

### Basic parsing

This is probaly the easiest way to use this library. It parses all pages in parallel and returns the result when finished. Paragraphs and lines are automatically joined based on the options passed to the constructor.

*Example:*
```javascript
const parser = new SimplePDFParser(fileBuffer)

const result = await parser.parse()
```

*Result:*
```javascript
[
  {
    "type": "text",
    "pageIndex": 0,
    "items": [
      {
        "text": "Lorem ipsum",
        "font": "g_d0_f1"
      }
    ]
  },
  {
    "type": "image",
    "pageIndex": 0,
    "imageBuffer": Buffer
  }
]
```

### Advanced parsing

If you need more granuar control of the resulting data structure you might want to use the advanced parsing. You can choose to either just await the result or use the events to process each page as it is finished parsing. Note that pages are not guaranteed to be returned in order.

*Example:*
```javascript
const parser = new SimplePDFParser(fileBuffer)

// Called with each page
parser.on('page', (page) => {
  console.log(`Page ${page.index}:`)
  console.log('Text elements: ', page.textElements)
  console.log('Image elements:', page.imageElements)
})

// Called when the parsing is finished
parser.on('done', () => {
  console.log('Parser done')
})

// This must be run even if you just use the events API, but then you may ignore the return value
const result = await parser.parseRaw()
```

*Result (each page):*

```javascript
{
  index: 0, // Page index
  textElements: [{
    x: 123.456,
    y: 654.321,
    items: [{
      text: 'Lorem ipsum',
      font: 'g_d0_f1'
    }]
  }],
  imageElements: [{
    x: 4.2,
    y: 83.11,
    width: 120,
    height: 80,
    imageBuffer: Buffer
  }]
}
```

## Roadmap

More of a todo, but let's call it a roadmap

- [ ] Tests
  - [ ] Better coverage
  - [ ] Windows - Something is wrong either with the library or the tests (https://github.com/scriptcoded/simple-pdf/runs/1048499489)
- [ ] Make a logo (everyone likes  a logo)
- [ ] Rewrite codebase in TypeScript
- [ ] Improve image extraction
- [ ] Set up automatic CI/CD pipeline for NPM deployment
- [ ] Simplify the API

## Tests

Tests can be run with with the following commands:
```bash
npm run build
npm run test
```

## Contributing

Contributions and PRs are very welcome! PRs should go towards the `develop` branch.

We use the [Airbnb style guide](https://github.com/airbnb/javascript). Please
run ESLint before committing any changes:
```bash
npx eslint src
npx eslint src --fix
```

## License

This project is licensed under the MIT license.
