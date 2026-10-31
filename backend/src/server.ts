import { app } from "./app";
import { env } from "./config/env";
import { startBillingCron } from "./modules/billing/billing.cron";

const server = app.listen(env.PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  console.log(`API Base: http://localhost:${env.PORT}/api/v1`);
});

if (env.NODE_ENV !== "test") {
  startBillingCron();
}

const gracefulShutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
