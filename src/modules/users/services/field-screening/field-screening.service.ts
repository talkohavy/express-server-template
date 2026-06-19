export class FieldScreeningService {
  constructor(
    private readonly sensitiveFields: Array<string>,
    private readonly nonSensitiveFields: Array<string>,
  ) {}

  /**
   * @description
   * Returns EXACTLY the fields that the user requested.
   * Nothing more, nothing less.
   */
  getOnlyRequestedFields(requestedFields?: Array<string>, canAccessSensitive = false): Array<string> {
    if (!requestedFields?.length) return [];

    const fieldsToGet: Array<string> = [];

    for (const field of requestedFields) {
      if (this.nonSensitiveFields.includes(field) || (canAccessSensitive && this.sensitiveFields.includes(field))) {
        fieldsToGet.push(field);
      }
    }

    return fieldsToGet;
  }

  /**
   * @description
   * Returns all non-sensitive fields, plus extra sensitive fields you requested,
   * based on whether you are allowed to access them.
   */
  getBaseFieldsPlusExtraFields(extraFields?: Array<string>, canAccessSensitive = false): Array<string> {
    if (!extraFields?.length || !canAccessSensitive) return this.nonSensitiveFields;

    const fieldsToGet: Array<string> = [...this.nonSensitiveFields];

    for (const field of extraFields) {
      if (this.sensitiveFields.includes(field)) {
        fieldsToGet.push(field);
      }
    }

    return fieldsToGet;
  }

  getNonSensitiveFields(): Array<string> {
    return this.nonSensitiveFields;
  }

  getAllFields(): Array<string> {
    return [...this.nonSensitiveFields, ...this.sensitiveFields];
  }
}
