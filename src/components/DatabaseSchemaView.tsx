import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  CheckCircle2,
  Clock,
  Layers,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import { CrawlLogItem, DatabaseStats } from '../types.ts';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';

interface DatabaseSchemaViewProps {
  stats: DatabaseStats | null;
  onRefresh: () => void;
}

export const DatabaseSchemaView: React.FC<DatabaseSchemaViewProps> = ({
  stats,
  onRefresh,
}) => {
  const [crawlLogs, setCrawlLogs] = useState<CrawlLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'tables' | 'logs'>('tables');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/crawl-logs');
      if (res.ok) {
        const data = await res.json();
        setCrawlLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch crawl logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const schemaTables = [
    {
      name: 'products',
      description: 'Especificações técnicas OEM, Linha/Série, Cubagem (C x L x A mm), Peso Líquido/Bruto (kg), Tipo de Embalagem, NCM e JSON-LD',
      columns: [
        { name: 'product_id', type: 'text (PK)', desc: 'Identificador único do produto extraído' },
        { name: 'model_no', type: 'text', desc: 'Modelo OEM Crítico (ex: M9S12, TZ-5000, E7017)' },
        { name: 'product_line', type: 'text', desc: 'Linha / Série de fabricação do equipamento' },
        { name: 'length_mm / width_mm / height_mm', type: 'double precision', desc: 'Medidas dimensionais: Comprimento x Largura x Altura (mm)' },
        { name: 'net_weight_kg / gross_weight_kg', type: 'double precision', desc: 'Pesos para frete: Peso Líquido (PL) e Peso Bruto (PB) em kg' },
        { name: 'packaging_type', type: 'text', desc: 'Tipo e especificação da embalagem para exportação' },
        { name: 'title', type: 'text', desc: 'Título e descrição técnica do equipamento' },
        { name: 'supplier_id', type: 'text (FK -> suppliers)', desc: 'Fábrica fabricante associada' },
        { name: 'material / specification', type: 'text', desc: 'Tubulação em aço, espessura e biomecânica' },
        { name: 'hs_code / origin', type: 'text', desc: 'Classificação fiscal NCM e cidade/província de origem' },
        { name: 'production_capacity', type: 'text', desc: 'Capacidade de produção mensal da fábrica' },
        { name: 'certifications', type: 'jsonb', desc: 'Matriz de normas: CE, ISO9001, RoHS, TÜV' },
        { name: 'raw_attributes', type: 'jsonb', desc: 'Dicionário normalizado de todos os pares DT/DD' },
      ],
    },
    {
      name: 'suppliers',
      description: 'Perfil fabril, área industrial (m²), colaboradores, linhas automáticas, termos de compra, Incoterms e histórico',
      columns: [
        { name: 'supplier_id', type: 'text (PK)', desc: 'Identificador corporativo da fábrica' },
        { name: 'supplier_name', type: 'text', desc: 'Razão social e nome empresarial completo' },
        { name: 'employees / plant_area_sqm', type: 'integer', desc: 'Quadro de funcionários e área da planta fabril (m²)' },
        { name: 'response_time_avg_30d', type: 'text', desc: 'Tempo médio de resposta a cotações em 30 dias' },
        { name: 'production_lines', type: 'integer', desc: 'Quantidade de linhas automatizadas' },
        { name: 'production_machines', type: 'jsonb', desc: 'Maquinário industrial: Corte laser, robôs de solda' },
        { name: 'qa_inspectors / rd_engineers', type: 'integer', desc: 'Equipe de controle de qualidade e engenharia de P&D' },
        { name: 'payment_terms / incoterms', type: 'jsonb', desc: 'Condições de pagamento e Incoterms (FOB, CIF, EXW)' },
        { name: 'nearest_ports', type: 'jsonb', desc: 'Portos marítimos chineses homologados mais próximos' },
        { name: 'oem_available / odm_available', type: 'boolean', desc: 'Habilitação para personalização OEM/ODM sob medida' },
        { name: 'repeat_buyers_percent', type: 'text', desc: 'Taxa de recompra de importadores internacionais' },
      ],
    },
    {
      name: 'product_attributes',
      description: 'Pares chave-valor relacionais normalizados diretamente das tags <dl class="product-attrs-list"> DT/DD',
      columns: [
        { name: 'id', type: 'serial (PK)', desc: 'Chave primária inteira sequencial' },
        { name: 'product_id', type: 'text (FK -> products)', desc: 'Chave estrangeira vinculando ao produto OEM' },
        { name: 'attribute_name', type: 'text', desc: 'Rótulo DT (ex: "Folded", "Power Source", "Material")' },
        { name: 'attribute_value', type: 'text', desc: 'Valor DD (ex: "Unfolded", "Manual", "Steel")' },
        { name: 'created_at', type: 'timestamp', desc: 'Data e hora da gravação' },
      ],
    },
    {
      name: 'crawl_logs',
      description: 'Trilha de auditoria das execuções do crawler e prioridade das 5 fontes de dados',
      columns: [
        { name: 'id', type: 'serial (PK)', desc: 'ID do lote de rastreio' },
        { name: 'target_url', type: 'text', desc: 'URL rastreada da Made-in-China' },
        { name: 'status', type: 'text', desc: 'Status da execução (completed, failed)' },
        { name: 'sources_used', type: 'jsonb', desc: 'Fontes utilizadas (JSON-LD, DT/DD, APIs)' },
        { name: 'summary', type: 'text', desc: 'Resumo estruturado dos atributos normalizados' },
      ],
    },
    {
      name: 'users',
      description: 'Sincronização de credenciais de login via Firebase Authentication',
      columns: [
        { name: 'id', type: 'serial (PK)', desc: 'ID interno do usuário' },
        { name: 'uid', type: 'text (Unique)', desc: 'UID do Firebase Auth' },
        { name: 'email', type: 'text', desc: 'E-mail do operador autenticado' },
        { name: 'created_at', type: 'timestamp', desc: 'Data de registro' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Cloud SQL PostgreSQL Normalized Schema &amp; Crawler Audit Logs</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Drizzle ORM schema mapping with strict types, relational foreign keys, and multi-source extraction job tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-app)] text-xs">
            <button
              onClick={() => setActiveSchemaTab('tables')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeSchemaTab === 'tables'
                  ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Schema Tables (5)
            </button>
            <button
              onClick={() => setActiveSchemaTab('logs')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeSchemaTab === 'logs'
                  ? 'bg-[var(--bg-card)] text-[#C2410C] dark:text-[#F28C5B] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Crawl Logs ({crawlLogs.length})
            </button>
          </div>

          <Button
            onClick={() => {
              onRefresh();
              fetchLogs();
            }}
            variant="outline"
            size="sm"
            title="Refresh database state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Database Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] p-4 rounded-xl shadow-xs">
            <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Products Table</span>
            <div className="text-xl font-bold text-[var(--text-primary)] mt-1">{stats.totalProducts}</div>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">Normalized OEM Specs</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] p-4 rounded-xl shadow-xs">
            <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Suppliers Table</span>
            <div className="text-xl font-bold text-[var(--text-primary)] mt-1">{stats.totalSuppliers}</div>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">Verified Factories</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] p-4 rounded-xl shadow-xs">
            <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Product Attributes</span>
            <div className="text-xl font-bold text-cyan-700 dark:text-cyan-400 mt-1">{stats.totalAttributes}</div>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">Relational DT/DD Rows</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] p-4 rounded-xl shadow-xs">
            <span className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Crawl Job Audits</span>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{stats.totalCrawlJobs}</div>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">Logged Pipeline Runs</p>
          </div>
        </div>
      )}

      {/* Tab: Schema Tables */}
      {activeSchemaTab === 'tables' && (
        <div className="space-y-5">
          {schemaTables.map((t, idx) => (
            <div
              key={idx}
              className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl overflow-hidden shadow-xs"
            >
              <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-app)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Table className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-mono text-[#C2410C] dark:text-[#F28C5B]">{t.name}</span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.description}</p>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {t.columns.length} columns
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] font-mono border-b border-[var(--border-app)]">
                    <tr>
                      <th className="p-3">Column Name</th>
                      <th className="p-3">PostgreSQL Type</th>
                      <th className="p-3">Description &amp; Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-app)] bg-[var(--bg-card)]">
                    {t.columns.map((col, cIdx) => (
                      <tr key={cIdx} className="hover:bg-[var(--bg-surface)]">
                        <td className="p-3 font-mono font-medium text-[var(--text-primary)]">
                          {col.name}
                        </td>
                        <td className="p-3 font-mono text-cyan-700 dark:text-cyan-400 text-[11px]">
                          {col.type}
                        </td>
                        <td className="p-3 text-[var(--text-secondary)]">
                          {col.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Crawl Logs */}
      {activeSchemaTab === 'logs' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-app)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Crawler Extraction Execution History</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Audit records stored in PostgreSQL <code className="text-[#C2410C] dark:text-[#F28C5B] font-mono">crawl_logs</code>.
              </p>
            </div>
            <button
              onClick={fetchLogs}
              className="text-xs text-[#C2410C] dark:text-[#F28C5B] hover:underline font-medium cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          {loadingLogs ? (
            <div className="p-12 text-center text-[var(--text-secondary)] text-xs">Loading logs...</div>
          ) : crawlLogs.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-secondary)] text-xs">
              No crawl executions recorded yet. Run a preset or URL in the Extraction Cockpit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] font-mono border-b border-[var(--border-app)]">
                  <tr>
                    <th className="p-3">Job ID</th>
                    <th className="p-3">Target URL</th>
                    <th className="p-3">Sources Used</th>
                    <th className="p-3">Product / Supplier ID</th>
                    <th className="p-3">Summary</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-app)] bg-[var(--bg-card)]">
                  {crawlLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[var(--bg-surface)]">
                      <td className="p-3 font-mono text-[var(--text-secondary)]">#{log.id}</td>
                      <td className="p-3 text-[var(--text-primary)] font-mono truncate max-w-xs" title={log.targetUrl}>
                        {log.targetUrl}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {log.sourcesUsed?.map((src: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="px-1.5 py-0.2 text-[9px] bg-[var(--bg-surface)] border border-[var(--border-app)] text-cyan-800 dark:text-cyan-300 rounded font-mono"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-[var(--text-secondary)]">
                        <div className="text-[var(--text-primary)]">{log.productId || 'N/A'}</div>
                        <div>{log.supplierId || 'N/A'}</div>
                      </td>
                      <td className="p-3 text-[var(--text-secondary)] max-w-sm truncate" title={log.summary || ''}>
                        {log.summary || 'Extracted successfully'}
                      </td>
                      <td className="p-3 font-mono text-[var(--text-secondary)] text-[10px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
