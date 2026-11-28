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
  {
    id: 'partner-file-missing',
    title: "The partner's file didn't arrive",
    summary: 'A daily bank settlement file is missing and finance closes the books at 09:00.',
    levels: ['junior', 'mid', 'senior'],
    topic: ['incidents', 'file-ingestion', 'slas'],
    related: [
      'sql-feed-file-completeness',
      'sd-partner-file-ingestion',
      'sd-payments-ledger-reconciliation',
    ],
    start: 'alert',
    steps: {
      alert: {
        text: "06:15. The expected-file check alerts: **no settlement file from the bank for yesterday**. It's usually on the SFTP server by 04:00. Finance's reconciliation runs at 08:00 and closes at 09:00.",
        choices: [
          {
            label: 'Check the SFTP server and the load log yourself before contacting anyone',
            next: 'check',
            verdict: 'best',
            why: "Confirm it's really missing on your side first: the file may be there but stuck (wrong folder, a new name, a failed pickup or decryption).",
          },
          {
            label: 'Email the bank straight away asking them to send the file',
            next: 'alert',
            verdict: 'weak',
            why: "If the file is sitting in your landing folder under a new name, you've wasted their time and yours. Check your own side first; it takes two minutes.",
          },
          {
            label: 'Run the reconciliation with yesterday missing and fix it later',
            next: 'alert',
            verdict: 'weak',
            why: 'Finance would reconcile against incomplete data and every unmatched payment would look like a break. Partial data is worse than a clear delay.',
          },
        ],
      },
      check: {
        text: "The SFTP folder has no new file. The load log shows the pickup job ran at 04:00, 05:00 and 06:00 and found nothing. The bank's status page shows no incident.",
        choices: [
          {
            label:
              "Contact the bank's operations desk through the agreed channel, and tell finance there may be a delay",
            next: 'bank',
            verdict: 'best',
            why: 'Now it really is on their side. Use the contact in the integration runbook, and give finance a heads-up early so they can plan.',
          },
          {
            label: 'Keep waiting for the 07:00 pickup run before telling anyone',
            next: 'check',
            verdict: 'weak',
            why: "Finance needs time to plan around a delay. Silence until 07:00 leaves them one hour. Tell them now that it's late and when you'll update.",
          },
        ],
      },
      bank: {
        text: "08:10. The bank replies: their batch failed overnight, and they'll send the file around 11:00.",
        choices: [
          {
            label:
              "Tell finance the new time; agree to reconcile the other partners now and the bank's settlements when the file lands",
            next: 'arrive',
            verdict: 'best',
            why: 'Most of the close can proceed. A clear plan with a time is what finance needs, and per-partner loads make it possible.',
          },
          {
            label:
              "Load the day before's file again as a placeholder so the reconciliation has data",
            next: 'bank',
            verdict: 'weak',
            why: 'Duplicating old settlements creates false matches and breaks that someone has to unpick later. Never fake data to fill a gap.',
          },
        ],
      },
      arrive: {
        text: "11:05. The file arrives. The pipeline loads it into yesterday's business date, the trailer count matches, and 3 of 4,120 rows are rejected.",
        choices: [
          {
            label:
              "Rerun the bank's reconciliation for that date, send the 3 rejects to the bank, and close the alert",
            next: 'done',
            verdict: 'best',
            why: 'Because loads are idempotent per business date, a late file is a normal rerun. The rejects go back to the sender with line numbers.',
          },
          {
            label: "Load it into today's date so the dashboards pick it up faster",
            next: 'arrive',
            verdict: 'weak',
            why: 'Settlements belong to the business date they describe. Loading by arrival date shifts amounts between days and breaks the reconciliation.',
          },
        ],
      },
      done: {
        text: "Finance closes at 12:30 instead of 09:00, with complete data. Follow-ups: alert at 05:00 rather than 06:15 for this partner, add the bank's operations contact and escalation path to the runbook, and ask the bank to notify you when their batch fails.",
      },
    },
  },
  {
    id: 'reject-rate-spike',
    title: 'The reject rate jumped to 30%',
    summary: 'A customer feed that normally rejects 1% of rows suddenly rejects almost a third.',
    levels: ['junior', 'mid', 'senior'],
    topic: ['incidents', 'reject-handling', 'data-quality'],
    related: [
      'sql-feed-reject-reasons',
      'python-fixed-width-parser',
      'sql-upsert-change-detection',
    ],
    start: 'alert',
    steps: {
      alert: {
        text: "The customer feed load finished, but the reject-rate monitor fired: **31% of rows rejected** (usual: under 1%). The load's threshold is 5%, so the valid rows were **not** loaded.",
        choices: [
          {
            label: 'Group the rejects by reason and look at a few raw lines',
            next: 'reasons',
            verdict: 'best',
            why: 'A sudden spike almost always has one cause. Counts by reason plus a handful of raw lines usually show it in minutes.',
          },
          {
            label: 'Raise the threshold to 35% so the valid rows load',
            next: 'alert',
            verdict: 'weak',
            why: 'The threshold just did its job. Loading now would publish a third of customers as missing changes, without knowing why.',
          },
        ],
      },
      reasons: {
        text: 'Almost all rejects are `bad_timestamp`. The raw values look like `2024-03-14T10:22:05Z`; before today they were `2024-03-14 10:22:05`.',
        choices: [
          {
            label:
              'Check with the source team whether the format change is intentional and permanent',
            next: 'confirm',
            verdict: 'best',
            why: "It's a format change, not bad data. Before changing the parser, confirm it's deliberate, which timezone it uses, and whether it applies to all fields.",
          },
          {
            label: 'Patch the parser to accept both formats and rerun immediately',
            next: 'confirm',
            verdict: 'ok',
            why: 'Probably the right fix, but the `Z` means UTC; if the old values were local time, accepting both silently shifts timestamps. Confirm the semantics first, or at least in parallel.',
          },
          {
            label: 'Manually edit the file to the old format and reload it',
            next: 'reasons',
            verdict: 'weak',
            why: "Hand-editing a source file breaks the audit trail, and tomorrow's file will fail the same way.",
          },
        ],
      },
      confirm: {
        text: 'The source team confirms: they upgraded their export tool. Timestamps are now ISO 8601 in UTC; the old ones were in UTC too, just without the marker. No other fields changed.',
        choices: [
          {
            label:
              'Add the new format as a new layout version effective today, reprocess the raw file, and check the reject rate is back to normal',
            next: 'done',
            verdict: 'best',
            why: 'A versioned layout keeps old files parseable and makes the change explicit. Reprocessing from the raw file needs no resend.',
          },
          {
            label: 'Replace the old format everywhere with the new one',
            next: 'confirm',
            verdict: 'weak',
            why: 'Backfills and reprocessing of older files would then fail. Keep both formats, chosen by effective date.',
          },
        ],
      },
      done: {
        text: 'The reprocessed file rejects 0.8% of rows and loads at 10:40. Follow-ups: ask the source team for change notice in the data contract, and add a check that alerts on a new rejection reason dominating, which points straight at format changes.',
      },
    },
  },
];
