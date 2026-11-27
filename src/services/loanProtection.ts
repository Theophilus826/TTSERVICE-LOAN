
import { registerPlugin } from '@capacitor/core';

export interface LoanProtectionStatus {
  active: boolean;
}

export interface LoanProtectionPlugin {
  requestActivation(): Promise<LoanProtectionStatus>;

  checkStatus(): Promise<LoanProtectionStatus>;

  deactivate(): Promise<{ success: boolean }>;

  openAdminSettings(): Promise<void>;
}

export const LoanProtection =
  registerPlugin<LoanProtectionPlugin>('LoanProtection');
