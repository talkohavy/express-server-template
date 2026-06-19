import { isEmpty } from '@talkohavy/lodash';
import { userSchemaTemplate } from '../../models/user/user.schema.template';

export function getProjection(requestedFields: string[] = []) {
  const projection: Record<string, number> = {};

  const includeMongoosePropsRecursive = (properties: any, prefix = '') => {
    const entries = Object.entries(properties);

    entries.forEach(([propName, propObject]: [string, any]) => {
      if (shouldInclude({ requestedFields, propName, prefix })) {
        projection[`${prefix}${propName}`] = 1;
      } else if (Array.isArray(propObject?.type)) {
        if (propObject?.itemsType === 'object') {
          includeMongoosePropsRecursive(propObject.type[0], `${prefix}${propName}.`);
        }
      } else if (typeof propObject?.type === 'object')
        includeMongoosePropsRecursive(propObject.type, `${prefix}${propName}.`);
    });
  };

  includeMongoosePropsRecursive(userSchemaTemplate);

  const finalProjection: Record<string, number> = isEmpty(projection) ? { __BRING_NO_FIELD__: 1 } : projection;

  return finalProjection;
}

type ShouldIncludeProps = {
  requestedFields: string[];
  propName: string;
  prefix: string;
};

function shouldInclude(props: ShouldIncludeProps): boolean {
  const { requestedFields, propName, prefix } = props;

  if (requestedFields.includes(`${prefix}${propName}`)) return true;

  return false;
}
