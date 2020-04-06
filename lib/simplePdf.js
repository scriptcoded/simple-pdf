"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse = parse;
Object.defineProperty(exports, "SimplePDFParser", {
  enumerable: true,
  get: function () {
    return _SimplePDFParser["default"];
  }
});

var _SimplePDFParser = _interopRequireDefault(require("./SimplePDFParser"));

/**
 * Takes a Buffer and returns an instance of SimplePDFParser
 * @param {Buffer} fileBuffer Buffer containing PDF file
 */
function parse(fileBuffer) {
  const parser = new _SimplePDFParser["default"](fileBuffer);
  parser.parse();
  return parser;
}