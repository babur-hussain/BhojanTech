/**
 * Converts an integer amount in paise (or rupees as integer) to Indian words.
 * Returns { english, hindi }
 *
 * e.g. amountInRupees(500) → { english: "Five Hundred Rupees Only", hindi: "पाँच सौ रुपये मात्र" }
 */

const ones_en = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];

const tens_en = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
  'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const ones_hi = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'];

const tens_hi = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास',
  'साठ', 'सत्तर', 'अस्सी', 'नब्बे'];

function twoDigit(n: number, ones: string[], tens: string[]): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ' ' + ones[o] : '');
}

function threeDigit(n: number, ones_arr: string[], tens_arr: string[], hundred: string): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ones_arr[h] + ' ' + hundred + (r ? ' ' : '') : '') + twoDigit(r, ones_arr, tens_arr);
}

function toWordsEN(rupees: number): string {
  rupees = Math.round(rupees);
  if (rupees === 0) return 'Zero Rupees Only';

  let result = '';
  if (rupees >= 10_00_00_000) { // crore
    result += threeDigit(Math.floor(rupees / 10_00_00_000), ones_en, tens_en, 'Hundred') + ' Crore ';
    rupees %= 10_00_00_000;
  }
  if (rupees >= 1_00_000) {
    result += threeDigit(Math.floor(rupees / 1_00_000), ones_en, tens_en, 'Hundred') + ' Lakh ';
    rupees %= 1_00_000;
  }
  if (rupees >= 1_000) {
    result += threeDigit(Math.floor(rupees / 1_000), ones_en, tens_en, 'Hundred') + ' Thousand ';
    rupees %= 1_000;
  }
  result += threeDigit(rupees, ones_en, tens_en, 'Hundred');
  return result.trim() + ' Rupees Only';
}

function toWordsHI(rupees: number): string {
  rupees = Math.round(rupees);
  if (rupees === 0) return 'शून्य रुपये मात्र';

  let result = '';
  if (rupees >= 10_00_00_000) {
    result += threeDigit(Math.floor(rupees / 10_00_00_000), ones_hi, tens_hi, 'सौ') + ' करोड़ ';
    rupees %= 10_00_00_000;
  }
  if (rupees >= 1_00_000) {
    result += threeDigit(Math.floor(rupees / 1_00_000), ones_hi, tens_hi, 'सौ') + ' लाख ';
    rupees %= 1_00_000;
  }
  if (rupees >= 1_000) {
    result += threeDigit(Math.floor(rupees / 1_000), ones_hi, tens_hi, 'सौ') + ' हज़ार ';
    rupees %= 1_000;
  }
  result += threeDigit(rupees, ones_hi, tens_hi, 'सौ');
  return result.trim() + ' रुपये मात्र';
}

export const amountInWords = (rupees: number) => ({
  english: toWordsEN(rupees),
  hindi: toWordsHI(rupees),
});
