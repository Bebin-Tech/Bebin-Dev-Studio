/** Preserve optional values instead of silently substituting a choice or false. */
export function initialFieldValue(field, value) {
  if (value !== null && value !== undefined) return String(value);
  if (!field.required) return '';
  if (field.type === 'boolean') return 'false';
  if (field.type === 'select') return field.options[0];
  return '';
}

export function recordValues(fields, entries) {
  return Object.fromEntries(fields.map(field => {
    const raw = entries[field.name];
    const value = raw === '' || raw === undefined || raw === null ? null
      : field.type === 'number' ? Number(raw)
      : field.type === 'boolean' ? raw === 'true'
      : raw;
    return [field.name, value];
  }));
}


/** Pick the higher-contrast neutral for text placed directly on a validated accent. */
export function accentForeground(accent) {
  const hex = /^#[0-9a-f]{6}$/i.test(accent || '') ? accent : '#245c46';
  const linear = hex.slice(1).match(/../g).map(value => {
    const channel = parseInt(value,16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
}
