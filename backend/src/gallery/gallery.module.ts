import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  GalleryItem,
} from './entities/gallery-item.entity';

import {
  GalleryController,
} from './gallery.controller';

import {
  GalleryService,
} from './gallery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GalleryItem,
    ]),
  ],

  controllers: [
    GalleryController,
  ],

  providers: [
    GalleryService,
  ],

  exports: [
    GalleryService,
  ],
})
export class GalleryModule {}
