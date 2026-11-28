// Skill radar (PLAN.md Phase 8): rate yourself 1–5 per skill; skills rated at or below
// WEAK_AT seed the planner's weak topics (`w=`). Pure, so `node --test` can check it.

export type Skill = {id: string; label: string; short: string; topics: string[]};
export type Ratings = Record<string, number>; // skill id → 1..5; unrated skills are absent

export const WEAK_AT = 2;

export const SKILLS: Skill[] = [
  {
    id: 'sql-core',
    label: 'SQL joins & aggregation',
    short: 'SQL core',
    topics: [
      'aggregation',
      'deduplication',
      'null-traps',
      'left-joins',
      'anti-joins',
      'self-joins',
      'conditional-aggregation',
      'pivot',
      'fan-out-joins',
      'relational-division',
    ],
  },
  {
    id: 'sql-advanced',
    label: 'Window functions & time series',
    short: 'Windows',
    topics: [
      'window-functions',
      'gaps-and-islands',
      'sessionization',
      'date-spine',
      'running-totals',
      'top-n-per-group',
      'recursive-ctes',
      'percentiles',
      'retention-cohorts',
      'funnels',
      'period-over-period',
    ],
  },
  {
    id: 'modeling',
    label: 'Data modeling',
    short: 'Modeling',
    topics: [
      'dimensional-modeling',
      'grain',
      'star-schema',
      'fact-types',
      'scd-type-2',
      'periodic-snapshot',
      'accumulating-snapshot',
      'bridge-tables',
      'event-modeling',
      'data-vault',
      'one-big-table',
    ],
  },
  {
    id: 'python',
    label: 'Python for data',
    short: 'Python',
    topics: [
      'parsing',
      'generators',
      'files',
      'dictionaries',
      'json',
      'recursion',
      'algorithms',
      'heaps',
      'apis',
      'retries',
    ],
  },
  {
    id: 'pipelines',
    label: 'Batch pipelines & ETL',
    short: 'Pipelines',
    topics: [
      'idempotency',
      'backfills',
      'orchestration',
      'late-arriving-data',
      'cdc',
      'schema-evolution',
      'architecture',
      'lakehouse',
      'batch',
      'data-quality',
      'file-ingestion',
      'reject-handling',
      'incremental-loads',
      'etl-tools',
    ],
  },
  {
    id: 'streaming',
    label: 'Streaming',
    short: 'Streaming',
    topics: [
      'stream-processing',
      'kafka',
      'watermarks',
      'delivery-semantics',
      'streaming-ingestion',
      'ordering',
      'streaming',
    ],
  },
  {
    id: 'performance',
    label: 'Performance & cost',
    short: 'Perf & cost',
    topics: [
      'performance',
      'cost',
      'partitioning',
      'partition-pruning',
      'bucketing',
      'data-skew',
      'small-files',
      'finops',
      'spark',
      'snowflake',
    ],
  },
  {
    id: 'warehouse',
    label: 'Warehouse performance',
    short: 'Warehouse',
    topics: [
      'query-plans',
      'distribution-keys',
      'indexes',
      'columnar-storage',
      'workload-management',
      'materialized-views',
    ],
  },
  {
    id: 'behavioral',
    label: 'Behavioral & communication',
    short: 'Behavioral',
    topics: [
      'communication',
      'stakeholders',
      'ownership',
      'incidents',
      'influence',
      'prioritization',
      'tradeoffs',
      'planning',
    ],
  },
];

/** Topics of every skill rated at or below WEAK_AT, sorted and unique (planner `w=` format). */
export function weakTopics(ratings: Ratings, skills: Skill[] = SKILLS): string[] {
  const weak = skills
    .filter((s) => (ratings[s.id] ?? Infinity) <= WEAK_AT)
    .flatMap((s) => s.topics);
  return [...new Set(weak)].sort();
}

/** Polygon point for axis `i` of `n` at value `v` (0..max), radius `r`, centered at (c, c). */
export function radarPoint(i: number, n: number, v: number, max: number, r: number, c: number) {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n; // first axis points straight up
  const d = (v / max) * r;
  return {x: c + d * Math.cos(a), y: c + d * Math.sin(a)};
}
