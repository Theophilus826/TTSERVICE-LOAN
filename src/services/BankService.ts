import API from "./Api";

export interface Bank {
  name: string;
  code: string;
  [key: string]: unknown;
}

export interface BankAccount {
  _id: string;
  bankName: string;
  bankCode: string;
  accountName?: string;
  accountNumberLast4: string;
  accountType: "savings" | "current";
  currency: string;
  isPrimary: boolean;
  verificationStatus: "pending" | "verified" | "failed";
  verificationReference?: string | null;
  verifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BanksResponse {
  success: boolean;
  message?: string;
  data: Bank[];
}

export interface BankAccountsResponse {
  success: boolean;
  message?: string;
  data: BankAccount[];
}

export interface BankAccountResponse {
  success: boolean;
  message?: string;
  data: BankAccount | null;
}

const bankApi = {
  async getBanks(): Promise<BanksResponse> {
    const response = await API.get("/banks/banks");
    return response.data;
  },

  async addBankAccount(payload: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountType?: "savings" | "current";
    currency?: string;
  }): Promise<BankAccountResponse> {
    const response = await API.post("/banks", payload);
    return response.data;
  },

  async getMyBankAccounts(): Promise<BankAccountsResponse> {
    const response = await API.get("/banks");
    return response.data;
  },

  async getPrimaryBankAccount(): Promise<BankAccountResponse> {
    const response = await API.get("/banks/primary");
    return response.data;
  },

  async verifyBankAccount(
    accountId: string,
  ): Promise<BankAccountResponse> {
    const response = await API.post(`/banks/${accountId}/verify`);
    return response.data;
  },

  async setPrimaryBankAccount(
    accountId: string,
  ): Promise<BankAccountResponse> {
    const response = await API.patch(`/banks/${accountId}/primary`);
    return response.data;
  },
};

export default bankApi;