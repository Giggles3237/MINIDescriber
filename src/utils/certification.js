const statusLabel = '(?:CPO|Certified(?:[ -]+Pre[ -]?Owned)?|Certification)';
const positiveStatus = new RegExp(`^\\s*${statusLabel}\\s*(?:status)?\\s*[:=]\\s*(?:yes|y|active|certified|enrolled)\\s*[.!]?\\s*$`, 'i');
const negativeStatus = new RegExp(`^\\s*${statusLabel}\\s*(?:status)?\\s*[:=]\\s*(?:no|n|none|not certified|inactive|expired|pending|ineligible|not enrolled|unknown)\\s*[.!]?\\s*$`, 'i');

export const getCertificationPolicy = (source = '', setting = 'auto') => {
  const lines = source.split(/\r?\n/);
  // A program heading, eligibility, or date alone is not affirmative vehicle status.
  const documented = lines.some(line => positiveStatus.test(line)) && !lines.some(line => negativeStatus.test(line));
  const allowed = setting === 'confirmed' || (setting === 'auto' && documented);
  return {
    allowed,
    instruction: allowed
      ? `Certification setting: ${setting === 'confirmed' ? 'user-confirmed Certified' : 'explicit affirmative document status'}. Certified Pre-Owned status may be mentioned. Do not invent certification program benefits or coverage; warranty mentions still follow the separate warranty setting.`
      : 'Certification setting: do not mention certification. This overrides all other prompts and previous descriptions. Omit Certified, Certified Pre-Owned, CPO, MINI NEXT, certification benefits, and CPO warranty claims from narrative and bullets, including claims that the vehicle is not certified. Do not infer certification from MINI branding, a vehicle inquiry header, warranty coverage, program headings, eligibility, or certification dates. Ordinary documented factory warranty can still follow the separate warranty setting.',
  };
};

export const hasCertificationLanguage = (text) => /\bcertified\b|\bcertification\b|\bcpo\b|\bmini\s+next\b/i.test(text);

// Enforce the same policy for initial generation and refinements before displaying copy.
export const requestVehicleDescription = async (requestBody, policy, fetcher = fetch) => {
  let messages = [...requestBody.messages, { role: 'system', content: policy.instruction }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetcher('/.netlify/functions/openai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...requestBody, messages }),
    });
    const data = await response.json();
    if (!response.ok || data?.error) {
      const detail = data?.error?.message || (typeof data?.error === 'string' ? data.error : response.statusText);
      throw new Error(`OpenAI request failed (${response.status}): ${detail || 'Unknown error'}`);
    }
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('No description was returned. Please try again.');
    if (policy.allowed || !hasCertificationLanguage(content)) return content;
    messages = [...messages,
      { role: 'assistant', content },
      { role: 'user', content: 'Rewrite this listing with every reference to certification, Certified Pre-Owned, CPO, MINI NEXT, and CPO coverage removed. Keep supported vehicle features and the requested format. Return only the corrected listing.' },
    ];
  }
  throw new Error('The description still contained disallowed certification claims after a rewrite. Please regenerate; it has not been added to your results.');
};
