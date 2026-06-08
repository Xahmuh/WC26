export const COUNTRY_CODES: Record<string, string> = {
  Argentina: 'ar',
  Australia: 'au',
  Belgium: 'be',
  Brazil: 'br',
  Cameroon: 'cm',
  Canada: 'ca',
  Croatia: 'hr',
  Denmark: 'dk',
  Ecuador: 'ec',
  England: 'gb-eng',
  France: 'fr',
  Germany: 'de',
  Ghana: 'gh',
  Iran: 'ir',
  Italy: 'it',
  Japan: 'jp',
  Mexico: 'mx',
  Morocco: 'ma',
  Netherlands: 'nl',
  Poland: 'pl',
  Portugal: 'pt',
  Qatar: 'qa',
  'Saudi Arabia': 'sa',
  Senegal: 'sn',
  Serbia: 'rs',
  'South Korea': 'kr',
  Spain: 'es',
  Switzerland: 'ch',
  Tunisia: 'tn',
  Uruguay: 'uy',
  USA: 'us',
  Wales: 'gb-wls',
};

const FLAG_CODE_ALIASES: Record<string, string> = {
  arg: 'ar',
  aus: 'au',
  bel: 'be',
  bra: 'br',
  cam: 'cm',
  can: 'ca',
  cro: 'hr',
  den: 'dk',
  ecu: 'ec',
  eng: 'gb-eng',
  fra: 'fr',
  ger: 'de',
  gha: 'gh',
  irn: 'ir',
  ita: 'it',
  jpn: 'jp',
  mex: 'mx',
  mar: 'ma',
  ned: 'nl',
  pol: 'pl',
  por: 'pt',
  qat: 'qa',
  ksa: 'sa',
  sen: 'sn',
  srb: 'rs',
  kor: 'kr',
  esp: 'es',
  sui: 'ch',
  tun: 'tn',
  uru: 'uy',
  usa: 'us',
  wal: 'gb-wls',
  england: 'gb-eng',
  wales: 'gb-wls',
  unitedstates: 'us',
  'saudiarabia': 'sa',
  'southkorea': 'kr',
  'netherlands': 'nl',
};

function normalizeFlagKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '');
}

export function resolveFlagCode(teamNameOrCode: string): string {
  const trimmed = teamNameOrCode.trim();
  if (!trimmed) return 'us';

  const directMatch = COUNTRY_CODES[trimmed];
  if (directMatch) return directMatch;

  const normalized = normalizeFlagKey(trimmed);
  const aliasMatch = FLAG_CODE_ALIASES[normalized];
  if (aliasMatch) return aliasMatch;

  const normalizedWithHyphens = trimmed.toLowerCase().replace(/[\s_]+/g, '-');
  return normalizedWithHyphens;
}

export function getFlagUrl(teamNameOrCode: string): string {
  const code = resolveFlagCode(teamNameOrCode);
  return `https://flagcdn.com/w40/${code}.png`;
}
