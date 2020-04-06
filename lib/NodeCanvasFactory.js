"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _canvas = _interopRequireDefault(require("canvas"));

var _assert = require("assert");

/* eslint-disable no-param-reassign */

/* eslint-disable class-methods-use-this */

/*
 * This code was taken from https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.js
 */
class NodeCanvasFactory {
  create(width, height) {
    (0, _assert.strict)(width > 0 && height > 0, 'Invalid canvas size');

    const canvas = _canvas["default"].createCanvas(width, height);

    const context = canvas.getContext('2d');
    return {
      canvas,
      context
    };
  }

  reset(canvasAndContext, width, height) {
    (0, _assert.strict)(canvasAndContext.canvas, 'Canvas is not specified');
    (0, _assert.strict)(width > 0 && height > 0, 'Invalid canvas size');
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    (0, _assert.strict)(canvasAndContext.canvas, 'Canvas is not specified'); // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.

    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }

}

exports["default"] = NodeCanvasFactory;