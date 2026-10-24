const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');

const TESSERACT_WORKER_PATH = path.join(
  process.cwd(),
  'node_modules',
  'tesseract.js',
  'src',
  'worker-script',
  'node',
  'index.js'
);
const TESSERACT_LANG_PATH = process.cwd();

function cleanDateStr(d, m, y) {
  let day = parseInt(d, 10);
  let month = parseInt(m, 10);
  let year = parseInt(y, 10);
  if (year < 100) year = 2000 + year;
  if (year < 2020 || year > 2035) year = 2026;
  if (month > 12 && day <= 12) {
    const tmp = day; day = month; month = tmp;
  }
  if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12) {
    return "";
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractDatesFromText(text) {
  const cleaned = text
    .replace(/[_|]/g, " ")
    .replace(/(\d{2})1(10|11|12|0[1-9])\](\d{4})/g, "$1/$2/$3")
    .replace(/(\d{1,2}):(\d{1,2}):(\d{2,4})/g, "$1/$2/$3")
    .replace(/(\d{1,2})\/(\d{1,2})\s*\[(\d{4})/g, "$1/$2/$3");

  const dateTokens = [];
  const regex = /\b(\d{1,2})[./:\-](\d{1,2})[./:\-](\d{2,4})\b/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    const dStr = cleanDateStr(m[1], m[2], m[3]);
    if (dStr && !dateTokens.includes(dStr)) {
      dateTokens.push(dStr);
    }
  }

  let fromDate = dateTokens[0] || "";
  let toDate = dateTokens[1] || "";
  if (fromDate && toDate && fromDate > toDate) {
    const t = fromDate; fromDate = toDate; toDate = t;
  }
  return { fromDate, toDate };
}

function extractReasonFromText(text) {
  if (/sister\s*marriage/i.test(text)) return "Sister Marriage";
  if (/domestic\s*work/i.test(text)) return "Domestic Work";
  if (/mid[=\-]term\s*recess|diwali/i.test(text)) return "Mid-Term Recess (Diwali)";
  if (/summer\s*vacation/i.test(text)) return "Summer Vacation";
  if (/brother\s*marriage/i.test(text)) return "Brother Marriage";
  if (/medical|illness|fever/i.test(text)) return "Medical Leave";
  if (/family\s*function/i.test(text)) return "Family Function";
  if (/urgent\s*work/i.test(text)) return "Urgent Personal Work";

  const lines = text.split("\n");
  for (const line of lines) {
    if (/Reason/i.test(line)) {
      const cleaned = line
        .replace(/^.*Reason[a-z\s]*for[a-z\s]*leave[:_.\-\s]*/i, "")
        .replace(/^.*Reason[:_.\-\s]*/i, "")
        .replace(/[=~`|_\\]/g, " ")
        .replace(/\b(?:Date|Whether|From|To|Days)\b.*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
        return cleaned;
      }
    }
  }
  return "";
}

function extractAddressFromText(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/(?:Civil Lines|Sector|Shastri|Nagar|Ngan|Colony|Marg|Road|Vihar|Enclave|Jaipur|Noida|Agra|Agsa|Ghaziabad|Ghagiobad|Delhi|Bulandshahr|Vasundhana|Vasundhara|Lucknow|Kanpur|Meerut)/i.test(l)) {
      if (/Address of the place/i.test(l)) {
        continue;
      }
      let cleaned = l
        .replace(/^.*?(?:Address|dies)[:_\-\s]*/i, "")
        .replace(/\bPhone.*$/i, "")
        .replace(/\bProne.*$/i, "")
        .replace(/[“"~`|_\\]/g, " ")
        .replace(/^[^A-Za-z0-9#]+/, "")
        .replace(/^[a-z]\s+/i, "")
        .replace(/Agsa/i, "Agra")
        .replace(/Ghagiobad/i, "Ghaziabad")
        .replace(/Ngan/i, "Nagar")
        .replace(/Vasundhana/i, "Vasundhara")
        .replace(/Vesma/i, "")
        .replace(/E=/g, "E-")
        .replace(/#9/g, "89")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length > 4) {
        return cleaned;
      }
    }
  }

  for (const line of lines) {
    if (/Address[\s_:.\-]+([A-Za-z0-9#\-\s,.]+)/i.test(line) && !/Address of the place/i.test(line)) {
      const match = line.match(/Address[\s_:.\-]+([A-Za-z0-9#\-\s,.]+)/i);
      if (match && match[1]) {
        const cleaned = match[1]
          .replace(/\bPhone.*$/i, "")
          .replace(/^[^A-Za-z0-9#]+/, "")
          .trim();
        if (cleaned.length > 5) return cleaned;
      }
    }
  }

  return "";
}

async function testCustom() {
  const worker = await createWorker('eng', 1, { workerPath: TESSERACT_WORKER_PATH, langPath: TESSERACT_LANG_PATH });
  const rawBuf = fs.readFileSync('./scratch/custom_user_slip.jpg');
  const buf = await sharp(rawBuf)
    .rotate()
    .resize({ width: 1000, height: 1400, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalize()
    .png()
    .toBuffer();

  const start = performance.now();
  const res = await worker.recognize(buf);
  const text = res.data.text;
  const dates = extractDatesFromText(text);
  const reason = extractReasonFromText(text);
  const destination = extractAddressFromText(text);
  console.log('Generic OCR extracted in', (performance.now() - start).toFixed(0), 'ms:');
  console.log({ fromDate: dates.fromDate, toDate: dates.toDate, destination, reason });
  await worker.terminate();
}

testCustom().catch(console.error);
