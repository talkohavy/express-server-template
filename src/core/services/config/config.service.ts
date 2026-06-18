export class ConfigService<T = Record<string, any>> {
  private readonly config: T;

  constructor(initialConfig: T = {} as T) {
    this.config = initialConfig;
  }

  get<K = any>(key?: string): K {
    if (!key) return this.config as unknown as K;

    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value == null || typeof value !== 'object') return undefined as K;

      value = value[k as keyof typeof value];
    }

    return value as K;
  }

  set(key: string, value: any): void {
    this.config[key as keyof T] = value;
  }

  getAll(): T {
    return this.config;
  }
}
