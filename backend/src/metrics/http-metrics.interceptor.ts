import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDurationHistogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const startTime = Date.now();
    const method = request.method;
    const route = request.route?.path || request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const status = response.statusCode.toString();

          // Incrémenter le compteur de requêtes
          this.httpRequestsCounter.inc({
            method,
            route,
            status,
          });

          // Enregistrer la durée de la requête
          this.httpRequestDurationHistogram.observe(
            {
              method,
              route,
              status,
            },
            duration,
          );
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const status = error.status?.toString() || '500';

          // Incrémenter le compteur de requêtes (même en cas d'erreur)
          this.httpRequestsCounter.inc({
            method,
            route,
            status,
          });

          // Enregistrer la durée de la requête
          this.httpRequestDurationHistogram.observe(
            {
              method,
              route,
              status,
            },
            duration,
          );
        },
      }),
    );
  }
}
