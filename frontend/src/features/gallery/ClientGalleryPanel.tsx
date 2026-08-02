import {
  useQuery,
} from '@tanstack/react-query';

import {
  getClientGallery,
} from '../../lib/gallery-api';

import {
  GalleryMedia,
} from './GalleryMedia';

import './GalleryPage.css';

export function ClientGalleryPanel() {
  const galleryQuery =
    useQuery({
      queryKey: [
        'client-gallery',
      ],

      queryFn:
        getClientGallery,

      staleTime: 60_000,
    });

  return (
    <section
      className="client-gallery-panel"
      dir="rtl"
    >
      <header>
        <div>
          <p>لحظات من الأكاديمية</p>

          <h2>
            معرض الصور والفيديوهات
          </h2>
        </div>

        <strong>
          {galleryQuery
            .data?.length ?? 0}
        </strong>
      </header>

      {galleryQuery.isPending && (
        <div className="gallery-state">
          جارٍ تحميل المعرض...
        </div>
      )}

      {galleryQuery.isError && (
        <div className="gallery-error">
          تعذر تحميل المعرض.
        </div>
      )}

      {galleryQuery.data?.length ===
        0 && (
        <div className="gallery-state">
          لا يوجد محتوى منشور حاليًا.
        </div>
      )}

      <div className="client-gallery-grid">
        {galleryQuery.data?.map(
          (item) => (
            <article
              key={item.id}
              className="client-gallery-card"
            >
              <div className="gallery-media">
                <GalleryMedia
                  item={item}
                />
              </div>

              <div className="gallery-card-body">
                <h3>
                  {item.title}
                </h3>

                {item.description && (
                  <p>
                    {item.description}
                  </p>
                )}
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
