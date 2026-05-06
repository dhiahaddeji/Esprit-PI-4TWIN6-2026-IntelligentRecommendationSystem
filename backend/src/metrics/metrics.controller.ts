import { Controller, Get } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';

@Controller()
export class MetricsController extends PrometheusController {}
