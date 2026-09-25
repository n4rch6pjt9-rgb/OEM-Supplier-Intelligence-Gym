import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { FactoryLinesCatalog } from './components/FactoryLinesCatalog.tsx';
import { CommercialIntelligence } from './components/CommercialIntelligence.tsx';
import { CrawlerPipeline } from './components/CrawlerPipeline.tsx';
import { DatabaseSchemaView } from './components/DatabaseSchemaView.tsx';
import { ProductItem, SupplierItem, DatabaseStats } from './types.ts';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';

function MainApp() {
  const [activeTab, setActiveTab] = useState<'factories' | 'commercial' | 'crawler' | 'schema'>('factories');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(true);
  const [globalQuery, setGlobalQuery] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchProducts();
    fetchSuppliers();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleOpenCommercial = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setActiveTab('commercial');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[#C2410C]/20 selection:text-[#C2410C] antialiased transition-colors">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        refreshStats={refreshAll}
        globalQuery={globalQuery}
        setGlobalQuery={setGlobalQuery}
      />

      {/* Main Container Expandido - Fundo Claro (#FAFAF9) e Fluido Sem Barra de Rolagem */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5">
        {activeTab === 'factories' && (
          <FactoryLinesCatalog
            suppliers={suppliers}
            products={products}
            loading={loadingSuppliers || loadingProducts}
            onRefresh={refreshAll}
            onOpenCommercial={handleOpenCommercial}
            globalQuery={globalQuery}
          />
        )}

        {activeTab === 'commercial' && (
          <CommercialIntelligence
            suppliers={suppliers}
            products={products}
            selectedSupplierId={selectedSupplierId}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === 'crawler' && (
          <CrawlerPipeline
            onExtractionComplete={refreshAll}
            stats={stats}
          />
        )}

        {activeTab === 'schema' && (
          <DatabaseSchemaView
            stats={stats}
            onRefresh={refreshAll}
          />
        )}
      </main>

      <footer className="border-t border-[var(--border-app)] bg-[var(--bg-card)] py-4 text-center text-xs text-[var(--text-secondary)] font-mono">
        OEM Supplier Intelligence Database &bull; Extração Semântica Made-in-China (HTML + JSON-LD) &bull; PostgreSQL Cloud SQL
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
