export type ManufacturerResponseSample = {
  selectedAt: Date;
  firstRespondedAt: Date;
};

const MAX_VALID_RESPONSE_MINUTES = 7 * 24 * 60;

export function getResponseMinutes(sample: ManufacturerResponseSample): number | null {
  const minutes = Math.round((sample.firstRespondedAt.getTime() - sample.selectedAt.getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > MAX_VALID_RESPONSE_MINUTES) return null;
  return Math.max(1, minutes);
}

/** A median avoids one forgotten quote distorting the customer expectation. */
export function getTypicalResponseMinutes(samples: ManufacturerResponseSample[]): number | null {
  const minutes = samples
    .map(getResponseMinutes)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (minutes.length === 0) return null;
  const middle = Math.floor(minutes.length / 2);
  return minutes.length % 2 === 1
    ? minutes[middle]
    : Math.round((minutes[middle - 1] + minutes[middle]) / 2);
}
