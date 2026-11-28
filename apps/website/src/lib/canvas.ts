// Pipeline design canvas (PLAN.md Phase 8). Pure diagram logic so `node --test` can check it.

export type Stage = 'source' | 'ingest' | 'store' | 'transform' | 'serve';
export type Box = {id: string; stage: Stage; label: string; x: number; y: number};
export type Diagram = {boxes: Box[]; edges: {from: string; to: string}[]; checks: string[]};

export const STAGES: Stage[] = ['source', 'ingest', 'store', 'transform', 'serve'];
export const STAGE_LABELS: Record<Stage, string> = {
  source: 'Source',
  ingest: 'Ingest',
  store: 'Store',
  transform: 'Transform',
  serve: 'Serve',
};
export type Provider = 'generic' | 'aws' | 'gcp' | 'azure';
export const PROVIDER_LABELS: Record<Provider, string> = {
  generic: 'Generic',
  aws: 'AWS',
  gcp: 'Google Cloud',
  azure: 'Azure',
};
/** Palette per provider: the same roles in each stage, named as that cloud's services. */
export const PROVIDER_PRESETS: Record<Provider, Record<Stage, string[]>> = {
  generic: {
    source: ['Postgres (OLTP)', 'SaaS API', 'App events', 'Files (SFTP/S3)'],
    ingest: ['CDC (Debezium)', 'Kafka', 'Batch extract', 'Managed connector'],
    store: ['Object storage (lake)', 'Iceberg / Delta table', 'Warehouse'],
    transform: ['dbt', 'Spark batch', 'Flink / streaming', 'Airflow (orchestration)'],
    serve: ['BI dashboard', 'Reverse ETL', 'Feature store', 'Data API'],
  },
  aws: {
    source: ['RDS / Aurora', 'SaaS API', 'App events', 'S3 file drop'],
    ingest: ['DMS (CDC)', 'Kinesis Data Streams', 'MSK (Kafka)', 'Amazon Data Firehose', 'Lambda'],
    store: ['S3 (lake)', 'Iceberg + Glue Catalog', 'Redshift'],
    transform: ['Glue (Spark)', 'EMR', 'Athena / dbt', 'MWAA (Airflow)', 'Step Functions'],
    serve: ['QuickSight', 'Athena', 'Redshift', 'SageMaker Feature Store', 'API Gateway'],
  },
  gcp: {
    source: ['Cloud SQL', 'SaaS API', 'App events', 'Cloud Storage file drop'],
    ingest: ['Datastream (CDC)', 'Pub/Sub', 'Dataflow', 'Cloud Run job'],
    store: ['Cloud Storage (lake)', 'BigQuery'],
    transform: ['Dataflow', 'Dataproc (Spark)', 'BigQuery SQL / dbt', 'Cloud Composer (Airflow)'],
    serve: ['Looker', 'BigQuery', 'Vertex AI Feature Store', 'Cloud Run API'],
  },
  azure: {
    source: ['Azure SQL Database', 'SaaS API', 'App events', 'Blob file drop'],
    ingest: ['Data Factory', 'Event Hubs', 'Azure Functions'],
    store: ['ADLS Gen2 (lake)', 'Delta tables', 'Synapse / Fabric Warehouse'],
    transform: ['Databricks', 'Synapse Spark', 'Data Factory pipelines', 'dbt'],
    serve: ['Power BI', 'Synapse SQL', 'Azure ML', 'API Management'],
  },
};
export const PRESETS = PROVIDER_PRESETS.generic;
/** Questions an interviewer will ask about any design; the reader ticks them off. */
export const REVIEW: {id: string; text: string}[] = [
  {id: 'grain', text: 'I can state the grain and freshness (SLA) of every output.'},
  {id: 'idempotent', text: 'Every load can rerun safely (idempotent writes, merge or overwrite).'},
  {id: 'backfill', text: 'I can backfill a date range without a special code path.'},
  {id: 'late', text: 'Late, duplicate and out-of-order data are handled.'},
  {id: 'schema', text: 'Schema changes at the source are detected and handled.'},
  {id: 'quality', text: 'Data quality checks run before data reaches consumers.'},
  {id: 'observe', text: 'Freshness, volume and failures are monitored and alert an owner.'},
  {id: 'security', text: 'PII is identified, access-controlled and deletable.'},
  {id: 'cost', text: 'I know the main cost driver and how it scales with 10× data.'},
];

export const BOX_W = 170;
export const BOX_H = 64;
export const CANVAS_W = 5 * 200 + 20;
export const CANVAS_H = 560;
export const empty = (): Diagram => ({boxes: [], edges: [], checks: []});

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clampBox = (x: number, y: number) => ({
  x: clamp(Math.round(x), 0, CANVAS_W - BOX_W),
  y: clamp(Math.round(y), 0, CANVAS_H - BOX_H),
});

/** New box at the bottom of its stage's column. */
export function addBox(d: Diagram, stage: Stage, label: string): Diagram {
  const id = `b${Math.max(0, ...d.boxes.map((b) => Number(b.id.slice(1)) || 0)) + 1}`;
  const inColumn = d.boxes.filter((b) => b.stage === stage).length;
  const pos = clampBox(20 + STAGES.indexOf(stage) * 200, 20 + inColumn * (BOX_H + 24));
  return {...d, boxes: [...d.boxes, {id, stage, label, ...pos}]};
}

export function connect(d: Diagram, from: string, to: string): Diagram {
  if (from === to || d.edges.some((e) => e.from === from && e.to === to)) return d;
  return {...d, edges: [...d.edges, {from, to}]};
}

export function removeBox(d: Diagram, id: string): Diagram {
  return {
    ...d,
    boxes: d.boxes.filter((b) => b.id !== id),
    edges: d.edges.filter((e) => e.from !== id && e.to !== id),
  };
}

/** Structural problems the diagram itself shows. Empty = nothing obvious missing. */
export function findings(d: Diagram): string[] {
  if (!d.boxes.length) return [];
  const out: string[] = [];
  for (const s of STAGES)
    if (!d.boxes.some((b) => b.stage === s))
      out.push(`No ${STAGE_LABELS[s].toLowerCase()} step yet.`);
  const linked = new Set(d.edges.flatMap((e) => [e.from, e.to]));
  for (const b of d.boxes)
    if (!linked.has(b.id)) out.push(`“${b.label}” isn't connected to anything.`);
  const next = (id: string) => d.edges.filter((e) => e.from === id).map((e) => e.to);
  const seen = new Set<string>();
  const queue = d.boxes.filter((b) => b.stage === 'source').map((b) => b.id);
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...next(id));
  }
  const sources = d.boxes.some((b) => b.stage === 'source');
  const serves = d.boxes.filter((b) => b.stage === 'serve');
  if (sources && serves.length && !serves.some((b) => seen.has(b.id)))
    out.push('No path from a source to anything you serve: follow the arrows.');
  return out;
}

/** Plain-text outline of the design, e.g. to paste into notes or an AI mock prompt. */
export function outline(d: Diagram): string {
  const byId = new Map(d.boxes.map((b) => [b.id, b]));
  const name = (id: string) => {
    const b = byId.get(id)!;
    return `${b.label} (${STAGE_LABELS[b.stage]})`;
  };
  return d.edges.map((e) => `${name(e.from)} → ${name(e.to)}`).join('\n');
}
