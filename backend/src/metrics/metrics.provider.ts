import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export const metricsProviders = [
  // Compteur de requêtes HTTP
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),

  // Histogramme de durée des requêtes HTTP
  makeHistogramProvider({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),

  // Compteur d'erreurs applicatives
  makeCounterProvider({
    name: 'app_errors_total',
    help: 'Total number of application errors',
    labelNames: ['type', 'severity'],
  }),

  // Compteur de connexions WebSocket
  makeCounterProvider({
    name: 'websocket_connections_total',
    help: 'Total number of WebSocket connections',
    labelNames: ['event'],
  }),

  // Compteur d'opérations MongoDB
  makeCounterProvider({
    name: 'mongodb_operations_total',
    help: 'Total number of MongoDB operations',
    labelNames: ['operation', 'collection', 'status'],
  }),
];
