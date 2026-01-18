export const TRAIN_CLASS_OPTIONS = [
  "2AC | Air Conditioned 2 Tier Class",
  "3AC | Air Conditioned 3 Tier Class",
  "SL | Sleeper Class",
] as const;

const TRAIN_CLASS_ALIASES: Array<[RegExp, (typeof TRAIN_CLASS_OPTIONS)[number]]> = [
  [
    /(2\s*ac|second\s*ac|ac\s*2|ii\s*ac|air[-\s]*conditioned\s*two[-\s]*tier)/i,
    "2AC | Air Conditioned 2 Tier Class",
  ],
  [
    /(3\s*ac|third\s*ac|ac\s*3|iii\s*ac|air[-\s]*conditioned\s*three[-\s]*tier)/i,
    "3AC | Air Conditioned 3 Tier Class",
  ],
  [/(sl|sleeper)/i, "SL | Sleeper Class"],
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
