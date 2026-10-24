function parseDates(text) {
  const cleaned = text
    .replace(/[_|]/g, ' ')
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
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!dateTokens.includes(dStr)) dateTokens.push(dStr);
    }
  }

  let fromDate = dateTokens[0] || '';
  let toDate = dateTokens[1] || '';
  if (fromDate && toDate && fromDate > toDate) {
    const t = fromDate; fromDate = toDate; toDate = t;
  }
  return { fromDate, toDate, all: dateTokens };
}

const priyaText = 'Dates of going on leave 23110]2026 wom 31110]2026 7510 Days = 05 ... Signature Viksam 26/10/2026';
console.log('Priya dates:', parseDates(priyaText));
const snehaText = '| 5 swmanRRrsDaeoigononteme_3:11:26 don 17:11:26 Days —15 F8 ... 23.10.26';
console.log('Sneha dates:', parseDates(snehaText));
const kavyaText = '| 5. mm RR Rem Date of pongon Leave 3:11:26 To 17-11-26 pa —=15';
console.log('Kavya dates:', parseDates(kavyaText));
const ananyaText = '5. sw AR Rem Date ging on Leave 25/10/2026 4 from 29/10/2026 7wto days =05';
console.log('Ananya dates:', parseDates(ananyaText));
const meghaText = '| 5. ammedIRRRTw Date of goingon Leave 1/05 [2027 from To 20/07 [2027 pays TO.';
console.log('Megha dates:', parseDates(meghaText));
