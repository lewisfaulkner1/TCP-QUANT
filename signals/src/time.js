// Dates in the display time zone (Europe/London by default), without any date library.

export function localParts(iso, tz) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short', timeZoneName: 'short',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: parts.weekday, // Mon, Tue ...
    tz: parts.timeZoneName, // BST, GMT ...
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const utc = (dateStr) => { const [y, m, d] = dateStr.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const ymd = (d) => d.toISOString().slice(0, 10);

/** ISO week key of a local date, e.g. 2026-W39. */
export function isoWeek(dateStr) {
  const d = utc(dateStr);
  const thu = new Date(d); thu.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(thu.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thu - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${thu.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday of an ISO week key. */
export function weekMonday(key) {
  const [y, w] = key.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const mon = new Date(jan4); mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (w - 1) * 7);
  return mon;
}

/** Title and Monday-Friday label for a week key: {title: 'Week 39', dates: '21 – 25 Sep 2026'}. */
export function weekLabel(key) {
  const mon = weekMonday(key);
  const fri = new Date(mon); fri.setUTCDate(mon.getUTCDate() + 4);
  const d = (x) => x.getUTCDate(), m = (x) => MONTHS[x.getUTCMonth()], y = (x) => x.getUTCFullYear();
  let dates;
  if (y(mon) !== y(fri)) dates = `${d(mon)} ${m(mon)} ${y(mon)} – ${d(fri)} ${m(fri)} ${y(fri)}`;
  else if (m(mon) !== m(fri)) dates = `${d(mon)} ${m(mon)} – ${d(fri)} ${m(fri)} ${y(fri)}`;
  else dates = `${d(mon)} – ${d(fri)} ${m(fri)} ${y(fri)}`;
  return { title: `Week ${Number(key.split('-W')[1])}`, dates };
}

/** The week to report on: the one holding the most recent Friday on or before this local date. */
export function reportWeek(localDate) {
  const d = utc(localDate);
  const back = (d.getUTCDay() - 5 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return isoWeek(ymd(d));
}

export function prettyDate(localDate) {
  const d = utc(localDate);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
