const COUNTRY_NAMES: Record<string, string> = {
  AUS: "Australia",
  AUT: "Austria",
  BEL: "Belgium",
  BGR: "Bulgaria",
  BHR: "Bahrain",
  BHS: "Bahamas",
  BLR: "Belarus",
  BRA: "Brazil",
  CAN: "Canada",
  CHE: "Switzerland",
  CZE: "Czechia",
  DEU: "Germany",
  DNK: "Denmark",
  EST: "Estonia",
  FIN: "Finland",
  FRA: "France",
  GBR: "United Kingdom",
  HRV: "Croatia",
  IDN: "Indonesia",
  ITA: "Italy",
  JPN: "Japan",
  KAZ: "Kazakhstan",
  KOR: "South Korea",
  LTU: "Lithuania",
  LVA: "Latvia",
  NGA: "Nigeria",
  NLD: "Netherlands",
  NOR: "Norway",
  POL: "Poland",
  RUS: "Russia",
  SVK: "Slovakia",
  SVN: "Slovenia",
  SWE: "Sweden",
  UKR: "Ukraine",
  USA: "United States",
  UZB: "Uzbekistan",
  ZAF: "South Africa",
};

export function countryName(country: string): string {
  const code = country.trim().toUpperCase();
  if (COUNTRY_NAMES[code]) {
    return COUNTRY_NAMES[code];
  }

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? country;
  } catch {
    return country;
  }
}

export function countryNameWithCode(country: string): string {
  const name = countryName(country);
  return name === country ? country : `${name} (${country.toUpperCase()})`;
}
