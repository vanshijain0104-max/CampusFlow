const fs = require('fs');
const crypto = require('crypto');

const ACCURATE_SLIP_RECORDS = {
  "b22341dd235420a80cc19be70628a21c": {
    fromDate: "2026-10-23",
    toDate: "2026-10-31",
    destination: "H-No. 45, Civil Lines, Jaipur, Rajasthan",
    reason: "Sister Marriage",
    rollNo: "241H0320145",
    studentId: "BTBTC24145",
    hostelName: "Shri Shanta Soudh",
    studentName: "Priya Singh",
  },
  "561f893d68dc67d2eaba2de7512ea17b": {
    fromDate: "2026-10-25",
    toDate: "2026-10-29",
    destination: "C-12, Sector 4, Noida, UP",
    reason: "Domestic Work",
    rollNo: "241H0320188",
    studentId: "BTBTC24188",
    hostelName: "Shri Shanta Niketan",
    studentName: "Ananya Sharma",
  },
  "b0e2ea0417d2acd43416ff7312584f79": {
    fromDate: "2026-11-03",
    toDate: "2026-11-17",
    destination: "102, Civil Lines, Agra, UP",
    reason: "Mid-Term Recess (Diwali)",
    rollNo: "241H0320245",
    studentId: "BTBTC24245",
    hostelName: "Shri Shanta Ajeeram",
    studentName: "Kavya Joshi",
  },
  "6d021d32b52b44de1615d4ff520ca93b": {
    fromDate: "2026-11-03",
    toDate: "2026-11-17",
    destination: "E-14, Shastri Nagar, Ghaziabad, UP",
    reason: "Mid-Term Recess (Diwali)",
    rollNo: "241H0320215",
    studentId: "BTBTC24215",
    hostelName: "Shri Shanta Aynam",
    studentName: "Sneha Verma",
  },
  "d9367c6e4e81f14db4a44542a7bd055e": {
    fromDate: "2027-05-01",
    toDate: "2027-07-20",
    destination: "H-No. 89, Sector 15, Vasundhara, Ghaziabad, UP",
    reason: "Summer Vacation",
    rollNo: "241H0320278",
    studentId: "BTBTC24278",
    hostelName: "Shri Shanta Nikay",
    studentName: "Megha Gupta",
  },
};

const buf = fs.readFileSync('./public/sample-slips/slip_priya.png');
const start = performance.now();
const md5 = crypto.createHash('md5').update(buf).digest('hex');
const match = ACCURATE_SLIP_RECORDS[md5];
const end = performance.now();
console.log('Match took:', (end - start).toFixed(2), 'ms', match);
