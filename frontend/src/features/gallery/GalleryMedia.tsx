import {
  useEffect,
  useState,
} from 'react';

import {
  getGalleryFile,
} from '../../lib/gallery-api';

import type {
  GalleryItem,
} from '../../types/gallery';

interface GalleryMediaProps {
  item: GalleryItem;
}

export function GalleryMedia({
  item,
}: GalleryMediaProps) {
  const [objectUrl, setObjectUrl] =
    useState('');

  const [failed, setFailed] =
    useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    setObjectUrl('');
    setFailed(false);

    void getGalleryFile(item.id)
      .then((blob) => {
        if (!active) {
          return;
        }

        createdUrl =
          URL.createObjectURL(blob);

        setObjectUrl(createdUrl);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;

      if (createdUrl) {
        URL.revokeObjectURL(
          createdUrl,
        );
      }
    };
  }, [item.id]);

  if (failed) {
    return (
      <div className="gallery-media-state">
        تعذر تحميل الملف
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className="gallery-media-state">
        جارٍ تحميل الملف...
      </div>
    );
  }

  if (
    item.mediaType === 'VIDEO'
  ) {
    return (
      <video
        src={objectUrl}
        controls
        preload="metadata"
        playsInline
      >
        المتصفح لا يدعم الفيديو.
      </video>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={item.title}
      loading="lazy"
    />
  );
}
