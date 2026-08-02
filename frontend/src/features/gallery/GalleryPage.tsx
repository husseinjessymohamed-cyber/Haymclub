import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import axios from 'axios';

import {
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  deleteGalleryItem,
  getAdminGallery,
  uploadGalleryItem,
} from '../../lib/gallery-api';

import {
  GalleryMedia,
} from './GalleryMedia';

import './GalleryPage.css';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
];

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'ar-EG',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

function errorMessage(
  error: unknown,
): string {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join('، ');
    }

    if (
      typeof message === 'string'
    ) {
      return message;
    }

    if (!error.response) {
      return 'تعذر الاتصال بالخادم.';
    }
  }

  return 'تعذر تنفيذ العملية.';
}

export function GalleryPage() {
  const queryClient =
    useQueryClient();

  const [title, setTitle] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [file, setFile] =
    useState<File | null>(null);

  const [inputKey, setInputKey] =
    useState(0);

  const [
    localError,
    setLocalError,
  ] = useState('');

  const galleryQuery =
    useQuery({
      queryKey: [
        'admin-gallery',
      ],

      queryFn:
        getAdminGallery,
    });

  const uploadMutation =
    useMutation({
      mutationFn:
        uploadGalleryItem,

      onSuccess: async () => {
        setTitle('');
        setDescription('');
        setFile(null);

        setInputKey(
          (value) => value + 1,
        );

        await queryClient
          .invalidateQueries({
            queryKey: [
              'admin-gallery',
            ],
          });
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn:
        deleteGalleryItem,

      onSuccess: async () => {
        await queryClient
          .invalidateQueries({
            queryKey: [
              'admin-gallery',
            ],
          });
      },
    });

  function selectFile(
    selected:
      File | undefined,
  ): void {
    setLocalError('');

    if (!selected) {
      setFile(null);
      return;
    }

    if (
      !ALLOWED_TYPES.includes(
        selected.type,
      )
    ) {
      setLocalError(
        'يسمح بصور JPG أو PNG أو WEBP وفيديو MP4 أو WEBM فقط.',
      );

      setFile(null);
      return;
    }

    const isVideo =
      selected.type.startsWith(
        'video/',
      );

    const maximumSize =
      isVideo
        ? 25 * 1024 * 1024
        : 5 * 1024 * 1024;

    if (
      selected.size >
      maximumSize
    ) {
      setLocalError(
        isVideo
          ? 'حجم الفيديو يجب ألا يتجاوز 25MB.'
          : 'حجم الصورة يجب ألا يتجاوز 5MB.',
      );

      setFile(null);
      return;
    }

    setFile(selected);
  }

  function submit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    setLocalError('');

    if (!file) {
      setLocalError(
        'اختر صورة أو فيديو أولًا.',
      );

      return;
    }

    uploadMutation.mutate({
      file,
      title,
      description:
        description.trim() ||
        undefined,
    });
  }

  return (
    <main
      className="gallery-page"
      dir="rtl"
    >
      <header className="gallery-header">
        <div>
          <p>محتوى الأكاديمية</p>

          <h1>
            معرض الصور والفيديوهات
          </h1>

          <span>
            شارك صور التدريبات
            والبطولات والفيديوهات
            القصيرة مع المتدربين.
          </span>
        </div>
      </header>

      <section className="gallery-layout">
        <form
          className="gallery-upload-form"
          onSubmit={submit}
        >
          <h2>إضافة عنصر جديد</h2>

          <label>
            العنوان

            <input
              value={title}
              maxLength={180}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            الوصف

            <textarea
              value={description}
              maxLength={2000}
              rows={4}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="وصف اختياري"
            />
          </label>

          <label>
            الصورة أو الفيديو

            <input
              key={inputKey}
              type="file"
              accept={
                ALLOWED_TYPES.join(',')
              }
              onChange={(event) =>
                selectFile(
                  event.target
                    .files?.[0],
                )
              }
              required
            />
          </label>

          <small>
            الصور حتى 5MB،
            والفيديو حتى 25MB.
          </small>

          {file && (
            <div className="gallery-selected-file">
              <strong>
                {file.name}
              </strong>

              <span>
                {(
                  file.size /
                  (1024 * 1024)
                ).toFixed(1)}
                MB
              </span>
            </div>
          )}

          {(localError ||
            uploadMutation.isError) && (
            <div className="gallery-error">
              {localError ||
                errorMessage(
                  uploadMutation.error,
                )}
            </div>
          )}

          {uploadMutation.isSuccess && (
            <div className="gallery-success">
              تمت إضافة العنصر
              إلى المعرض.
            </div>
          )}

          <button
            type="submit"
            disabled={
              uploadMutation.isPending
            }
          >
            {uploadMutation.isPending
              ? 'جارٍ الرفع...'
              : 'رفع إلى المعرض'}
          </button>
        </form>

        <section className="gallery-content">
          <header>
            <div>
              <p>المحتوى المنشور</p>
              <h2>عناصر المعرض</h2>
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
              {errorMessage(
                galleryQuery.error,
              )}
            </div>
          )}

          {galleryQuery.data?.length ===
            0 && (
            <div className="gallery-state">
              لا توجد صور أو فيديوهات
              في المعرض بعد.
            </div>
          )}

          <div className="gallery-grid">
            {galleryQuery.data?.map(
              (item) => (
                <article
                  className="gallery-card"
                  key={item.id}
                >
                  <div className="gallery-media">
                    <GalleryMedia
                      item={item}
                    />

                    <span>
                      {item.mediaType ===
                      'IMAGE'
                        ? 'صورة'
                        : 'فيديو'}
                    </span>
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

                    <footer>
                      <time>
                        {formatDate(
                          item.publishedAt,
                        )}
                      </time>

                      <button
                        type="button"
                        disabled={
                          deleteMutation
                            .isPending
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              'حذف هذا العنصر؟',
                            )
                          ) {
                            deleteMutation
                              .mutate(
                                item.id,
                              );
                          }
                        }}
                      >
                        حذف
                      </button>
                    </footer>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
