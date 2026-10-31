export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  customerId?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  attribute: string;
  value: string;
  extraPrice: number;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  notes?: string | null;
  variants: ProductVariant[];
}

export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  minQuantity: number;
  availableFrom?: string | null;
  availableTo?: string | null;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
}

export interface QuotationTemplateLine {
  id: string;
  productId: string;
  product: Product;
  variantId?: string | null;
  variant?: ProductVariant | null;
  quantity: number;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  validityDays: number;
  planId: string;
  plan: Plan;
  lines: QuotationTemplateLine[];
}

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED';

export interface SubscriptionLine {
  id: string;
  subscriptionId: string;
  productId: string;
  product: Product;
  variantId?: string | null;
  variant?: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  tax: number;
  amount: number;
}

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  customer: Customer;
  planId: string;
  plan: Plan;
  startDate: string;
  expiryDate?: string | null;
  paymentTerms: number;
  nextBillingDate: string;
  status: SubscriptionStatus;
  lines: SubscriptionLine[];
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  tax: number;
  discount: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  method: string;
  amount: number;
  date: string;
  note?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  subscriptionId?: string | null;
  customerId: string;
  customer: Customer;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  lines: InvoiceLine[];
  payments: Payment[];
  isOverdue?: boolean;
}

export interface DashboardSummary {
  activeSubscriptionCount?: number;
  activeSubscriptions?: number;
  mrr: number;
  arr: number;
  revenueCollected: number;
  outstandingAmount: number;
  overdueInvoices?: {
    count: number;
    amount: number;
    buckets: {
      '1-7': { count: number; amount: number };
      '8-30': { count: number; amount: number };
      '30+': { count: number; amount: number };
    };
  };
  overdueCount?: number;
  overdueBuckets?: {
    '1-7': number;
    '8-30': number;
    '30+': number;
  };
}

export interface BillingPreviewResult {
  dryRun: boolean;
  targetDate: string;
  processedCount: number;
  invoicesCreated: number;
  autoClosedCount: number;
  invoices: Array<{
    subscriptionNumber: string;
    customerName: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  }>;
  problemSubscriptions: Array<{
    subscriptionId: string;
    subscriptionNumber: string;
    reason: string;
  }>;
}
