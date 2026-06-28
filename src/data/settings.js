// User-level settings persisted to localStorage.
// Currently just bodyweight, used to give bodyweight exercises a realistic
// tonnage contribution (bodyweight × per-exercise load factor + any added weight).

const BW_KEY = 'gym-tracker:bodyweight';
const DEFAULT_BODYWEIGHT = 70;

export function getBodyweight() {
  try {
    const v = Number(localStorage.getItem(BW_KEY));
    return v > 0 ? v : DEFAULT_BODYWEIGHT;
  } catch {
    return DEFAULT_BODYWEIGHT;
  }
}

export function setBodyweight(kg) {
  const n = Number(kg);
  if (!(n > 0)) return;
  try { localStorage.setItem(BW_KEY, String(n)); } catch { /* noop */ }
}
