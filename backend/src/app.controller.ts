import { Controller, Get } from '@nestjs/common';

import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Get()
  @Public()
  getApiInformation() {
    return {
      name: 'Haymclub Academy Management API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}
