import {
  useQuery,
} from '@tanstack/react-query';

import {
  getTopTenRankings,
} from '../../lib/rankings-api';

import {
  RankingPhoto,
} from './RankingPhoto';

import './RankingsPage.css';

export function ClientTopTenPanel() {
  const rankingsQuery =
    useQuery({
      queryKey: [
        'top-ten-rankings',
      ],

      queryFn:
        getTopTenRankings,

      staleTime: 60_000,
    });

  return (
    <section
      className="client-top-ten-panel"
      dir="rtl"
    >
      <header>
        <div>
          <p>نجوم الأكاديمية</p>
          <h2>أفضل 10 متدربين</h2>
        </div>

        <strong>🏆</strong>
      </header>

      {rankingsQuery.isPending && (
        <div className="rankings-empty">
          جارٍ تحميل الترتيب...
        </div>
      )}

      {rankingsQuery.isError && (
        <div className="rankings-error">
          تعذر تحميل الترتيب.
        </div>
      )}

      {rankingsQuery.data?.length ===
        0 && (
        <div className="rankings-empty">
          لم يتم نشر الترتيب بعد.
        </div>
      )}

      <div className="client-ranking-list">
        {rankingsQuery.data?.map(
          (item) => (
            <article
              key={item.traineeId}
            >
              <span className="client-ranking-number">
                {item.rank}
              </span>

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

              <div>
                <h3>
                  {item.fullName}
                </h3>

                <p>
                  {item.points} نقطة
                </p>
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
