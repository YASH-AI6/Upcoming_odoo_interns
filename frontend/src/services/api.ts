import type {
  BillingPreviewResult,
  Customer,
  DashboardSummary,
  Invoice,
  Payment,
  Plan,
  Product,
  QuotationTemplate,
  Subscription,
  User
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('subpulse_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('subpulse_token', token);
    } else {
      localStorage.removeItem('subpulse_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      this.setToken(null);
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  }

  // Auth Endpoints
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    return res;
  }

  async signup(data: { name: string; email: string; password: string; phone?: string; address?: string }): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.token);
    return res;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard/summary');
  }

  // Subscriptions
  async getSubscriptions(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ subscriptions: Subscription[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<{ subscriptions: Subscription[]; pagination: any }>(`/subscriptions?${query.toString()}`);
  }

  async createSubscription(data: any): Promise<Subscription> {
    return this.request<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async confirmSubscription(id: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/confirm`, { method: 'POST' });
  }

  async activateSubscription(id: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/activate`, { method: 'POST' });
  }

  async pauseSubscription(id: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/pause`, { method: 'POST' });
  }

  async resumeSubscription(id: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/resume`, { method: 'POST' });
  }

  async closeSubscription(id: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/close`, { method: 'POST' });
  }

  async renewSubscription(id: string): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/renew`, { method: 'POST' });
  }

  // Invoices & Payments
  async getInvoices(params?: { status?: string; page?: number; limit?: number }): Promise<{ invoices: Invoice[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return this.request<{ invoices: Invoice[]; pagination: any }>(`/invoices?${query.toString()}`);
  }

  async confirmInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/confirm`, { method: 'POST' });
  }

  async cancelInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/cancel`, { method: 'POST' });
  }

  async sendInvoice(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/invoices/${id}/send`, { method: 'POST' });
  }

  async createPayment(invoiceId: string, data: { amount: number; method: string; note?: string }): Promise<{ payment: Payment; invoiceStatus: string }> {
    return this.request<{ payment: Payment; invoiceStatus: string }>(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  getInvoicePdfUrl(id: string): string {
    return `${API_BASE}/invoices/${id}/pdf`;
  }

  // Catalog, Plans, Templates, Customers
  async getPlans(): Promise<Plan[]> {
    const res = await this.request<{ plans: Plan[] }>('/plans');
    return res.plans || (res as any);
  }

  async getProducts(): Promise<Product[]> {
    const res = await this.request<{ products: Product[] }>('/products');
    return res.products || (res as any);
  }

  async getTemplates(): Promise<QuotationTemplate[]> {
    const res = await this.request<{ templates: QuotationTemplate[] }>('/templates');
    return res.templates || (res as any);
  }

  async getCustomers(): Promise<Customer[]> {
    const res = await this.request<{ customers: Customer[] }>('/customers?limit=100');
    return res.customers || (res as any);
  }

  // Billing Time Machine
  async previewBilling(date: string): Promise<BillingPreviewResult> {
    return this.request<BillingPreviewResult>('/billing/preview', {
      method: 'POST',
      body: JSON.stringify({ date })
    });
  }

  async runBilling(date: string): Promise<BillingPreviewResult> {
    return this.request<BillingPreviewResult>('/billing/run', {
      method: 'POST',
      body: JSON.stringify({ date })
    });
  }

  // Portal (Customer-scoped)
  async getPortalSubscriptions(): Promise<Subscription[]> {
    const res = await this.request<{ subscriptions: Subscription[] }>('/portal/subscriptions');
    return res.subscriptions || (res as any);
  }

  async getPortalInvoices(): Promise<Invoice[]> {
    const res = await this.request<{ invoices: Invoice[] }>('/portal/invoices');
    return res.invoices || (res as any);
  }

  async getPortalPayments(): Promise<Payment[]> {
    const res = await this.request<{ payments: Payment[] }>('/portal/payments');
    return res.payments || (res as any);
  }
}

export const api = new ApiClient();
