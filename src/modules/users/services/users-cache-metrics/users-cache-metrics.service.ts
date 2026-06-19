import type { Counter } from 'prom-client';

const ENTITY_NAME = 'user';

export class UsersCacheMetricsService {
  constructor(
    private readonly cacheHitsCounter: Counter<'entity'>,
    private readonly cacheMissesCounter: Counter<'entity'>,
  ) {}

  onHit(): void {
    this.cacheHitsCounter.inc({ entity: ENTITY_NAME });
  }

  onMiss(): void {
    this.cacheMissesCounter.inc({ entity: ENTITY_NAME });
  }
}
