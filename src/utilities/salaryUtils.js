// Number to Indian Currency Words converter
export function numberToWordsIndian(num) {
  if (num === 0 || !num || isNaN(num)) return "Rupees Zero Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatTens = (n) => {
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const unit = a[n % 10];
    return tens + (unit ? " " + unit : "");
  };

  const formatHundreds = (n) => {
    let str = "";
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + " Hundred";
      if (n % 100 > 0) str += " and ";
    }
    if (n % 100 > 0) {
      str += formatTens(n % 100);
    }
    return str.trim();
  };

  let integerPart = Math.floor(Math.abs(num));
  let result = "";

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  const remaining = integerPart;

  if (crore > 0) {
    result += (formatTens(crore) || formatHundreds(crore)) + " Crore ";
  }
  if (lakh > 0) {
    result += (formatTens(lakh) || formatHundreds(lakh)) + " Lakh ";
  }
  if (thousand > 0) {
    result += (formatTens(thousand) || formatHundreds(thousand)) + " Thousand ";
  }
  if (remaining > 0) {
    result += formatHundreds(remaining) + " ";
  }

  const trimmed = result.trim();
  return trimmed ? `(Rupees ${trimmed} Only)` : "(Rupees Zero Only)";
}

// Mask account number: e.g. "123456789012" -> "XXXX XXXX XXXX 9012"
export function maskAccountNumber(acc) {
  if (!acc) return "XXXX XXXX XXXX 827";
  const str = String(acc).replace(/\s+/g, "");
  if (str.length <= 4) return `XXXX XXXX ${str}`;
  const last4 = str.slice(-4);
  return `XXXX XXXX XXXX ${last4}`;
}

// Format ordinal date: e.g. 5 -> "5th"
export function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
