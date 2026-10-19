import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCertificationPolicy, requestVehicleDescription } from './certification.js';

test('MINI branding, warranty, headings, eligibility and dates do not establish CPO status', () => {
  for (const source of [
    '2026 MINI Cooper S\nNew vehicle\nFactory warranty: 4 years / 50,000 miles',
    'MINI Certified Pre-Owned\nProgram benefits\nVehicle Inquiry',
    'Warranty Vehicle Inquiry\nCPO eligible: Yes',
    'Certification date: 2025-01-01',
    'CPO Status: Pending',
    'CPO Status: No',
    'CPO Status: Expired',
    '',
  ]) assert.equal(getCertificationPolicy(source).allowed, false, source);
});

test('automatic certification needs an affirmative status without a contradictory status', () => {
  for (const source of ['MINI Cooper\nCPO Status: Active', 'Certified Pre-Owned: Yes', 'Certification Status: Enrolled']) {
    assert.equal(getCertificationPolicy(source).allowed, true);
  }
  assert.equal(getCertificationPolicy('CPO Status: Active\nCertification Status: Expired').allowed, false);
});

test('explicit omit overrides affirmative evidence and confirmation is independent of warranty', () => {
  assert.equal(getCertificationPolicy('CPO Status: Active', 'omit').allowed, false);
  assert.equal(getCertificationPolicy('', 'confirmed').allowed, true);
});

const request = { model: 'example', messages: [{ role: 'user', content: 'Describe this MINI' }] };
const mockResponse = content => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

test('rewrites unsupported CPO claims before returning the description', async () => {
  const calls = [];
  const result = await requestVehicleDescription(request, getCertificationPolicy('New MINI'), async (url, options) => {
    calls.push(JSON.parse(options.body));
    return mockResponse(calls.length === 1 ? 'Enjoy this Certified Pre-Owned MINI.' : 'Enjoy this playful MINI with heated seats.');
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0].messages.at(-1).content, /do not mention certification/);
  assert.match(calls[1].messages.at(-1).content, /removed/);
  assert.equal(result, 'Enjoy this playful MINI with heated seats.');
  assert.equal(request.messages.length, 1);
});

test('blocks repeated claims, including MINI NEXT, after one retry', async () => {
  let calls = 0;
  await assert.rejects(requestVehicleDescription(request, getCertificationPolicy('', 'omit'), async () => {
    calls++;
    return mockResponse('MINI NEXT benefits included.');
  }), /not been added/);
  assert.equal(calls, 2);
});

test('refinements cannot preserve an unsupported claim from an old response', async () => {
  const refinement = { ...request, messages: [...request.messages, { role: 'assistant', content: 'A Certified Pre-Owned MINI.' }] };
  let calls = 0;
  const result = await requestVehicleDescription(refinement, getCertificationPolicy('New MINI'), async () => {
    calls++;
    return mockResponse(calls === 1 ? 'A CPO MINI with style.' : 'A MINI with style.');
  });
  assert.equal(result, 'A MINI with style.');
  assert.equal(calls, 2);
});

test('allows supported Certified copy and surfaces API failures without retrying', async () => {
  const result = await requestVehicleDescription(request, getCertificationPolicy('CPO: Yes'), async () => mockResponse('Certified Pre-Owned MINI.'));
  assert.equal(result, 'Certified Pre-Owned MINI.');
  await assert.rejects(requestVehicleDescription(request, getCertificationPolicy(''), async () => ({
    ok: false, status: 429, json: async () => ({ error: { message: 'Rate limit' } }),
  })), /429.*Rate limit/);
});
