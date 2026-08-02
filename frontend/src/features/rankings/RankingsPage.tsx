import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  deleteTraineeRanking,
  getAdminRankings,
  updateTraineeRanking,
} from '../../lib/rankings-api';

import {
  RankingPhoto,
} from './RankingPhoto';

import './RankingsPage.css';

export function RankingsPage() {
  const queryClient =
    useQueryClient();

  const [draftPoints, setDraftPoints] =
    useState<Record<string, number>>(
      {},
    );

  const rankingsQuery =
    useQuery({
      queryKey: [
        'admin-rankings',
      ],

      queryFn:
        getAdminRankings,
    });

  useEffect(() => {
    if (!rankingsQuery.data) {
      return;
    }

    const next:
      Record<string, number> = {};

    for (
      const item of
      rankingsQuery.data
    ) {
      next[item.traineeId] =
        item.points;
    }

    setDraftPoints(next);
  }, [rankingsQuery.data]);

  const saveMutation =
    useMutation({
      mutationFn: ({
        traineeId,
        points,
      }: {
        traineeId: string;
        points: number;
      }) =>
        updateTraineeRanking(
          traineeId,
          points,
        ),

      onSuccess: async () => {
        await queryClient
          .invalidateQueries({
            queryKey: [
              'admin-rankings',
            ],
          });

        await queryClient
          .invalidateQueries({
            queryKey: [
              'top-ten-rankings',
            ],
          });
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn:
        deleteTraineeRanking,

      onSuccess: async () => {
        await queryClient
          .invalidateQueries({
            queryKey: [
              'admin-rankings',
            ],
          });

        await queryClient
          .invalidateQueries({
            queryKey: [
              'top-ten-rankings',
            ],
          });
      },
    });

  const topTen =
    useMemo(
      () =>
        (rankingsQuery.data ?? [])
          .filter(
            (item) =>
              item.points > 0,
          )
          .slice(0, 10),
      [rankingsQuery.data],
    );

  return (
    <main
      className="rankings-page"
      dir="rtl"
    >
      <header className="rankings-header">
        <div>
          <p>تقييم أداء المتدربين</p>

          <h1>
            أفضل 10 متدربين
          </h1>

          <span>
            أضف نقاط الأداء ليتم ترتيب
            المتدربين تلقائيًا.
          </span>
        </div>
      </header>

      <section className="rankings-top-section">
        <header>
          <div>
            <p>لوحة الشرف</p>
            <h2>الترتيب الحالي</h2>
          </div>

          <strong>
            {topTen.length}/10
          </strong>
        </header>

        {topTen.length === 0 ? (
          <div className="rankings-empty">
            لم تتم إضافة نقاط
            للمتدربين بعد.
          </div>
        ) : (
          <div className="rankings-top-grid">
            {topTen.map(
              (item, index) => (
                <article
                  key={item.traineeId}
                  className={
                    index < 3
                      ? `ranking-card top-${index + 1}`
                      : 'ranking-card'
                  }
                >
                  <span className="ranking-position">
                    {index + 1}
                  </span>

                  <div className="ranking-photo">
                    <RankingPhoto
                      imageUrl={
                        item.profileImageUrl
                      }
                      name={
                        item.fullName
                      }
                    />
                  </div>

                  <h3>
                    {item.fullName}
                  </h3>

                  <p>
                    {item.registrationCode}
                  </p>

                  <strong>
                    {item.points} نقطة
                  </strong>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="rankings-management">
        <header>
          <div>
            <p>إدارة النقاط</p>
            <h2>جميع المتدربين</h2>
          </div>

          <strong>
            {rankingsQuery
              .data?.length ?? 0}
          </strong>
        </header>

        {rankingsQuery.isPending && (
          <div className="rankings-empty">
            جارٍ تحميل المتدربين...
          </div>
        )}

        {rankingsQuery.isError && (
          <div className="rankings-error">
            تعذر تحميل المتدربين.
          </div>
        )}

        <div className="rankings-table-wrapper">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>المتدرب</th>
                <th>الكود</th>
                <th>النقاط</th>
                <th>الإجراء</th>
              </tr>
            </thead>

            <tbody>
              {rankingsQuery.data?.map(
                (item) => (
                  <tr
                    key={
                      item.traineeId
                    }
                  >
                    <td>
                      <div className="ranking-trainee-cell">
                        <div className="ranking-small-photo">
                          <RankingPhoto
                            imageUrl={
                              item.profileImageUrl
                            }
                            name={
                              item.fullName
                            }
                          />
                        </div>

                        <strong>
                          {item.fullName}
                        </strong>
                      </div>
                    </td>

                    <td>
                      {item.registrationCode}
                    </td>

                    <td>
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        value={
                          draftPoints[
                            item.traineeId
                          ] ?? 0
                        }
                        onChange={(event) =>
                          setDraftPoints(
                            (current) => ({
                              ...current,
                              [item.traineeId]:
                                Math.max(
                                  0,
                                  Number(
                                    event.target.value,
                                  ) || 0,
                                ),
                            }),
                          )
                        }
                      />
                    </td>

                    <td>
                      <div className="ranking-actions">
                        <button
                          type="button"
                          disabled={
                            saveMutation
                              .isPending
                          }
                          onClick={() =>
                            saveMutation
                              .mutate({
                                traineeId:
                                  item.traineeId,
                                points:
                                  draftPoints[
                                    item.traineeId
                                  ] ?? 0,
                              })
                          }
                        >
                          حفظ
                        </button>

                        {item.points > 0 && (
                          <button
                            type="button"
                            className="ranking-remove"
                            disabled={
                              deleteMutation
                                .isPending
                            }
                            onClick={() =>
                              deleteMutation
                                .mutate(
                                  item.traineeId,
                                )
                            }
                          >
                            تصفير
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
