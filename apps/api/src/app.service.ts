import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'ok',
      service: 'BizFlow ERP API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
