// Service schedule helpers. Saturday 5PM + Sunday 8 / 9:30 / 11AM.
// Source: project memory.

type Service = { day: number; hour: number; minute: number; label: string };

export const SERVICES: Service[] = [
  { day: 6, hour: 17, minute: 0, label: 'Saturday 5:00 PM' },
  { day: 0, hour: 8, minute: 0, label: 'Sunday 8:00 AM' },
  { day: 0, hour: 9, minute: 30, label: 'Sunday 9:30 AM' },
  { day: 0, hour: 11, minute: 0, label: 'Sunday 11:00 AM' },
];

const SERVICE_LENGTH_MIN = 75;

function nextDateForService(now: Date, s: Service): Date {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setHours(s.hour, s.minute, 0, 0);
  const dayDiff = (s.day - now.getDay() + 7) % 7;
  if (dayDiff === 0 && d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + dayDiff);
  }
  return d;
}

export function nextServiceLabel(now = new Date()): string {
  const upcoming = SERVICES.map((s) => ({ s, when: nextDateForService(now, s) })).sort(
    (a, b) => a.when.getTime() - b.when.getTime()
  );
  const next = upcoming[0];
  const days = Math.floor((next.when.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return `Today · ${formatTime(next.s)}`;
  if (days === 1) return `Tomorrow · ${formatTime(next.s)}`;
  return next.s.label;
}

function formatTime(s: Service) {
  const h12 = ((s.hour + 11) % 12) + 1;
  const m = s.minute === 0 ? '' : `:${String(s.minute).padStart(2, '0')}`;
  const ampm = s.hour < 12 ? 'AM' : 'PM';
  return `${h12}${m} ${ampm}`;
}

export function isServiceLive(now = new Date()): boolean {
  const minsNow = now.getHours() * 60 + now.getMinutes();
  return SERVICES.some((s) => {
    if (s.day !== now.getDay()) return false;
    const start = s.hour * 60 + s.minute;
    return minsNow >= start && minsNow <= start + SERVICE_LENGTH_MIN;
  });
}
