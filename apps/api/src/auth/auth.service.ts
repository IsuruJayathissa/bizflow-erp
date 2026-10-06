import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    let businessId: string | undefined;
    let assignedRole: UserRole = registerDto.role || UserRole.SALES_STAFF;

    // If businessName is provided, register new Business entity and make user ADMIN
    if (registerDto.businessName) {
      const business = await this.prisma.business.create({
        data: {
          name: registerDto.businessName,
          email: registerDto.email.toLowerCase(),
          phone: registerDto.phone,
          currency: 'LKR',
          invoicePrefix: 'INV-',
        },
      });
      businessId = business.id;
      assignedRole = UserRole.ADMIN;
    } else {
      // If no businessName provided, link to the existing default business if present
      const defaultBusiness = await this.prisma.business.findFirst();
      if (defaultBusiness) {
        businessId = defaultBusiness.id;
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: assignedRole,
        businessId,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            currency: true,
            taxRate: true,
            invoicePrefix: true,
          },
        },
      },
    });

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash: _, refreshToken: __, ...sanitizedUser } = user;
    return {
      user: sanitizedUser,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase() },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            currency: true,
            taxRate: true,
            invoicePrefix: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated. Please contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash: _, refreshToken: __, ...sanitizedUser } = user;
    return {
      user: sanitizedUser,
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'bizflow_jwt_refresh_secret_change_me_in_prod';

      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              currency: true,
              taxRate: true,
              invoicePrefix: true,
            },
          },
        },
      });

      if (!user || !user.isActive || !user.refreshToken) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const isTokenMatching = await bcrypt.compare(
        refreshTokenDto.refreshToken,
        user.refreshToken,
      );

      if (!isTokenMatching) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const { passwordHash: _, refreshToken: __, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    };

    const accessSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'bizflow_jwt_access_secret_change_me_in_prod';
    const accessExpiration = this.configService.get<string>('JWT_EXPIRATION') || '15m';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'bizflow_jwt_refresh_secret_change_me_in_prod';
    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiration,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiration,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
