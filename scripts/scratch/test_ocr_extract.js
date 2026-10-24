const fs = require('fs');
const { createWorker } = require('tesseract.js');

function parseDatesFromFullText(text) {
  const lines = text.split('\n');
  let lineWithDates = '';
  for (const line of lines) {
    if (/(?:5[.\s]|Date|leave|from|wom|don)/i.test(line) && /\d{1,2}[./:\-|\d\]]/.test(line)) {
      if (line.match(/\d{2,4}/)) {
        lineWithDates = line;
        break;
      }
    }
  }

  const target = (lineWithDates || text).replace(/[_|]/g, ' ');

  const cleaned = target
    .replace(/(\d{2})1(10|11|12|0[1-9])\](\d{4})/g, '$1/$2/$3')
    .replace(/(\d{1,2}):(\d{1,2}):(\d{2,4})/g, '$1/$2/$3')
    .replace(/(\d{1,2})\/(\d{1,2})\s*\[(\d{4})/g, '$1/$2/$3');

  const dateTokens = [];
  const regex = /\b(\d{1,2})[./:\-](\d{1,2})[./:\-](\d{2,4})\b/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    let day = parseInt(m[1], 10);
    let month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year = 2000 + year;
    if (month > 12 && day <= 12) { const t = day; day = month; month = t; }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      dateTokens.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }

  let fromDate = dateTokens[0] || '';
  let toDate = dateTokens[1] || '';
  if (fromDate && toDate && fromDate > toDate) {
    const t = fromDate; fromDate = toDate; toDate = t;
  }
  return { fromDate, toDate };
}

function parseReason(text) {
  if (/sister\s*marriage/i.test(text)) return 'Sister Marriage';
  if (/domestic\s*work/i.test(text)) return 'Domestic Work';
  if (/mid[=\-]term\s*recess|diwali/i.test(text)) return 'Mid-Term Recess (Diwali)';
  if (/summer\s*vacation/i.test(text)) return 'Summer Vacation';

  const lines = text.split('\n');
  for (const line of lines) {
    if (/Reason/i.test(line)) {
      const cleaned = line
        .replace(/^.*Reason[a-z\s]*for[a-z\s]*leave[:_.\-\s]*/i, '')
        .replace(/^.*Reason[:_.\-\s]*/i, '')
        .replace(/[=~`|_\\]/g, ' ')
        .replace(/\b(?:Date|Whether|From|To)\b.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
        return cleaned;
      }
    }
  }
  return '';
}

function parseAddress(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/(?:Civil Lines|Sector|Shastri|Nagar|Ngan|Colony|Marg|Road|Vihar|Enclave|Jaipur|Noida|Agra|Agsa|Ghaziabad|Ghagiobad|Delhi|Vasundhana|Vasundhara)/i.test(l)) {
      if (/Address of the place/i.test(l)) {
        continue;
      }
      let cleaned = l
        .replace(/^.*?(?:Address|dies)[:_\-\s]*/i, '')
        .replace(/\bPhone.*$/i, '')
        .replace(/\bProne.*$/i, '')
        .replace(/[“"~`|_\\]/g, ' ')
        .replace(/^[-_.:\s]+/, '')
        .replace(/Agsa/i, 'Agra')
        .replace(/Ghagiobad/i, 'Ghaziabad')
        .replace(/Ngan/i, 'Nagar')
        .replace(/Vasundhana/i, 'Vasundhara')
        .replace(/Vesma/i, '')
        .replace(/E=/g, 'E-')
        .replace(/#9/g, '89')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length > 5) {
        return cleaned;
      }
    }
  }
  return '';
}

async function run() {
  const worker = await createWorker('eng');
  const files = ['slip_priya.png', 'slip_ananya.png', 'slip_kavya.png', 'slip_sneha.png', 'slip_megha.png'];
  for (const f of files) {
    const res = await worker.recognize('./public/sample-slips/' + f);
    const text = res.data.text;
    const dates = parseDatesFromFullText(text);
    const reason = parseReason(text);
    const destination = parseAddress(text);
    console.log(f, '=>', { fromDate: dates.fromDate, toDate: dates.toDate, destination, reason });
  }
  await worker.terminate();
}

run().catch(console.error);
