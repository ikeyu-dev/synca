/**
 * Next.js Instrumentation
 * サーバー起動時にcronジョブを開始
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { startCronJobs } = await import("@/shared/lib/cron/scheduler");
        startCronJobs();
    }
}
