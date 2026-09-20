function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toIso(local: string) {
  return new Date(local).toISOString();
}

export function formatWhen(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB");
}
