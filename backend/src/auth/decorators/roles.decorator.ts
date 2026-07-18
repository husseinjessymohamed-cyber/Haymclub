import { SetMetadata } from '@nestjs/common';

import { AcademyRole } from '../../memberships/entities/academy-membership.entity';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AcademyRole[]) => SetMetadata(ROLES_KEY, roles);
