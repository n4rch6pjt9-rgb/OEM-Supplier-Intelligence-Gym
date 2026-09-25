import React from 'react';
import {
  Database,
  Layers,
  Search,
  Factory,
  FileCode,
  LogIn,
  LogOut,
  User,
  Cpu,
  RefreshCw,
  Sparkles,
  Boxes,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { DatabaseStats } from '../types.ts';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';

interface HeaderProps {
  activeTab: 'factories' | 'commercial' | 'crawler' | 'schema';
  setActiveTab: (tab: 'factories' | 'commercial' | 'crawler' | 'schema') => void;
  stats: DatabaseStats | null;
  refreshStats: () => void;
  globalQuery: string;
  setGlobalQuery: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  refreshStats,
  globalQuery,
  setGlobalQuery,
}) => {
  const { user, signInWithGoogle, signOut, loading } = useAuth();
  const { theme, toggleTheme, isLight } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border-app)] text-[var(--text-primary)] shadow-xs transition-colors">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Platform Info - Laranja da Marca exclusivo no Logo */}
          <div className="flex items-center gap-3.5 min-w-fit">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F28C5B] to-[#C2410C] flex items-center justify-center shadow-md shadow-[#C2410C]/25 ring-1 ring-[#F28C5B]/40 text-white font-bold shrink-0">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base tracking-tight text-[var(--text-primary)]">
                  Inteligência OEM Made-in-China
                </span>
                <span className="text-[10px] py-0.5 px-2 font-mono rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-app)]">
                  v2 PostgreSQL
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono hidden sm:block">
                Fábrica &bull; Linha &bull; SKU &bull; Medidas &bull; Embalagem (Packing Size)
              </p>
            </div>
          </div>

          {/* Quick Search Lovable / Paper Style */}
          <div className="flex-1 max-w-lg hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Buscar por fábrica, linha, modelo/SKU, NCM, medidas..."
                value={globalQuery}
                onChange={e => setGlobalQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-app)] hover:border-[#F28C5B]/60 focus:border-[#C2410C] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-1 focus:ring-[#C2410C]/30 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Top Stats & Actions */}
          <div className="flex items-center gap-2.5">
            {stats && (
              <div
                onClick={refreshStats}
                title="PostgreSQL Cloud SQL Conectado"
                className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-xl text-xs hover:border-[#F28C5B]/40 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px]">Cloud SQL Ativo</span>
                </div>
                <div className="h-3 w-px bg-[var(--border-app)]" />
                <span className="text-[var(--text-primary)] font-semibold">{stats.totalSuppliers}</span>
                <span className="text-[var(--text-secondary)] text-[11px]">fábricas</span>
                <div className="h-3 w-px bg-[var(--border-app)]" />
                <span className="text-[var(--text-primary)] font-semibold">{stats.totalProducts}</span>
                <span className="text-[var(--text-secondary)] text-[11px]">SKUs</span>
                <RefreshCw className="w-3 h-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] ml-0.5" />
              </div>
            )}

            {/* Alternador de Tema: Papel Claro (#FAFAF9) / Grafite Escuro (#151514) */}
            <button
              onClick={toggleTheme}
              title={isLight ? 'Fundo Claro (#FAFAF9) ativo. Clique para alternar para Grafite Escuro' : 'Grafite Escuro (#151514) ativo. Clique para alternar para Papel Claro'}
              className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-app)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#F28C5B]/40 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              {isLight ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span className="hidden xl:inline text-[11px] text-[var(--text-primary)]">Fundo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#F28C5B]" />
                  <span className="hidden xl:inline text-[11px] text-[var(--text-primary)]">Grafite</span>
                </>
              )}
            </button>

            {/* Auth Button - Botão Principal da Marca em Laranja com Texto Branco (5,2:1) */}
            {!loading && (
              <div>
                {user ? (
                  <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-app)] rounded-xl px-2.5 py-1">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Usuário'}
                        className="w-5 h-5 rounded-full border border-[var(--border-app)]"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#F28C5B]" />
                    )}
                    <span className="text-xs text-[var(--text-primary)] font-medium max-w-[120px] truncate hidden sm:inline">
                      {user.displayName || user.email}
                    </span>
                    <button
                      onClick={signOut}
                      title="Sair"
                      className="text-[var(--text-secondary)] hover:text-rose-600 p-0.5 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    onClick={signInWithGoogle}
                    variant="lovable"
                    size="sm"
                    className="gap-1.5 shadow-md shadow-[#C2410C]/20"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login Google</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation - Estilo Papel Claro / Grafite Elegante */}
        <div className="flex items-center gap-1.5 border-t border-[var(--border-app)] overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('factories')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'factories'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-app)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <Factory className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#F28C5B]" />
            <span>Fábricas &amp; Linhas de Produtos</span>
            {stats && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-app)]">
                {stats.totalSuppliers} fábricas
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('commercial')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'commercial'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-app)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Inteligência Comercial &amp; Compra (Cereja do Bolo)</span>
            <Badge variant="amber" className="text-[10px] py-0 px-1.5 h-4.5 font-normal ml-1">
              Preços &bull; Incoterms &bull; MOQ
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('crawler')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'crawler'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-app)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Extrator &amp; Crawler (5 Fontes)</span>
            <Badge variant="emerald" className="text-[10px] py-0 px-1.5 h-4.5 font-normal ml-1">
              JSON-LD + DT/DD
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border-app)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Estrutura PostgreSQL &amp; Auditoria</span>
            {stats && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-app)]">
                {stats.totalCrawlJobs} logs
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
