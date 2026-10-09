// Keep PDF line breaks so labels and their values remain easier to interpret.
export const extractPageText = (items) => {
  let text = '';
  let previousY;
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    const y = item.transform?.[5];
    if (text && !text.endsWith('\n')) {
      text += Number.isFinite(y) && Number.isFinite(previousY) && Math.abs(y - previousY) > 3
        ? '\n'
        : ' ';
    }
    text += item.str;
    if (item.hasEOL) text += '\n';
    previousY = y;
  }
  return text.trim();
};

export const needsVisualReading = (text) => {
  const readable = text.replace(/\s/g, '');
  const words = text.trim().split(/\s+/).filter(Boolean);
  const corruptCharacters = (readable.match(/[\uFFFD\u0000]/g) || []).length;
  return readable.length < 100 || words.length < 15 || corruptCharacters > readable.length * 0.05;
};
