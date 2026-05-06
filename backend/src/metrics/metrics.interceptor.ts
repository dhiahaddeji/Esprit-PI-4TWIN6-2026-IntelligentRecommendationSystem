import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;
    const stopTimer = this.metrics.httpRequestDuration.startTimer({ method });
    this.metrics.httpRequestsInFlight.inc({ method });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const route: string = req.route?.path ?? req.path ?? 'unknown';
          const statusCode = String(res.statusCode);
          stopTimer({ route, status_code: statusCode });
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
          this.metrics.httpRequestsInFlight.dec({ method });
        },
        error: (err) => {
          const route: string = req.route?.path ?? req.path ?? 'unknown';
          const statusCode = String(err.status ?? 500);
          stopTimer({ route, status_code: statusCode });
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
          this.metrics.httpRequestsInFlight.dec({ method });
        },
      }),
    );
  }
}
