import { prisma } from "../../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { RecordPaymentInput, ListPaymentsQuery } from "./payments.schema";
import { buildPagination } from "../../utils/pagination";
import { InvoiceStatus, Prisma, Role } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class PaymentsService {
  async recordPayment(
    invoiceId: string,
    input: RecordPaymentInput,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    if (user.role === Role.CUSTOMER && invoice.customerId !== user.customerId) {
      throw new ForbiddenError("Cannot record payment for another customer's invoice");
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError("Cannot record payment for a cancelled invoice");
    }

    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestError("Invoice must be confirmed before accepting payments");
    }

    const currentPaid = Number(invoice.amountPaid);
    const total = Number(invoice.total);
    const newPaid = currentPaid + input.amount;
    const shouldMarkPaid = newPaid >= total;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          method: input.method,
          amount: new Prisma.Decimal(input.amount),
          date: input.date || new Date(),
          note: input.note
        }
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: new Prisma.Decimal(newPaid),
          status: shouldMarkPaid ? InvoiceStatus.PAID : invoice.status
        },
        include: {
          customer: true
        }
      });

      return { payment, invoice: updatedInvoice };
    });

    await logAudit({
      userId: user.userId,
      action: "RECORD_PAYMENT",
      entity: "Payment",
      entityId: result.payment.id,
      after: {
        payment: result.payment,
        invoiceAmountPaid: newPaid,
        invoiceStatus: result.invoice.status
      }
    });

    return result;
  }

  async list(
    query: ListPaymentsQuery,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const { page, limit, invoiceId, method } = query;
    const skip = (page - 1) * limit;

    let customerIdFilter = query.customerId;
    if (user.role === Role.CUSTOMER) {
      if (!user.customerId) {
        return { items: [], pagination: buildPagination(0, page, limit) };
      }
      customerIdFilter = user.customerId;
    }

    const where: Prisma.PaymentWhereInput = {
      ...(invoiceId ? { invoiceId } : {}),
      ...(method ? { method: { contains: method, mode: "insensitive" } } : {}),
      ...(customerIdFilter
        ? {
            invoice: {
              customerId: customerIdFilter
            }
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          invoice: {
            select: {
              id: true,
              number: true,
              status: true,
              total: true,
              amountPaid: true,
              customer: { select: { id: true, name: true, email: true } }
            }
          }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async listByInvoice(
    invoiceId: string,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    if (user.role === Role.CUSTOMER && invoice.customerId !== user.customerId) {
      throw new ForbiddenError("Access denied to this invoice's payments");
    }

    return prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { date: "desc" }
    });
  }

  async getById(
    id: string,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: { customer: true }
        }
      }
    });

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    if (user.role === Role.CUSTOMER && payment.invoice.customerId !== user.customerId) {
      throw new ForbiddenError("Access denied to this payment");
    }

    return payment;
  }
}

export const paymentsService = new PaymentsService();
