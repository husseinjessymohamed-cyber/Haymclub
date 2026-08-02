import {
  useEffect,
  useState,
} from 'react';

import {
  api,
} from '../../lib/api';

interface RankingPhotoProps {
  imageUrl: string | null;
  name: string;
}

export function RankingPhoto({
  imageUrl,
  name,
}: RankingPhotoProps) {
  const [objectUrl, setObjectUrl] =
    useState('');

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    setObjectUrl('');

    if (!imageUrl) {
      return () => undefined;
    }

    const endpoint =
      imageUrl.startsWith('/api/')
        ? imageUrl.slice(4)
        : imageUrl;

    void api.get(
      endpoint,
      {
        responseType: 'blob',
      },
    ).then((response) => {
      if (!active) {
        return;
      }

      createdUrl =
        URL.createObjectURL(
          response.data as Blob,
        );

      setObjectUrl(
        createdUrl,
      );
    }).catch(() => {
      setObjectUrl('');
    });

    return () => {
      active = false;

      if (createdUrl) {
        URL.revokeObjectURL(
          createdUrl,
        );
      }
    };
  }, [imageUrl]);

  if (objectUrl) {
    return (
      <img
        src={objectUrl}
        alt={name}
      />
    );
  }

  return (
    <span className="ranking-photo-placeholder">
      {name.trim().charAt(0) || 'م'}
    </span>
  );
}
