import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!(process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN.length > 0),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event) {
    // Filter non-actionable client-side noise
    if (event.exception) {
      const values = event.exception.values ?? [];
      for (const ex of values) {
        const msg = ex.value ?? "";
        if (
          msg.includes("NetworkError") ||
          msg.includes("Failed to fetch") ||
          msg.includes("Load failed") ||
          msg.includes("ResizeObserver loop")
        ) {
          return null;
        }
      }
    }
    return event;
  },
});
