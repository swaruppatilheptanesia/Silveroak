import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { TenantConfig } from './types';
import { defaultTenantConfig } from './defaultTenantConfig';

const TenantContext = createContext<TenantConfig | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  /** Override default config for a different tenant. Falls back to SOU defaults. */
  config?: Partial<TenantConfig>;
}

/**
 * Provides tenant configuration to the entire app.
 * Reads VITE_TENANT_SLUG from env or localStorage for future multi-tenant routing.
 */
export function TenantProvider({ children, config }: TenantProviderProps) {
  const mergedConfig = useMemo<TenantConfig>(() => {
    if (!config) return defaultTenantConfig;
    return {
      ...defaultTenantConfig,
      ...config,
      branding: { ...defaultTenantConfig.branding, ...config.branding },
      policyRules: { ...defaultTenantConfig.policyRules, ...config.policyRules },
      academic: { ...defaultTenantConfig.academic, ...config.academic },
      placement: { ...defaultTenantConfig.placement, ...config.placement },
      features: { ...defaultTenantConfig.features, ...config.features },
    };
  }, [config]);

  return (
    <TenantContext.Provider value={mergedConfig}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access tenant configuration anywhere in the app.
 * @example
 * const { branding, policyRules } = useTenant();
 * console.log(branding.universityName); // "Silver Oak University"
 */
export function useTenant(): TenantConfig {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
