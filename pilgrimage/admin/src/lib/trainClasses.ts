export const TRAIN_CLASS_OPTIONS = [
  "Air-Conditioned Executive Chair Class (EC)",
  "Air-Conditioned First Class (1AC)",
  "Air-Conditioned Two-Tier Class (2AC)",
  "Air-Conditioned Three-Tier Class (3AC)",
  "First Class (FC)",
  "AC Chair Class (CC)",
  "Sleeper Class (SL)",
  "Second Sitting Class (2S)",
  "Unreserved/General Class (Gen)",
] as const;

const TRAIN_CLASS_ALIASES: Array<[RegExp, (typeof TRAIN_CLASS_OPTIONS)[number]]> = [
  [/^(ec|executive\s*chair)/i, "Air-Conditioned Executive Chair Class (EC)"],
  [/^(1\s*ac|first\s*ac|ac\s*first)/i, "Air-Conditioned First Class (1AC)"],
  [/^(2\s*ac|second\s*ac|ac\s*2|ii\s*ac)/i, "Air-Conditioned Two-Tier Class (2AC)"],
  [/^(3\s*ac|third\s*ac|ac\s*3|iii\s*ac)/i, "Air-Conditioned Three-Tier Class (3AC)"],
  [/^(fc|first\s*class)$/i, "First Class (FC)"],
  [/^(cc|chair\s*class|ac\s*chair)/i, "AC Chair Class (CC)"],
  [/^(sl|sleeper)/i, "Sleeper Class (SL)"],
  [/^(2\s*s|second\s*sitting)/i, "Second Sitting Class (2S)"],
  [/^(gen|general|unreserved)/i, "Unreserved/General Class (Gen)"],
];

export const normalizeTrainClass = (value?: string | null) => {
  const raw = value?.trim();
  if (!raw) return "";
  const exact = TRAIN_CLASS_OPTIONS.find((option) => option.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const match = TRAIN_CLASS_ALIASES.find(([regex]) => regex.test(raw));
  if (match) return match[1];
  return raw;
};
