import { prisma } from "../../config/prisma";
import { DashboardSummaryQuery } from "./dashboard.schema";
import { Prisma } from "@prisma/client";

export class DashboardService {
  async getSummary(query: DashboardSummaryQuery) {
    const { startDate, endDate, planId, customerId, status } = query;

    // Filters for SQL queries
    const subConditions: Prisma.Sql[] = [];
    const invConditions: Prisma.Sql[] = [];
    const payConditions: Prisma.Sql[] = [];

    if (planId) {
      subConditions.push(Prisma.sql`s."planId" = ${planId}`);
    }
    if (customerId) {
      subConditions.push(Prisma.sql`s."customerId" = ${customerId}`);
      invConditions.push(Prisma.sql`i."customerId" = ${customerId}`);
    }
    if (status) {
      subConditions.push(Prisma.sql`s."status"::text = ${status}`);
    }
    if (startDate) {
      subConditions.push(Prisma.sql`s."createdAt" >= ${startDate}`);
      invConditions.push(Prisma.sql`i."createdAt" >= ${startDate}`);
      payConditions.push(Prisma.sql`p."date" >= ${startDate}`);
    }
    if (endDate) {
      subConditions.push(Prisma.sql`s."createdAt" <= ${endDate}`);
      invConditions.push(Prisma.sql`i."createdAt" <= ${endDate}`);
      payConditions.push(Prisma.sql`p."date" <= ${endDate}`);
    }

    const subWhereClause =
      subConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(subConditions, " AND ")}`
        : Prisma.empty;

    const invWhereBase =
      invConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(invConditions, " AND ")}`
        : Prisma.empty;

    // 1. Active subscription count & status breakdown
    const activeSubCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Subscription" s
      ${subWhereClause}
      ${subConditions.length > 0 ? Prisma.sql`AND s."status" = 'ACTIVE'` : Prisma.sql`WHERE s."status" = 'ACTIVE'`}
    `;
    const activeSubscriptionCount = Number(activeSubCountResult[0]?.count || 0);

    // 2. MRR (Monthly Recurring Revenue) & ARR using SQL Aggregation across active subscription lines
    // Normalization multipliers:
    // DAILY -> 30, WEEKLY -> 52 / 12 (4.3333), MONTHLY -> 1, YEARLY -> 1 / 12 (0.08333)
    const mrrResult = await prisma.$queryRaw<Array<{ mrr: Prisma.Decimal | null }>>`
      SELECT SUM(
        (sl."amount") * 
        CASE p."billingPeriod"
          WHEN 'DAILY' THEN 30
          WHEN 'WEEKLY' THEN 4.3333
          WHEN 'MONTHLY' THEN 1
          WHEN 'YEARLY' THEN 0.083333
          ELSE 1
        END
      ) AS mrr
      FROM "SubscriptionLine" sl
      JOIN "Subscription" s ON s."id" = sl."subscriptionId"
      JOIN "Plan" p ON p."id" = s."planId"
      ${subWhereClause}
      ${subConditions.length > 0 ? Prisma.sql`AND s."status" = 'ACTIVE'` : Prisma.sql`WHERE s."status" = 'ACTIVE'`}
    `;
    const mrr = Math.round(Number(mrrResult[0]?.mrr || 0) * 100) / 100;
    const arr = Math.round(mrr * 12 * 100) / 100;

    // 3. Revenue collected (from Payments)
    const revConditions = [...payConditions];
    if (customerId) {
      revConditions.push(Prisma.sql`i."customerId" = ${customerId}`);
    }
    const revWhere =
      revConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(revConditions, " AND ")}`
        : Prisma.empty;

    const revenueResult = await prisma.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
      SELECT COALESCE(SUM(p."amount"), 0) AS total
      FROM "Payment" p
      JOIN "Invoice" i ON i."id" = p."invoiceId"
      ${revWhere}
    `;
    const revenueCollected = Number(revenueResult[0]?.total || 0);

    // 4. Outstanding amount (unpaid balance on CONFIRMED invoices)
    const outstandingResult = await prisma.$queryRaw<Array<{ outstanding: Prisma.Decimal | null }>>`
      SELECT COALESCE(SUM(i."total" - i."amountPaid"), 0) AS outstanding
      FROM "Invoice" i
      ${invWhereBase}
      ${invConditions.length > 0 ? Prisma.sql`AND i."status" = 'CONFIRMED' AND i."total" > i."amountPaid"` : Prisma.sql`WHERE i."status" = 'CONFIRMED' AND i."total" > i."amountPaid"`}
    `;
    const outstandingAmount = Number(outstandingResult[0]?.outstanding || 0);

    // 5. Overdue invoices count and amount (CONFIRMED, dueDate < NOW(), total > amountPaid)
    const overdueResult = await prisma.$queryRaw<
      Array<{
        count: bigint;
        amount: Prisma.Decimal | null;
        bucket_1_7_count: bigint;
        bucket_1_7_amount: Prisma.Decimal | null;
        bucket_8_30_count: bigint;
        bucket_8_30_amount: Prisma.Decimal | null;
        bucket_30_plus_count: bigint;
        bucket_30_plus_amount: Prisma.Decimal | null;
      }>
    >`
      SELECT 
        COUNT(*)::bigint AS count,
        COALESCE(SUM(i."total" - i."amountPaid"), 0) AS amount,
        COUNT(CASE WHEN NOW() - i."dueDate" <= interval '7 days' THEN 1 END)::bigint AS bucket_1_7_count,
        COALESCE(SUM(CASE WHEN NOW() - i."dueDate" <= interval '7 days' THEN i."total" - i."amountPaid" ELSE 0 END), 0) AS bucket_1_7_amount,
        COUNT(CASE WHEN NOW() - i."dueDate" > interval '7 days' AND NOW() - i."dueDate" <= interval '30 days' THEN 1 END)::bigint AS bucket_8_30_count,
        COALESCE(SUM(CASE WHEN NOW() - i."dueDate" > interval '7 days' AND NOW() - i."dueDate" <= interval '30 days' THEN i."total" - i."amountPaid" ELSE 0 END), 0) AS bucket_8_30_amount,
        COUNT(CASE WHEN NOW() - i."dueDate" > interval '30 days' THEN 1 END)::bigint AS bucket_30_plus_count,
        COALESCE(SUM(CASE WHEN NOW() - i."dueDate" > interval '30 days' THEN i."total" - i."amountPaid" ELSE 0 END), 0) AS bucket_30_plus_amount
      FROM "Invoice" i
      ${invWhereBase}
      ${invConditions.length > 0 ? Prisma.sql`AND i."status" = 'CONFIRMED' AND i."dueDate" < NOW() AND i."total" > i."amountPaid"` : Prisma.sql`WHERE i."status" = 'CONFIRMED' AND i."dueDate" < NOW() AND i."total" > i."amountPaid"`}
    `;

    const overdueData = overdueResult[0];

    return {
      activeSubscriptionCount,
      mrr,
      arr,
      revenueCollected,
      outstandingAmount,
      overdueInvoices: {
        count: Number(overdueData?.count || 0),
        amount: Number(overdueData?.amount || 0),
        buckets: {
          "1-7": {
            count: Number(overdueData?.bucket_1_7_count || 0),
            amount: Number(overdueData?.bucket_1_7_amount || 0)
          },
          "8-30": {
            count: Number(overdueData?.bucket_8_30_count || 0),
            amount: Number(overdueData?.bucket_8_30_amount || 0)
          },
          "30+": {
            count: Number(overdueData?.bucket_30_plus_count || 0),
            amount: Number(overdueData?.bucket_30_plus_amount || 0)
          }
        }
      }
    };
  }
}

export const dashboardService = new DashboardService();
