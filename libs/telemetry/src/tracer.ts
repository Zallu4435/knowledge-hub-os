/**
 * libs/telemetry/src/tracer.ts
 *
 * Phase 12 — OpenTelemetry SDK bootstrap for all NestJS services.
 *
 * MUST be the very first import in main.ts so that auto-instrumentations
 * can patch Node.js modules (http, express) before NestJS loads anything.
 *
 * Trace pipeline:
 *   NestJS → OTLP/HTTP → Jaeger (:4318)
 *
 * Env vars (set in docker-compose.yml):
 *   OTEL_SERVICE_NAME            — e.g. "api-gateway"
 *   OTEL_EXPORTER_OTLP_ENDPOINT  — e.g. "http://jaeger:4318"
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
// Use SEMRESATTRS_* constants — the SemanticResourceAttributes enum
// was deprecated in @opentelemetry/semantic-conventions v1.x.
import {
    SEMRESATTRS_SERVICE_NAME,
    SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

const serviceName =
    process.env.OTEL_SERVICE_NAME ?? 'knowledge-hub-unknown-service';

const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

// Pass the exporter via `traceExporter` instead of constructing a
// BatchSpanProcessor manually. NodeSDK wraps it in a BatchSpanProcessor
// internally using its own bundled sdk-trace-base version, which avoids
// type-version mismatches between the root package.json's sdk-trace-base
// and the version that sdk-node@0.51.x was compiled against.
const sdk = new NodeSDK({
    resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
        environment: process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({
        url: `${otlpEndpoint}/v1/traces`,
    }),
    instrumentations: [
        // Traces all incoming/outgoing HTTP calls.
        // Excludes Prometheus /metrics scrapes from appearing as spans (noise).
        new HttpInstrumentation({
            ignoreIncomingRequestHook: (req) =>
                req.url === '/metrics' || req.url === '/auth/metrics',
        }),
        // Traces Express route handlers (NestJS uses Express under the hood)
        new ExpressInstrumentation(),
        // Traces NestJS providers and controllers
        new NestInstrumentation(),
        // NOTE: Kafka trace propagation via opentelemetry-instrumentation-kafkajs@0.2.x
        // is disabled: that community package has a type incompatibility with
        // @opentelemetry/sdk-node@0.51.x (missing Instrumentation.getConfig interface).
        // Kafka events still appear in Jaeger indirectly because HTTP instrumentation
        // captures the Redpanda REST API calls. For native kafkajs span propagation,
        // pin sdk-node to ^0.212.x and add @opentelemetry/instrumentation-kafkajs
        // from the official namespace when available.
    ],
});

// Start before any require() or import executes in the host service.
sdk.start();

// Graceful shutdown: flush all buffered spans before the process exits.
// Handle both SIGTERM (Docker/K8s shutdown) and SIGINT (Ctrl+C in dev).
const shutdownOtel = async () => {
    try {
        await sdk.shutdown();
    } catch (_) {
        // Ignore errors during shutdown — process is exiting anyway.
    }
};
process.on('SIGTERM', shutdownOtel);
process.on('SIGINT', shutdownOtel);

export { sdk };
