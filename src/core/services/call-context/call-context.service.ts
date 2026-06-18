import { AsyncLocalStorage } from 'async_hooks';

export class CallContextService<K = string, V = string | object | boolean> implements Map<K, V> {
  public constructor(private readonly asyncLocalStorage: AsyncLocalStorage<Map<K, V>>) {}

  public getStore(): Map<K, V> {
    const store = this.asyncLocalStorage.getStore()!;

    return store;
  }

  public clear(): void {
    return this.getStore()?.clear();
  }

  public delete(key: K): boolean {
    return this.getStore()?.delete(key);
  }

  public forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: CallContextService<K, V>): void {
    return this.getStore()?.forEach(callbackfn, thisArg);
  }

  public get(key: K): V | undefined {
    return this.getStore()?.get(key);
  }

  public has(key: K): boolean {
    return this.getStore()?.has(key);
  }

  public set(key: K, value: V): this {
    this.getStore()?.set(key, value);
    return this;
  }

  public get size(): number {
    return this.getStore()?.size;
  }

  public entries(): MapIterator<[K, V]> {
    return this.getStore()!.entries();
  }

  public keys(): MapIterator<K> {
    return this.getStore()!.keys();
  }

  public values(): MapIterator<V> {
    return this.getStore()!.values();
  }

  public [Symbol.iterator](): MapIterator<[K, V]> {
    return this.getStore()![Symbol.iterator]();
  }

  public getOrInsert(key: K, value: V): V {
    const store = this.getStore();
    if (!store.has(key)) {
      store.set(key, value);
    }
    return store.get(key)!;
  }

  public getOrInsertComputed(key: K, callbackfn: (key: K) => V): V {
    const store = this.getStore();
    if (!store.has(key)) {
      const computed = callbackfn(key);
      store.set(key, computed);
    }
    return store.get(key)!;
  }

  public [Symbol.toStringTag] = '[object AsyncContext]';

  public register(): void {
    this.asyncLocalStorage.enterWith(new Map());
  }

  public unregister(): void {
    this.asyncLocalStorage.disable();
  }
}

export let callContextService: CallContextService<string, string>;

export function initCallContextService(): CallContextService<string, string> {
  const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

  callContextService = new CallContextService(asyncLocalStorage);

  return callContextService;
}
