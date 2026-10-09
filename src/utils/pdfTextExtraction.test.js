import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPageText, needsVisualReading } from './pdfTextExtraction.js';

test('preserves label/value lines and PDF end-of-line markers', () => {
  const text = extractPageText([
    { str: 'Exterior:', transform: [1, 0, 0, 1, 10, 700] },
    { str: 'Red', transform: [1, 0, 0, 1, 100, 700], hasEOL: true },
    { str: 'Optional equipment', transform: [1, 0, 0, 1, 10, 680] },
    { str: 'Heated seats', transform: [1, 0, 0, 1, 10, 660] },
  ]);
  assert.equal(text, 'Exterior: Red\nOptional equipment\nHeated seats');
});

test('requests visual reading for blank, sparse, or corrupt text layers', () => {
  assert.equal(needsVisualReading(''), true);
  assert.equal(needsVisualReading('Window sticker VIN'), true);
  assert.equal(needsVisualReading('Warranty equipment '.repeat(20) + '\uFFFD'.repeat(40)), true);
});

test('keeps readable detailed text on the normal extraction path', () => {
  assert.equal(needsVisualReading('Vehicle year make model trim exterior interior standard equipment optional equipment packages safety features warranty details destination total price'), false);
});
