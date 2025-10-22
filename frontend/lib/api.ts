const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

class ApiService {
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }

  private generateIdempotencyKey(): string {
    return `IDEMP-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = { "Content-Type": "application/json", ...options.headers };
    if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong");
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.token);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem("token", data.token);
    return data;
  }

  logout() {
    localStorage.removeItem("token");
  }

  async getProfile() {
    return this.request<any>("/user/profile");
  }

  async getDashboard() {
    return this.request<any>("/user/dashboard");
  }

  async getTransactions(params?: { type?: string; search?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.type)   searchParams.append("type",  params.type);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page)   searchParams.append("page",  params.page.toString());
    if (params?.limit)  searchParams.append("limit", params.limit.toString());
    return this.request<any>(`/transactions?${searchParams.toString()}`);
  }

  async getTransaction(id: string) {
    return this.request<any>(`/transactions/${id}`);
  }

  async getRecentTransactions() {
    return this.request<any[]>("/transactions/recent/list");
  }

  async getAccounts(): Promise<{
    accounts: Array<{
      _id: string;
      bankName: string;
      accountType: string;
      accountNumber: string;
      balance: number;
      plaidAccountId?: string;
    }>;
    totalBalance: number;
  }> {
    return this.request("/accounts");
  }

  async addAccount(data: { bankName: string; accountType: string; accountNumber: string }) {
    return this.request<any>("/accounts", { method: "POST", body: JSON.stringify(data) });
  }

  async deleteAccount(id: string) {
    return this.request<any>(`/accounts/${id}`, { method: "DELETE" });
  }

  async internalTransfer(data: {
    sourceAccountId: string;
    receiverShareableId: string;
    amount: number;
    note?: string;
    idempotencyKey?: string;
  }) {
    const payload = { ...data, idempotencyKey: data.idempotencyKey || this.generateIdempotencyKey() };
    return this.request<{ message: string; transferId?: string }>("/transfer", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createPlaidLinkToken() {
    return this.request<{ linkToken: string }>("/plaid/create-link-token", { method: "POST" });
  }

  async exchangePlaidToken(publicToken: string) {
    return this.request<any>("/plaid/exchange-token", {
      method: "POST",
      body: JSON.stringify({ publicToken }),
    });
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const api = new ApiService();
