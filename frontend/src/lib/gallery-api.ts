import {
  api,
} from './api';

import type {
  GalleryItem,
  UploadGalleryInput,
} from '../types/gallery';

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
getAdminGallery():
Promise<GalleryItem[]> {
  const response =
    await api.get(
      '/gallery/admin',
    );

  return unwrap<GalleryItem[]>(
    response.data,
  );
}

export async function
getClientGallery():
Promise<GalleryItem[]> {
  const response =
    await api.get(
      '/gallery/my',
    );

  return unwrap<GalleryItem[]>(
    response.data,
  );
}

export async function
uploadGalleryItem(
  input: UploadGalleryInput,
): Promise<GalleryItem> {
  const formData =
    new FormData();

  formData.append(
    'file',
    input.file,
  );

  formData.append(
    'title',
    input.title,
  );

  if (input.description) {
    formData.append(
      'description',
      input.description,
    );
  }

  const response =
    await api.post(
      '/gallery/upload',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      },
    );

  return unwrap<GalleryItem>(
    response.data,
  );
}

export async function
deleteGalleryItem(
  id: string,
): Promise<void> {
  await api.delete(
    `/gallery/${id}`,
  );
}

export async function
getGalleryFile(
  id: string,
): Promise<Blob> {
  const response =
    await api.get(
      `/gallery/file/${id}`,
      {
        responseType: 'blob',
      },
    );

  return response.data as Blob;
}
