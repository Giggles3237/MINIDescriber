import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Improve uses the supported description-generation model, not the unavailable preview model', () => {
  const source = readFileSync(new URL('../PdfUploadChatGPTApp.jsx', import.meta.url), 'utf8');
  const refinement = source.slice(source.indexOf('const improveDescription ='), source.indexOf('const handleImprove ='));
  assert.match(refinement, /model: 'gpt-4o-mini'/);
  assert.doesNotMatch(refinement, /gpt-4-turbo-preview/);
  assert.match(refinement, /requestVehicleDescription/);
  assert.match(refinement, /getCertificationPolicy\(sourceDocument, certificationSetting\)/);
});
