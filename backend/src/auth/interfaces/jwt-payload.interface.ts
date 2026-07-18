import { AcademyRole } from '../../memberships/entities/academy-membership.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  academyId: string | null;
  branchId: string | null;
  role: AcademyRole;
}
