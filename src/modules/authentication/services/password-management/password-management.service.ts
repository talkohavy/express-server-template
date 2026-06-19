import { scrypt } from 'crypto';
import { timingSafeEqual } from 'node:crypto';

type GenerateHashedPasswordProps = {
  rawPassword: string;
  salt: string;
};

export class PasswordManagementService {
  /**
   * @description
   * In node, we can hash a password with salt by importing scrypt from within crypto & some salt.
   * We will then use scrypt to hash both the salt and the password.
   *
   * This function generates a hashed password from a raw password (user input) and a salt.
   * We provide scrypt with the original raw-password and salt, and provide a key length which is recommended to be 64.
   * Without getting into more details, scrypt makes it more computational intensive to crack using brute force,
   * and it's actually been used as proof of work algorithms used in cryptocurrency mining.
   * Now in your db you need to store both the salt and the hashed password.
   */
  async generateHashedPassword(props: GenerateHashedPasswordProps): Promise<string> {
    const { rawPassword, salt } = props;

    return new Promise((resolve, reject) => {
      scrypt(rawPassword, salt, 64, (error, hashedPassword) => {
        if (error) return reject(error);
        resolve(hashedPassword.toString('hex'));
      });
    });
  }

  /**
   * @description
   * A time-attack is where a hacker measures the amount of time it takes to perform an operation, to obtain information about the value.
   * The timingSafeEqual() function prevents that type of attack. It is used to determine whether two variables are equal,
   * without exposing timing information that may allow an attacker to guess one of the values.
   */
  async getIsPasswordValid(saltAndHashedPassword: string, rawPassword: string): Promise<boolean> {
    const [salt, storedHashedPassword] = saltAndHashedPassword.split(':') as [string, string];
    const generatedHashedPassword = await this.generateHashedPassword({ rawPassword, salt });

    const storedHashedBuffer = Buffer.from(storedHashedPassword) as any;
    const generatedHashedBuffer = Buffer.from(generatedHashedPassword) as any;
    const isMatch = timingSafeEqual(storedHashedBuffer, generatedHashedBuffer);

    return isMatch;
  }
}
