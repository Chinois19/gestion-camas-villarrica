import cie10Data from './cie10.json';

export const CIE10_OPTIONS = cie10Data.map(d => ({
  value: `${d.code} - ${d.desc}`,
  label: `${d.code} - ${d.desc}`
}));
