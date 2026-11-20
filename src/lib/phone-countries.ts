// The country code in front of a phone number, chosen in a form (UAE first): the game's discount
// form and the table booking form. A number typed with its own + (or 00) code is used as it is.
// Without one, a number like 9562xx9404 (India) would be read as a +956 number, and the WhatsApp
// message would go nowhere.
// [code, flag, name]: the box shows the flag and code; the list it opens shows the names too
export const COUNTRIES = [
  ["971", "🇦🇪", "UAE"],
  ["91", "🇮🇳", "India"],
  ["92", "🇵🇰", "Pakistan"],
  ["880", "🇧🇩", "Bangladesh"],
  ["63", "🇵🇭", "Philippines"],
  ["94", "🇱🇰", "Sri Lanka"],
  ["977", "🇳🇵", "Nepal"],
  ["966", "🇸🇦", "Saudi Arabia"],
  ["968", "🇴🇲", "Oman"],
  ["974", "🇶🇦", "Qatar"],
  ["965", "🇰🇼", "Kuwait"],
  ["973", "🇧🇭", "Bahrain"],
  ["20", "🇪🇬", "Egypt"],
  ["44", "🇬🇧", "UK"],
  ["1", "🇺🇸", "USA / Canada"],
] as const;

// "+91 9562919404" from the chosen code and the number as typed (the local 0 of 050 ... goes)
export const fullNumber = (country: string, typed: string) => {
  const t = typed.trim();
  if (t.startsWith("+") || t.startsWith("00")) return t;
  return `+${country} ${t.replace(/^0+/, "")}`;
};
