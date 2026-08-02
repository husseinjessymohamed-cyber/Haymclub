import { Module } from '@nestjs/common';

import {
  WorkflowController,
} from './workflow.controller';
import {
  WorkflowService,
} from './workflow.service';

import {
  WorkflowAutomationService,
} from './workflow-automation.service';

@Module({
  controllers: [
    WorkflowController,
  ],
  providers: [
    WorkflowService,
    WorkflowAutomationService,
  ],
  exports: [
    WorkflowService,
  ],
})
export class WorkflowModule {}
