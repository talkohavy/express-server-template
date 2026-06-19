import type { SchemaTemplate } from '../../types';

export function separateSensitiveFromNonSensitiveFields(schemaTemplate: SchemaTemplate) {
  const sensitiveFields: Array<string> = [];
  const nonSensitiveFields: Array<string> = [];

  function checkSensitiveFieldsRecursively(objWithProperties: SchemaTemplate, prefix: string) {
    for (const key in objWithProperties) {
      const value = objWithProperties[key]!;

      if ('needPermission' in value && value.needPermission === true) {
        sensitiveFields.push(`${prefix}${key}`);
        continue;
      }

      if (Array.isArray(value.type)) {
        if (typeof value.type[0] !== 'object') {
          nonSensitiveFields.push(`${prefix}${key}`);
        }
        continue;
      }

      if (typeof value.type === 'object' && 'needPermission' in value && value.needPermission !== false) {
        checkSensitiveFieldsRecursively(value.type, `${prefix}${key}.`);
        continue;
      }

      nonSensitiveFields.push(`${prefix}${key}`);
    }
  }

  checkSensitiveFieldsRecursively(schemaTemplate, '');

  return { sensitiveFields, nonSensitiveFields };
}
