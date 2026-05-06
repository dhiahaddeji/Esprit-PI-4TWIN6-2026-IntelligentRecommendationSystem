import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { ClientMetricsController } from './client-metrics.controller';
import { metricsProviders } from './metrics.provider';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'nestjs_',
        },
      },
    }),
  ],
  controllers: [MetricsController, ClientMetricsController],
  providers: [...metricsProviders],
  exports: [...metricsProviders],
})
export class MetricsModule {}
