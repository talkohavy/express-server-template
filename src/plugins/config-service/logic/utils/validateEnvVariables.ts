import { Colors } from '@src/common/constants';
import { envSchema } from '../env-validation-schema';
import type { ValidEnv } from '../../types';

export function validateEnvVariables(): ValidEnv {
  const { error, value } = envSchema.validate(process.env, { abortEarly: false });

  if (error) {
    const messages = error.details
      .map((detail) => {
        const provided = detail.context?.value;
        const receivedStr = provided ? ` (received: "${provided}")` : '';
        return `\t• ${detail.message}${receivedStr}`;
      })
      .join('\n');

    console.log(`\n${Colors.Yellow}❌ Environment variable validation failed:${Colors.Reset}\n`);
    console.log(`${Colors.Red}${messages}${Colors.Reset}\n`);

    process.exit(1);
  } else {
    console.log('✅ Environment variable validation passed');
  }

  return value as ValidEnv;
}
