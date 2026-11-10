const formatters = new Map();
export function validZone(zone) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); return typeof zone === 'string' && zone.length < 100; } catch { return false; }
}
export function parts(instant, zone) {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }));
  return Object.fromEntries(formatters.get(zone).formatToParts(new Date(instant)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
export function dateIn(instant, zone) { const p = parts(instant, zone); return `${p.year}-${p.month}-${p.day}`; }
export function timeIn(instant, zone) { const p = parts(instant, zone); return `${p.hour}:${p.minute}`; }
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
}
export function validTime(value) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || ''); }
export function addDays(value, count) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+count); return date.toISOString().slice(0,10); }
export function daysBetween(a, b) { return Math.round((Date.parse(`${b}T12:00:00Z`)-Date.parse(`${a}T12:00:00Z`))/86400000); }
export function weekday(value) { return new Date(`${value}T12:00:00Z`).getUTCDay() || 7; }
export function monday(value) { return addDays(value, 1-weekday(value)); }
export function minuteOfDay(value) { const [h,m] = value.split(':').map(Number); return h*60+m; }
export function zonedInstant(date, time, zone) {
  if (!validDate(date) || !validTime(time) || !validZone(zone)) throw new Error('Choose a valid date, time and timezone.');
  const [y,m,d] = date.split('-').map(Number), [h,min] = time.split(':').map(Number);
  const wall = Date.UTC(y,m-1,d,h,min);
  let value = wall;
  for (let i=0;i<5;i++) {
    const p = parts(value, zone);
    const represented = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
    const delta = wall-represented;
    if (!delta) break;
    value += delta;
  }
  const matches = candidate => dateIn(candidate, zone) === date && timeIn(candidate, zone) === time;
  if (!matches(value)) throw new Error('That local time does not exist because of a clock change. Choose another time.');
  // For repeated wall times choose the first occurrence consistently.
  for (const offset of [120,90,60,30]) if (matches(value-offset*60000)) value -= offset*60000;
  return new Date(value).toISOString();
}
export function windowFor(view, date) {
  if (view === 'day') return { from:date, to:date };
  if (['month','exams','deadlines'].includes(view)) {
    const first = `${date.slice(0,7)}-01`;
    const from = monday(first);
    return { from, to:addDays(from,41) };
  }
  const from = monday(date);
  return { from, to:addDays(from,6) };
}
export function labelDate(date, options = {}) { return new Intl.DateTimeFormat(undefined, { timeZone:'UTC', month:'short', day:'numeric', ...options }).format(new Date(`${date}T12:00:00Z`)); }
