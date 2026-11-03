const normalizeAdministrativeName = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/^(?:barangay|brgy\.?)\s*/i, '')
  .trim()
  .toLocaleLowerCase('en');

const resolveBarangay = (place, barangayNames) => {
  const address = place?.address;
  if (!address || typeof address !== 'object' || address.country_code?.toLowerCase() !== 'ph') return null;

  const administrativeNames = [
    address.city,
    address.town,
    address.municipality,
    address.county,
    address.state_district,
    address.province,
    address.state,
  ].map((name) => normalizeAdministrativeName(name).replace(/\s+(?:city|municipality)$/i, ''));
  if (!administrativeNames.includes('valencia') || !administrativeNames.some((name) => name.includes('bukidnon'))) return null;

  const canonicalNames = new Map((barangayNames || []).map((name) => [normalizeAdministrativeName(name), name]));
  const candidates = [
    address.suburb,
    address.village,
    address.city_district,
    address.neighbourhood,
    address.quarter,
    address.hamlet,
    address.locality,
  ];
  return candidates.map(normalizeAdministrativeName).map((name) => canonicalNames.get(name)).find(Boolean) || null;
};

module.exports = { resolveBarangay };
