import { Controller, Post, Body } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Controller('api/metrics')
export class ClientMetricsController {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,
  ) {}

  @Post('client')
  recordClientMetric(@Body() body: any) {
    // Enregistrer les métriques côté client si nécessaire
    return { success: true };
  }
}
