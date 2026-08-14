import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import {
  Roles,
} from '../auth/decorators/roles.decorator';
import {
  AcademyRole,
} from '../memberships/entities/academy-membership.entity';
import {
  CreateNotificationDto,
} from './dto/create-notification.dto';
import {
  NotificationsService,
} from './notifications.service';

const ADMIN_ROLES = [
  AcademyRole.SUPER_ADMIN,
  AcademyRole.ACADEMY_ADMIN,
  AcademyRole.BRANCH_MANAGER,
  AcademyRole.RECEPTIONIST,
  AcademyRole.COACH,
];

const CLIENT_ROLES = [
  AcademyRole.TRAINEE,
  AcademyRole.PARENT,
];

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService:
      NotificationsService,
  ) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  create(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
    @Body()
    dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(
      userId,
      academyId,
      branchId,
      role,
      dto,
    );
  }

  @Get('admin')
  @Roles(...ADMIN_ROLES)
  findAdminNotifications(
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
  ) {
    return this.notificationsService
      .findAdminNotifications(
        academyId,
        branchId,
        role,
      );
  }

  @Get('my')
  @Roles(...CLIENT_ROLES)
  findMyNotifications(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
  ) {
    return this.notificationsService
      .findMyNotifications(
        userId,
        academyId,
        branchId,
      );
  }

  @Get('unread-count')
  @Roles(...CLIENT_ROLES)
  unreadCount(
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
  ) {
    return this.notificationsService
      .unreadCount(
        userId,
        academyId,
        branchId,
      );
  }

  @Patch(':id/read')
  @Roles(...CLIENT_ROLES)
  markAsRead(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    notificationId: string,
    @CurrentUser('sub')
    userId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
  ) {
    return this.notificationsService
      .markAsRead(
        notificationId,
        userId,
        academyId,
        branchId,
      );
  }

  @Delete(':id')
  @Roles(...ADMIN_ROLES)
  remove(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    notificationId: string,
    @CurrentUser('academyId')
    academyId: string | null,
    @CurrentUser('branchId')
    branchId: string | null,
    @CurrentUser('role')
    role: AcademyRole,
  ) {
    return this.notificationsService
      .remove(
        notificationId,
        academyId,
        branchId,
        role,
      );
  }

}
