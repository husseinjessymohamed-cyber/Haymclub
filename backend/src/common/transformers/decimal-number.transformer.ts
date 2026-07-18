import type { ValueTransformer } from 'typeorm';

export const decimalNumberTransformer: ValueTransformer = {
  to(value: number | null | undefined) {
    return value ?? 0;
  },

  from(value: string | number | null) {
    if (value === null) {
      return 0;
    }

    return Number(value);
  },
};
