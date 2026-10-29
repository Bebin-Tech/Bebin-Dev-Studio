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
