import '../env';
import db from '../lib/db';

setInterval(async () => {
  // temp fix: kills long query regularly
  const result =
    await db.$queryRaw`select pg_cancel_backend(pid) from (SELECT pid, query_start, age(clock_timestamp(), query_start) as age, usename, query, state
  FROM pg_stat_activity
  WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
  ORDER BY query_start desc) as q
  where age > '00:00:30'`;
  console.log(result);
}, 1000 * 30);
