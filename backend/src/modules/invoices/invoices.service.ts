import { prisma } from "../../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { CreateInvoiceInput, ListInvoicesQuery } from "./invoices.schema";
import { buildPagination } from "../../utils/pagination";
import { getNextSequenceNumber } from "../../utils/sequence";
import { generateInvoicePdf } from "../../utils/pdf";
import { sendInvoiceEmail } from "../../utils/email";
import { getOverdueBucket } from "../../utils/dateUtils";
import { InvoiceStatus, Prisma, Role } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class InvoicesService {
  async create(input: CreateInvoiceInput, userId?: string) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const preparedLines = input.lines.map((l) => {
      const lineSubtotal = l.unitPrice * l.quantity;
      const taxableBase = Math.max(0, lineSubtotal - l.discountAmount);
      const lineTax = (taxableBase * l.taxRate) / 100;
      const lineAmount = taxableBase + lineTax;

      subtotal += lineSubtotal;
      discountTotal += l.discountAmount;
      taxTotal += lineTax;

      return {
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: new Prisma.Decimal(l.unitPrice),
        taxRate: new Prisma.Decimal(l.taxRate),
        discountAmount: new Prisma.Decimal(l.discountAmount),
        amount: new Prisma.Decimal(lineAmount)
      };
    });

    const total = subtotal - discountTotal + taxTotal;
    const issueDate = input.issueDate || new Date();
    const dueDate = input.dueDate || new Date(issueDate.getTime() + 15 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.$transaction(async (tx) => {
      const number = await getNextSequenceNumber(tx, "INV");

      return tx.invoice.create({
        data: {
          number,
          customerId: input.customerId,
          subscriptionId: input.subscriptionId,
          billingPeriodStart: input.billingPeriodStart,
          billingPeriodEnd: input.billingPeriodEnd,
          issueDate,
          dueDate,
          status: InvoiceStatus.DRAFT,
          subtotal: new Prisma.Decimal(subtotal),
          discountTotal: new Prisma.Decimal(discountTotal),
          taxTotal: new Prisma.Decimal(taxTotal),
          total: new Prisma.Decimal(total),
          amountPaid: new Prisma.Decimal(0),
          lines: {
            create: preparedLines
          }
        },
        include: {
          customer: true,
          subscription: true,
          lines: { include: { product: true, variant: true } }
        }
      });
    });

    await logAudit({
      userId,
      action: "CREATE_INVOICE",
      entity: "Invoice",
      entityId: invoice.id,
      after: invoice
    });

    return invoice;
  }

  async list(
    query: ListInvoicesQuery,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const { page, limit, search, status, subscriptionId, isOverdue, overdueBucket } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    let customerIdFilter = query.customerId;
    if (user.role === Role.CUSTOMER) {
      if (!user.customerId) {
        return { items: [], pagination: buildPagination(0, page, limit) };
      }
      customerIdFilter = user.customerId;
    }

    const where: Prisma.InvoiceWhereInput = {
      ...(status ? { status } : {}),
      ...(customerIdFilter ? { customerId: customerIdFilter } : {}),
      ...(subscriptionId ? { subscriptionId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { email: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {}),
      ...(isOverdue
        ? {
            status: InvoiceStatus.CONFIRMED,
            dueDate: { lt: now },
            total: { gt: prisma.invoice.fields.amountPaid }
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, number: true } },
          _count: { select: { lines: true, payments: true } }
        }
      })
    ]);

    // Decorate with overdue information
    const decorated = items.map((inv) => {
      const isDuePast = inv.dueDate < now;
      const isUnpaid = Number(inv.amountPaid) < Number(inv.total);
      const overdue = inv.status === InvoiceStatus.CONFIRMED && isDuePast && isUnpaid;
      const bucket = overdue ? getOverdueBucket(inv.dueDate, now) : null;

      return {
        ...inv,
        isOverdue: overdue,
        overdueBucket: bucket
      };
    });

    const filtered = overdueBucket
      ? decorated.filter((d) => d.overdueBucket === overdueBucket)
      : decorated;

    return {
      items: filtered,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getById(
    id: string,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: true,
        lines: {
          include: { product: true, variant: true }
        },
        payments: {
          orderBy: { date: "desc" }
        },
        discountUsages: {
          include: { discount: true }
        }
      }
    });

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    if (user.role === Role.CUSTOMER && invoice.customerId !== user.customerId) {
      throw new ForbiddenError("Access denied to this invoice");
    }

    const now = new Date();
    const isDuePast = invoice.dueDate < now;
    const isUnpaid = Number(invoice.amountPaid) < Number(invoice.total);
    const overdue = invoice.status === InvoiceStatus.CONFIRMED && isDuePast && isUnpaid;

    return {
      ...invoice,
      isOverdue: overdue,
      overdueBucket: overdue ? getOverdueBucket(invoice.dueDate, now) : null
    };
  }

  async confirm(id: string, userId?: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError("Invoice not found");

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestError(`Cannot confirm invoice with status ${invoice.status}`);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CONFIRMED }
    });

    await logAudit({
      userId,
      action: "CONFIRM_INVOICE",
      entity: "Invoice",
      entityId: id,
      before: { status: invoice.status },
      after: { status: updated.status }
    });

    return updated;
  }

  async cancel(id: string, userId?: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError("Invoice not found");

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestError("Cannot cancel an already paid invoice");
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestError("Invoice is already cancelled");
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED }
    });

    await logAudit({
      userId,
      action: "CANCEL_INVOICE",
      entity: "Invoice",
      entityId: id,
      before: { status: invoice.status },
      after: { status: updated.status }
    });

    return updated;
  }

  async generatePdf(
    id: string,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ): Promise<Buffer> {
    const invoice = await this.getById(id, user);

    return generateInvoicePdf({
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      customer: {
        name: invoice.customer.name,
        email: invoice.customer.email,
        address: invoice.customer.address,
        city: invoice.customer.city,
        country: invoice.customer.country
      },
      subscriptionNumber: invoice.subscription?.number,
      lines: invoice.lines.map((l) => ({
        productName: l.product.name + (l.variant ? ` (${l.variant.value})` : ""),
        quantity: l.quantity,
        unitPrice: l.unitPrice.toString(),
        taxRate: l.taxRate.toString(),
        discountAmount: l.discountAmount.toString(),
        amount: l.amount.toString()
      })),
      subtotal: invoice.subtotal.toString(),
      discountTotal: invoice.discountTotal.toString(),
      taxTotal: invoice.taxTotal.toString(),
      total: invoice.total.toString(),
      amountPaid: invoice.amountPaid.toString(),
      status: invoice.status
    });
  }

  async send(id: string, userId?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: true,
        lines: { include: { product: true, variant: true } }
      }
    });

    if (!invoice) throw new NotFoundError("Invoice not found");

    const pdfBuffer = await this.generatePdf(id, { role: Role.ADMIN });
    await sendInvoiceEmail(invoice.customer.email, invoice.number, pdfBuffer);

    await logAudit({
      userId,
      action: "SEND_INVOICE_EMAIL",
      entity: "Invoice",
      entityId: id
    });

    return { success: true, message: `Invoice ${invoice.number} sent to ${invoice.customer.email}` };
  }
}

export const invoicesService = new InvoicesService();
