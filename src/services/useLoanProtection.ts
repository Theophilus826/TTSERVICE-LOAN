
import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LoanProtection } from './loanProtection';

export function useLoanProtection() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!Capacitor.isPluginAvailable('LoanProtection')) {
      setAvailable(false);
      setActive(false);
      return false;
    }

    setAvailable(true);

    try {
      const result = await LoanProtection.checkStatus();
      setActive(result.active);
      return result.active;
    } catch (error) {
      console.error('Loan protection status error:', error);
      return false;
    }
  }, []);

  const requestActivation = async () => {
    setLoading(true);

    try {
      const result = await LoanProtection.requestActivation();
      setActive(result.active);
      return result.active;
    } catch (error) {
      console.error('Activation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deactivate = async () => {
    setLoading(true);

    try {
      const result = await LoanProtection.deactivate();
      await checkStatus();
      return result.success;
    } catch (error) {
      console.error('Deactivation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const openAdminSettings = async () => {
    await LoanProtection.openAdminSettings();
  };

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    active,
    loading,
    available,
    checkStatus,
    requestActivation,
    deactivate,
    openAdminSettings
  };
}
