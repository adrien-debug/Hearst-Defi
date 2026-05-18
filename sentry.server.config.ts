import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
if (dsn && dsn.length > 0) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
  });
}
