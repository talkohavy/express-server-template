export class FieldScreeningService {
  constructor(
    private readonly sensitiveFields: Array<string>,
    private readonly nonSensitiveFields: Array<string>,
  ) {}

  getFields(requestedFields?: Array<string>, canAccessSensitive = false): Array<string> | null {
    const fieldsToGet: Array<string> = [];

    if (!requestedFields?.length) return this.nonSensitiveFields; // return all non-sensitive fields if no specific fields requested

    for (const field of requestedFields) {
      if (this.nonSensitiveFields.includes(field) || (canAccessSensitive && this.sensitiveFields.includes(field))) {
        fieldsToGet.push(field);
      }
    }

    return fieldsToGet;
  }

  getNonSensitiveFields(): Array<string> {
    return this.nonSensitiveFields;
  }
}
