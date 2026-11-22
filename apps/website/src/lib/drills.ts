// Incident drills (PLAN.md Phase 8): branching "what do you check next?" scenarios.
// Each step offers moves; a weak move loops back to the same step (`next` = its own id) so the
// reader tries again, a good move advances. `drills.test.ts` checks every graph.
import type {Level} from './questions';

export type Verdict = 'best' | 'ok' | 'weak';
export type Choice = {label: string; next: string; verdict: Verdict; why: string};
export type Step = {text: string; choices?: Choice[]}; // no choices = the drill ends here
export type Drill = {
  id: string;
  title: string;
  summary: string;
  levels: Level[];
  topic: string[];
  related: string[]; // question ids
  start: string;
  steps: Record<string, Step>;
};

export const DRILLS: Drill[] = [
  {
    id: 'late-finance-dag',
    title: 'The finance dashboard is 3 hours late',
    summary: 'A daily Airflow DAG has not finished. Finance closes the month today.',
    levels: ['junior', 'mid', 'senior'],
    topic: ['incidents', 'orchestration', 'airflow'],
    related: [
      'tools-airflow-idempotent-dags',
      'sd-daily-batch-with-backfills',
      'behavioral-production-incident',
    ],
    start: 'page',
    steps: {
      page: {
        text: "08:55. A finance analyst messages you: the revenue dashboard still shows the day before yesterday. It normally refreshes by 06:00. Month-end close starts at 10:00. You're on call.",
        choices: [
          {
            label: 'Acknowledge in the team channel, then open the DAG in Airflow',
            next: 'airflow',
            verdict: 'best',
            why: 'A one-line acknowledgement stops five people from investigating the same thing, and the orchestrator shows where the run is stuck.',
          },
          {
            label: 'Clear and rerun the whole DAG right away',
            next: 'page',
            verdict: 'weak',
            why: "You don't know why it's late yet. A full rerun can take hours, may double-load non-idempotent tasks, and might hit the same failure again.",
          },
          {
            label: 'Query the warehouse to see which tables are stale',
            next: 'airflow',
            verdict: 'ok',
            why: "Useful, but it tells you the symptom, not the cause. The DAG run view answers 'where is it stuck' faster. Remember to tell people you're on it.",
          },
        ],
      },
      airflow: {
        text: "Today's run shows the first 6 tasks green. `load_payments` has been **running for 3 h 10 min**; it usually takes 15 minutes. Downstream tasks are waiting. No task has failed.",
        choices: [
          {
            label: 'Open the task log and check what the task is actually doing',
            next: 'log',
            verdict: 'best',
            why: "A 'running' task can be working, stuck on a lock, or waiting on a source. The log shows which.",
          },
          {
            label: 'Mark the task as failed so the DAG retries it',
            next: 'airflow',
            verdict: 'weak',
            why: 'If it is blocked on something external, the retry blocks again. You also lose the evidence of what was happening.',
          },
          {
            label: 'Add a timeout to the task so this never happens again',
            next: 'airflow',
            verdict: 'weak',
            why: "A good follow-up for the post-incident review, but it doesn't help finance at 10:00. Mitigate first, prevent later.",
          },
        ],
      },
      log: {
        text: 'The log shows the extract finished in 4 minutes: **38 million rows** (a normal day is about 1.2 million). The task has been inserting since then. The payments source team announced a backfill of historical refunds yesterday.',
        choices: [
          {
            label:
              'Confirm with the source team whether those rows are expected, and post an ETA to finance',
            next: 'decide',
            verdict: 'best',
            why: 'A 30× volume jump has a likely explanation; confirming it decides whether the data is valid. Finance needs a realistic time, not silence.',
          },
          {
            label: 'Kill the task and load only rows newer than yesterday',
            next: 'log',
            verdict: 'weak',
            why: "If the backfill corrected real refunds, dropping them makes month-end revenue wrong. Don't change what data means without the people who own it.",
          },
        ],
      },
      decide: {
        text: 'The source team confirms: the refunds are real and must be in the close. At the current rate the insert needs about 2 more hours. Finance says they can start at 11:30 if the numbers are complete.',
        choices: [
          {
            label:
              "Let it finish, check the downstream tasks' runtime, and give finance a firm 11:30 with a check-in at 10:30",
            next: 'done',
            verdict: 'best',
            why: 'Correct data beats fast data for a close, and a mid-point update keeps trust if the estimate slips.',
          },
          {
            label: 'Stop it and switch the load to a bulk COPY from staged files, then rerun',
            next: 'done',
            verdict: 'ok',
            why: 'Could be faster, but changing the load path mid-incident is risky: you must be sure the partial insert is rolled back or the task is idempotent. Worth it only if you have done it before.',
          },
        ],
      },
      done: {
        text: 'Data lands at 11:05; finance starts at 11:30. In the review you propose: a row-count anomaly check before load, runtime alerts at 2× the usual duration (paging before a human notices), bulk loading for large days, and a channel where source teams announce backfills.',
      },
    },
  },
  {
    id: 'revenue-drop',
    title: "Yesterday's revenue dropped 40%",
    summary: 'The pipeline ran green, but a key metric looks very wrong.',
    levels: ['junior', 'mid', 'senior'],
    topic: ['incidents', 'data-quality', 'deduplication'],
    related: [
      'sql-dedup-replayed-transactions',
      'sd-payments-ledger-reconciliation',
      'behavioral-metric-definition-dispute',
    ],
    start: 'report',
    steps: {
      report: {
        text: "The head of sales posts a screenshot: yesterday's revenue on the executive dashboard is **40% below** the same weekday last week. Every pipeline task is green.",
        choices: [
          {
            label: 'Compare the dashboard number to the warehouse table it reads from',
            next: 'layer',
            verdict: 'best',
            why: 'Find which layer the number changes in: dashboard, mart, staging or source. That halves the search space each step.',
          },
          {
            label: 'Reply that the pipeline succeeded, so the numbers must be right',
            next: 'report',
            verdict: 'weak',
            why: 'Green tasks only mean nothing crashed. Data can be late, partial or duplicated with every task succeeding.',
          },
          {
            label: 'Check whether there was a real business reason (holiday, outage, promo end)',
            next: 'layer',
            verdict: 'ok',
            why: "Worth a quick look (a regional holiday explains plenty of 'drops'), but verify the data path too before you answer.",
          },
        ],
      },
      layer: {
        text: 'The mart `fct_orders` matches the dashboard. In staging, yesterday has 61,000 orders; the source database has **102,000** for the same day.',
        choices: [
          {
            label: 'Check when the extract ran and what time range it covered',
            next: 'window',
            verdict: 'best',
            why: 'Missing rows between source and staging usually mean the extract window or its timezone is off, or the load was partial.',
          },
          {
            label: 'Rebuild the mart from staging',
            next: 'layer',
            verdict: 'weak',
            why: 'The mart already matches staging. Rebuilding it reproduces the same wrong number.',
          },
        ],
      },
      window: {
        text: 'The extract filters `created_at >= :day AND created_at < :day + 1`. Last week the source team moved the database to a new host, and its timestamps changed from UTC to **America/New_York local time**.',
        choices: [
          {
            label: 'Confirm by counting source rows per hour in both UTC and local time',
            next: 'fix',
            verdict: 'best',
            why: 'A per-hour count shows the 4–5 hour shift directly, so you can prove the cause instead of guessing.',
          },
          {
            label: 'Widen the extract window by a day so nothing is missed',
            next: 'window',
            verdict: 'weak',
            why: 'Without deduplication or a merge, the overlap double-counts orders. You would trade a drop for a spike.',
          },
        ],
      },
      fix: {
        text: "Confirmed: since the migration, the last ~5 hours of each day land in the next day's extract, and the first 5 hours of each day were never extracted at all.",
        choices: [
          {
            label:
              'Fix the extract to convert to UTC, backfill the affected days idempotently, then tell the dashboard users what changed',
            next: 'done',
            verdict: 'best',
            why: 'Fixing forward, backfilling with overwrite or merge semantics, and announcing the correction is the full repair.',
          },
          {
            label: 'Patch yesterday by hand-inserting the missing rows',
            next: 'fix',
            verdict: 'weak',
            why: "Every day since the migration is wrong, and tomorrow will be too. A manual patch isn't repeatable or auditable.",
          },
        ],
      },
      done: {
        text: 'Revenue is corrected for 6 days and the executive team gets a short note. Follow-ups: a source-vs-warehouse row-count reconciliation per day, a freshness and volume anomaly check on `fct_orders`, and storing timestamps as UTC with an explicit timezone in the extract contract.',
      },
    },
  },
  {
    id: 'kafka-consumer-lag',
    title: 'Kafka consumer lag keeps climbing',
    summary: 'A streaming job is falling behind and real-time features are going stale.',
    levels: ['mid', 'senior'],
    topic: ['incidents', 'kafka', 'stream-processing'],
    related: [
      'tools-kafka-partitions-and-ordering',
      'tools-kafka-delivery-guarantees',
      'sd-real-time-fraud-features',
    ],
    start: 'alert',
    steps: {
      alert: {
        text: 'An alert fires: consumer group `fraud-features` on topic `payments` (24 partitions) has a lag of **1.8 million messages**, up from near zero an hour ago, and growing. Fraud scoring uses features up to 20 minutes stale.',
        choices: [
          {
            label: 'Look at lag per partition, not just the total',
            next: 'partitions',
            verdict: 'best',
            why: 'Lag spread evenly means the whole consumer is slow or input rose. Lag on a few partitions means skew or a stuck consumer.',
          },
          {
            label: 'Add more consumer instances',
            next: 'alert',
            verdict: 'weak',
            why: "If the problem is one hot partition, more consumers don't help: a partition is read by one consumer in the group. Diagnose first.",
          },
        ],
      },
      partitions: {
        text: '23 partitions have near-zero lag. **Partition 7** alone holds 1.75 million of the lag. Input rate to the topic is normal overall.',
        choices: [
          {
            label: 'Check the consumer handling partition 7 for errors and rebalances',
            next: 'consumer',
            verdict: 'best',
            why: 'With normal input and one lagging partition, the consumer on that partition is the first suspect.',
          },
          {
            label: 'Increase the topic to 48 partitions',
            next: 'partitions',
            verdict: 'weak',
            why: 'Adding partitions changes the key-to-partition mapping (breaking per-key ordering) and does nothing for the backlog already in partition 7.',
          },
        ],
      },
      consumer: {
        text: 'Its logs show the same message failing to deserialize, then the consumer restarting from the last committed offset, over and over. A producer deployed a new schema version 70 minutes ago.',
        choices: [
          {
            label:
              'Send the bad record to a dead-letter topic and skip it, so the consumer moves on',
            next: 'recover',
            verdict: 'best',
            why: 'A poison message must not block a partition. Park it with its offset for later replay and let the rest flow.',
          },
          {
            label: 'Manually reset the group offset past the bad message',
            next: 'recover',
            verdict: 'ok',
            why: 'Gets you moving, but the record is lost unless you copy it first, and the next bad message stops you again. Add dead-letter handling as the real fix.',
          },
          {
            label: 'Ask the producer team to roll back',
            next: 'consumer',
            verdict: 'weak',
            why: 'A rollback stops new bad messages, but the one already in the log still blocks the partition. You need both.',
          },
        ],
      },
      recover: {
        text: 'Partition 7 is moving again and lag is falling. The producer team confirms the new schema added a required field without a default, which is not backward compatible.',
        choices: [
          {
            label:
              'Ask for compatibility checks in the schema registry (BACKWARD) and alert on per-partition lag and dead-letter volume',
            next: 'done',
            verdict: 'best',
            why: 'The registry rejects incompatible schemas at publish time, and per-partition alerts catch a stuck partition in minutes instead of an hour.',
          },
          {
            label: 'Close the incident; lag is back to normal',
            next: 'recover',
            verdict: 'weak',
            why: 'Nothing prevents the next incompatible schema. An incident is done when the cause is understood and a follow-up is owned.',
          },
        ],
      },
      done: {
        text: 'Lag is back to zero in 25 minutes. The 1 parked message is replayed after a consumer fix. In the review: schema compatibility enforced in the registry, dead-letter handling on every consumer, and alerts on max partition lag instead of total lag.',
      },
    },
  },
];
