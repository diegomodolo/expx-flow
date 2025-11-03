import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCompanies, CompanyMember } from '@/hooks/useCompanies';
import { useAuth } from '@/hooks/useAuth';

interface CompanyContextType {
  activeCompany: CompanyMember | null;
  setActiveCompany: (company: CompanyMember | null) => void;
  companies: CompanyMember[];
  loading: boolean;
  error: string | null;
  createCompany: (companyData: { name: string; slug?: string; logo?: string }) => Promise<any>;
  updateCompany: (id: string, updates: any) => Promise<any>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [activeCompany, setActiveCompanyState] = useState<CompanyMember | null>(null);
  const { companies, loading, error, createCompany, updateCompany, fetchUserCompanies } = useCompanies();
  const { user } = useAuth();

  // Set the first company as active by default
  useEffect(() => {
    if (companies.length > 0 && !activeCompany) {
      const savedCompanyId = localStorage.getItem('activeCompanyId');
      if (savedCompanyId) {
        const savedCompany = companies.find(c => c.company_id === savedCompanyId);
        if (savedCompany) {
          setActiveCompanyState(savedCompany);
          return;
        }
      }
      // Default to first company if no saved preference
      setActiveCompanyState(companies[0]);
    }
  }, [companies]); // Fixed: Use companies array as dependency to respect manual selections

  const setActiveCompany = (company: CompanyMember | null) => {
    setActiveCompanyState(company);
    if (company) {
      localStorage.setItem('activeCompanyId', company.company_id);
    } else {
      localStorage.removeItem('activeCompanyId');
    }
  };

  const refreshCompanies = async () => {
    await fetchUserCompanies();
  };

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        setActiveCompany,
        companies,
        loading,
        error,
        createCompany,
        updateCompany,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};