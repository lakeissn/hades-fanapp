const EXPLICIT_TIMEZONE_RE = /(z|[+-]\d{2}:?\d{2})$/i;

function pad2(value: string | number) {
  return String(value).padStart(2, "0");
}

function parseDatePartsAsKst(datePart: string, hour = 0, minute = 0, second = 0) {
  const normalizedDate = normalizeDatePart(datePart);
  if (!normalizedDate) return new Date("invalid");
  return new Date(`${normalizedDate}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+09:00`);
}


function normalizeDatePart(datePart: string) {
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseKstDate(value?: string) {
  if (!value) return null;

  const raw = value.trim();
  if (!raw || raw.replace(/\s+/g, "") === "진행중") return null;

  if (EXPLICIT_TIMEZONE_RE.test(raw)) {
    const explicit = new Date(raw);
    return Number.isNaN(explicit.getTime()) ? null : explicit;
  }

  const normalized = raw
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const amPmMatch = normalized.match(/^(\d{4}-\d{1,2}-\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (amPmMatch) {
    const [, datePart, amPm, rawHour, rawMinute, rawSecond] = amPmMatch;
    let hour = Number(rawHour);
    if (amPm === "오전" && hour === 12) hour = 0;
    if (amPm === "오후" && hour < 12) hour += 12;
    const parsed = parseDatePartsAsKst(datePart, hour, Number(rawMinute), Number(rawSecond ?? "0"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const numericMatch = normalized.match(/^(\d{4}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/);
  if (numericMatch) {
    const [, datePart, rawHour, rawMinute, rawSecond] = numericMatch;
    const parsed = parseDatePartsAsKst(
      datePart,
      Number(rawHour ?? "0"),
      Number(rawMinute ?? "0"),
      Number(rawSecond ?? "0"),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const direct = new Date(raw);
  return Number.isNaN(direct.getTime()) ? null : direct;
}
