import type { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  to(value: number | null | undefined) {
    return value ?? 0;
  },

  from(value: string | number | null) {
    return Number(value ?? 0);
  },
};
