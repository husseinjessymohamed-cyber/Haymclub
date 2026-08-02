import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';

import { UpdateSystemUserStatusDto } from './dto/update-system-user-status.dto';

import {
  SuperAdminAccessGuard,
  SuperAdminJwtGuard,
} from '../super-admin-saas/super-admin-saas.guard';

import { SuperAdminManagementService } from './super-admin-management.service';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
}

@Controller('super-admin/management')
@UseGuards(SuperAdminJwtGuard, SuperAdminAccessGuard)
export class SuperAdminManagementController {
  constructor(private readonly service: SuperAdminManagementService) {}

  @Get('users')
  findUsers() {
    return this.service.findUsers();
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateSystemUserStatusDto,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.service.updateUserStatus(id, dto.status, this.actorId(request));
  }

  @Get('support-tickets')
  findSupportTickets() {
    return this.service.findSupportTickets();
  }

  @Post('support-tickets')
  createSupportTicket(
    @Body()
    dto: CreateSupportTicketDto,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.service.createSupportTicket(dto, this.actorId(request));
  }

  @Patch('support-tickets/:id')
  updateSupportTicket(
    @Param('id', new ParseUUIDPipe())
    id: string,

    @Body()
    dto: UpdateSupportTicketDto,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.service.updateSupportTicket(id, dto, this.actorId(request));
  }

  @Get('audit-logs')
  findAuditLogs() {
    return this.service.findAuditLogs();
  }

  @Get('settings')
  findSettings() {
    return this.service.findSettings();
  }

  @Patch('settings/:key')
  updateSetting(
    @Param('key')
    key: string,

    @Body()
    dto: UpdateSystemSettingDto,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.service.updateSetting(key, dto, this.actorId(request));
  }

  @Get('health')
  getHealth() {
    return this.service.getSystemHealth();
  }

  private actorId(request: AuthenticatedRequest): string | null {
    return (
      request.user?.userId ?? request.user?.sub ?? request.user?.id ?? null
    );
  }
}
