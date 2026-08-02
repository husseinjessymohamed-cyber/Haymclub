import {
  Column,
  Entity,
  Index,
} from 'typeorm';

import {
  BaseEntity,
} from '../../common/entities/base.entity';

export enum GalleryMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

@Entity({
  name: 'academy_gallery_items',
})
@Index(
  'IDX_gallery_items_academy',
  ['academyId'],
)
@Index(
  'IDX_gallery_items_published',
  ['publishedAt'],
)
export class GalleryItem extends BaseEntity {
  @Column({
    name: 'academy_id',
    type: 'uuid',
  })
  academyId: string;

  @Column({
    name: 'uploaded_by_user_id',
    type: 'uuid',
  })
  uploadedByUserId: string;

  @Column({
    type: 'varchar',
    length: 180,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    name: 'media_type',
    type: 'varchar',
    length: 20,
  })
  mediaType: GalleryMediaType;

  @Column({
    name: 'file_name',
    type: 'varchar',
    length: 255,
  })
  fileName: string;

  @Column({
    name: 'original_name',
    type: 'varchar',
    length: 255,
  })
  originalName: string;

  @Column({
    name: 'mime_type',
    type: 'varchar',
    length: 100,
  })
  mimeType: string;

  @Column({
    type: 'integer',
  })
  size: number;

  @Column({
    name: 'published_at',
    type: 'timestamptz',
  })
  publishedAt: Date;
}
