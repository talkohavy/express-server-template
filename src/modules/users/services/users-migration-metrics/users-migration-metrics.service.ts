import type { Counter } from 'prom-client';

const ENTITY_LABEL = 'user';

/**
 * Wraps the raw Prometheus counters behind intention-revealing methods, mirroring
 * {@link UsersCacheMetricsService}. Keeps the migrating repository decoupled from
 * prom-client so it can be unit-tested with a trivial fake.
 */
export class UsersMigrationMetricsService {
  constructor(
    private readonly divergences: Counter<'entity' | 'operation'>,
    private readonly dualWriteFailures: Counter<'entity' | 'operation'>,
  ) {}

  onDivergence(props: { operation: string }): void {
    const { operation } = props;

    this.divergences.inc({ entity: ENTITY_LABEL, operation });
  }

  onDualWriteFailure(props: { operation: string }): void {
    const { operation } = props;

    this.dualWriteFailures.inc({ entity: ENTITY_LABEL, operation });
  }
}
