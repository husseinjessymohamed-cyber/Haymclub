export type GalleryMediaType =
  | 'IMAGE'
  | 'VIDEO';

export interface GalleryItem {
  id: string;
  academyId: string;
  uploadedByUserId: string;
  title: string;
  description: string | null;
  mediaType: GalleryMediaType;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  publishedAt: string;
  createdAt: string;
}

export interface UploadGalleryInput {
  file: File;
  title: string;
  description?: string;
}
