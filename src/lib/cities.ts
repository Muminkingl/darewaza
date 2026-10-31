import type { Locale } from "../i18n";
export const cities = [
  ["هەولێر", "Erbil", "أربيل"],
  ["سلێمانی", "Sulaymaniyah", "السليمانية"],
  ["دهۆک", "Duhok", "دهوك"],
  ["کەرکووک", "Kirkuk", "كركوك"],
  ["هەڵەبجە", "Halabja", "حلبجة"],
  ["زاخۆ", "Zakho", "زاخو"],
  ["سۆران", "Soran", "سوران"],
  ["ڕانیە", "Ranya", "رانية"],
  ["کۆیە", "Koya", "كويسنجق"],
  ["چەمچەماڵ", "Chamchamal", "جمجمال"],
  ["بەغدا", "Baghdad", "بغداد"],
  ["مووسڵ", "Mosul", "الموصل"],
];
export function cityLabel(city: string, locale: Locale) {
  const known = cities.find((c) => c.includes(city));
  return known?.[locale === "en" ? 1 : locale === "ar" ? 2 : 0] || city;
}
