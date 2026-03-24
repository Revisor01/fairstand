import type { FastifyInstance } from 'fastify';
import { AsyncTask, CronJob } from 'toad-scheduler';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings, sales } from '../db/schema.js';
import { sendReport, isMailConfigured } from '../services/mailer.js';
import { buildMonthlyReportHtml, buildYearlyReportHtml } from '../services/reportTemplate.js';

const SHOP_ID = 'st-secundus-hennstedt';
const monthNames = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

export async function reportScheduler(fastify: FastifyInstance) {
  // Monatlich: 1. des Monats, 07:00 UTC (= 08:00 MEZ / 09:00 MESZ)
  const monthlyTask = new AsyncTask('monthly-report', async () => {
    if (!isMailConfigured()) return;
    const emailSetting = db.select().from(settings).where(eq(settings.key, 'report_email')).get();
    const monthlyEnabled = db.select().from(settings).where(eq(settings.key, 'report_monthly')).get();
    if (!emailSetting || monthlyEnabled?.value !== 'true') return;

    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const monthStart = new Date(year, month - 1, 1).getTime();
    const monthEnd = new Date(year, month, 1).getTime();

    const summary = db.all(sql`
      SELECT COUNT(*) as sale_count, COALESCE(SUM(total_cents), 0) as total_cents,
             COALESCE(SUM(donation_cents), 0) as donation_cents
      FROM sales WHERE shop_id = ${SHOP_ID} AND created_at >= ${monthStart} AND created_at < ${monthEnd} AND cancelled_at IS NULL
    `);

    // EK-Kosten via JOIN auf products.purchase_price
    const costResult = db.all(sql`
      SELECT COALESCE(SUM(
        CAST(json_extract(item.value, '$.quantity') AS INTEGER) *
        COALESCE(p.purchase_price, 0)
      ), 0) as cost_cents
      FROM sales, json_each(sales.items) as item
      LEFT JOIN products p ON p.id = json_extract(item.value, '$.productId')
      WHERE sales.shop_id = ${SHOP_ID} AND sales.created_at >= ${monthStart} AND sales.created_at < ${monthEnd} AND sales.cancelled_at IS NULL
    `);

    const topArticles = db.all(sql`
      SELECT json_extract(item.value, '$.name') as name,
             SUM(CAST(json_extract(item.value, '$.quantity') AS INTEGER)) as total_qty,
             SUM(CAST(json_extract(item.value, '$.quantity') AS INTEGER) * CAST(json_extract(item.value, '$.salePrice') AS INTEGER)) as revenue_cents
      FROM sales, json_each(sales.items) as item
      WHERE sales.shop_id = ${SHOP_ID} AND sales.created_at >= ${monthStart} AND sales.created_at < ${monthEnd} AND sales.cancelled_at IS NULL
      GROUP BY json_extract(item.value, '$.productId') ORDER BY total_qty DESC LIMIT 5
    `);

    const totalCents = Number((summary[0] as any)?.total_cents ?? 0);
    const costCents = Number((costResult[0] as any)?.cost_cents ?? 0);

    const html = buildMonthlyReportHtml({
      monthLabel: `${monthNames[month - 1]} ${year}`,
      saleCount: Number((summary[0] as any)?.sale_count ?? 0),
      totalCents,
      costCents,
      marginCents: totalCents - costCents,
      donationCents: Number((summary[0] as any)?.donation_cents ?? 0),
      topArticles: (topArticles as any[]).map(a => ({ name: String(a.name), total_qty: Number(a.total_qty), revenue_cents: Number(a.revenue_cents) })),
    });

    await sendReport(emailSetting.value, `Fairstand Monatsbericht ${monthNames[month - 1]} ${year}`, html);
    fastify.log.info(`Monatsbericht ${monthNames[month - 1]} ${year} an ${emailSetting.value} gesendet`);
  });

  fastify.scheduler.addCronJob(new CronJob(
    { cronExpression: '0 7 1 * *' },
    monthlyTask,
    { preventOverrun: true }
  ));

  // Jaehrlich: 1. Januar, 08:00 UTC
  const yearlyTask = new AsyncTask('yearly-report', async () => {
    if (!isMailConfigured()) return;
    const emailSetting = db.select().from(settings).where(eq(settings.key, 'report_email')).get();
    const yearlyEnabled = db.select().from(settings).where(eq(settings.key, 'report_yearly')).get();
    if (!emailSetting || yearlyEnabled?.value !== 'true') return;

    const year = new Date().getFullYear() - 1;
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year + 1, 0, 1).getTime();

    const months = db.all(sql`
      SELECT CAST(strftime('%m', datetime(created_at / 1000, 'unixepoch')) AS INTEGER) as month,
             COUNT(*) as sale_count, COALESCE(SUM(total_cents), 0) as total_cents,
             COALESCE(SUM(donation_cents), 0) as donation_cents
      FROM sales WHERE shop_id = ${SHOP_ID} AND created_at >= ${yearStart} AND created_at < ${yearEnd} AND cancelled_at IS NULL
      GROUP BY strftime('%m', datetime(created_at / 1000, 'unixepoch')) ORDER BY month
    `);

    // EK-Kosten pro Monat via JOIN
    const monthlyCosts = db.all(sql`
      SELECT CAST(strftime('%m', datetime(sales.created_at / 1000, 'unixepoch')) AS INTEGER) as month,
             COALESCE(SUM(
               CAST(json_extract(item.value, '$.quantity') AS INTEGER) *
               COALESCE(p.purchase_price, 0)
             ), 0) as cost_cents
      FROM sales, json_each(sales.items) as item
      LEFT JOIN products p ON p.id = json_extract(item.value, '$.productId')
      WHERE sales.shop_id = ${SHOP_ID} AND sales.created_at >= ${yearStart} AND sales.created_at < ${yearEnd} AND sales.cancelled_at IS NULL
      GROUP BY strftime('%m', datetime(sales.created_at / 1000, 'unixepoch')) ORDER BY month
    `);

    const costMap = new Map((monthlyCosts as any[]).map(c => [Number(c.month), Number(c.cost_cents)]));

    const html = buildYearlyReportHtml(year, (months as any[]).map(m => {
      const totalCents = Number(m.total_cents);
      const costCents = costMap.get(Number(m.month)) ?? 0;
      return {
        month: Number(m.month), sale_count: Number(m.sale_count),
        total_cents: totalCents, cost_cents: costCents,
        margin_cents: totalCents - costCents, donation_cents: Number(m.donation_cents),
      };
    }));

    await sendReport(emailSetting.value, `Fairstand Jahresbericht ${year}`, html);
    fastify.log.info(`Jahresbericht ${year} an ${emailSetting.value} gesendet`);
  });

  fastify.scheduler.addCronJob(new CronJob(
    { cronExpression: '0 8 1 1 *' },
    yearlyTask,
    { preventOverrun: true }
  ));

  if (isMailConfigured()) {
    fastify.log.info('Mail-Versand aktiv — SMTP konfiguriert');
  } else {
    fastify.log.warn('SMTP nicht konfiguriert — automatischer Mail-Versand deaktiviert');
  }
}
