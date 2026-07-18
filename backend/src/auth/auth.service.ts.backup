import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AcademyMembership } from '../memberships/entities/academy-membership.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { UserProfile, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = this.getPrimaryMembership(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      academyId: membership.academyId,
      branchId: membership.branchId,
      role: membership.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.usersService.updateLastLogin(user.id);

    const profile: UserProfile = this.usersService.toProfile(user);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: profile,
      activeMembership: {
        id: membership.id,
        academyId: membership.academyId,
        branchId: membership.branchId,
        role: membership.role,
      },
    };
  }

  async me(userId: string): Promise<UserProfile> {
    return this.usersService.findProfileById(userId);
  }

  private getPrimaryMembership(user: User): AcademyMembership {
    const activeMemberships = (user.memberships ?? []).filter(
      (membership) => membership.isActive,
    );

    const primaryMembership =
      activeMemberships.find((membership) => membership.isPrimary) ??
      activeMemberships[0];

    if (!primaryMembership) {
      throw new UnauthorizedException('User has no active academy membership');
    }

    return primaryMembership;
  }
}
