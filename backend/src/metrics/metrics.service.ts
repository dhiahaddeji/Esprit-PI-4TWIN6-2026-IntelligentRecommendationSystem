import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry: client.Registry;
  readonly httpRequestsTotal: client.Counter<string>;
  readonly httpRequestDuration: client.Histogram<string>;
  readonly httpRequestsInFlight: client.Gauge<string>;

  constructor() {
    this.registry = new client.Registry();
    this.registry.setDefaultLabels({ app: 'assurreco-backend' });
    client.collectDefaultMetrics({ register: this.registry, prefix: 'assurreco_' });

    this.httpRequestsTotal = new client.Counter({
      name: 'assurreco_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'assurreco_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new client.Gauge({
      name: 'assurreco_http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method'],
      registers: [this.registry],
    });
  }
}
