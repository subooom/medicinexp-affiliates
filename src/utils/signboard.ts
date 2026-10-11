// src/utils/signboard.ts — guess a pharmacy's name, phone, PAN and address from the lines
// of text read off its signboard or licence (on-device OCR). Only suggestions: the MR
// checks them in the form.

const NAME_WORDS = /(pharmacy|pharma|medical|medicals|medicine|clinic|hospital|aushadhi|aushadhalaya|drug|chemist|health|फार्मेसी|मेडिकल|औषधि|औषधालय|क्लिनिक)/i;
const ADDRESS_WORDS = /(road|marg|tole|chowk|bazar|bazaar|ward|municipality|nagarpalika|gaupalika|metropolitan|rural|street|line|-\s?\d{1,2}\b|मार्ग|टोल|चोक|वडा|नगरपालिका|गाउँपालिका)/i;

export interface SignboardGuess {
  name?: string;
  phone?: string;
  pan_number?: string;
  address?: string;
  lines: string[];
}

const clean = (line: string) => line.replace(/\s+/g, ' ').trim();

export function guessFromSignboard(rawLines: string[]): SignboardGuess {
  const lines = rawLines.flatMap((l) => l.split('\n')).map(clean).filter((l) => l.length > 1);
  const guess: SignboardGuess = { lines };
  const text = lines.join('\n');

  // Nepal mobiles (98/97/96 + 8 digits) first, then landlines like 021-123456
  const mobile = text.replace(/[\s-]/g, ' ').match(/(?:\+?977[\s-]?)?(9[678]\d{8})/);
  const landline = text.match(/\b0\d{1,2}[\s-]?\d{5,7}\b/);
  if (mobile) guess.phone = mobile[1];
  else if (landline) guess.phone = landline[0].replace(/\s/g, '');

  const pan = text.match(/(?:PAN|P\.A\.N|स्थायी लेखा)[^\d]{0,12}(\d{9})/i) ?? text.match(/\b(\d{9})\b/);
  if (pan && pan[1] !== guess.phone) guess.pan_number = pan[1];

  const withNameWord = lines.filter((l) => NAME_WORDS.test(l) && !/\d{6,}/.test(l));
  // The longest line with "pharmacy" etc. is usually the shop name; otherwise the first line
  guess.name = withNameWord.sort((a, b) => b.length - a.length)[0] ?? lines.find((l) => !/\d{6,}/.test(l));

  const address = lines.find((l) => l !== guess.name && ADDRESS_WORDS.test(l) && !/\d{8,}/.test(l));
  if (address) guess.address = address;

  return guess;
}
