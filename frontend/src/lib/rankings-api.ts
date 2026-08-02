import {
  api,
} from './api';

import type {
  RankingItem,
} from '../types/rankings';

function unwrap<T>(
  payload: unknown,
): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload
  ) {
    return (
      payload as {
        data: T;
      }
    ).data;
  }

  return payload as T;
}

export async function
getAdminRankings():
Promise<RankingItem[]> {
  const response =
    await api.get(
      '/rankings/admin',
    );

  return unwrap<RankingItem[]>(
    response.data,
  );
}

export async function
getTopTenRankings():
Promise<RankingItem[]> {
  const response =
    await api.get(
      '/rankings/top-ten',
    );

  return unwrap<RankingItem[]>(
    response.data,
  );
}

export async function
updateTraineeRanking(
  traineeId: string,
  points: number,
): Promise<RankingItem> {
  const response =
    await api.put(
      `/rankings/${traineeId}`,
      {
        points,
      },
    );

  return unwrap<RankingItem>(
    response.data,
  );
}

export async function
deleteTraineeRanking(
  traineeId: string,
): Promise<void> {
  await api.delete(
    `/rankings/${traineeId}`,
  );
}
