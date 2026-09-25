import React, { useState } from 'react';
import {
  Building2,
  Factory,
  Globe2,
  Clock,
  ShieldCheck,
  Cpu,
  Users,
  Award,
  Truck,
  CheckCircle2,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Anchor,
  Sparkles,
} from 'lucide-react';
import { SupplierItem, ProductItem } from '../types.ts';

interface SupplierIntelligenceProps {
  suppliers: SupplierItem[];
  loading: boolean;
  onRefresh: () => void;
  selectedSupplierId?: string | null;
}

export const SupplierIntelligence: React.FC<SupplierIntelligenceProps> = ({
  suppliers,
  loading,
  onRefresh,
  selectedSupplierId,
}) => {
  const [activeSupplierId, setActiveSupplierId] = useState<string>(
    selectedSupplierId || (suppliers[0]?.supplierId ?? '')
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSupplierTab, setActiveSupplierTab] = useState<'profile' | 'production' | 'commercial' | 'market'>('profile');

  // Sync if selectedSupplierId prop changes
  React.useEffect(() => {
    if (selectedSupplierId) {
      setActiveSupplierId(selectedSupplierId);
    } else if (!activeSupplierId && suppliers.length > 0) {
      setActiveSupplierId(suppliers[0].supplierId);
    }
  }, [selectedSupplierId, suppliers]);

  const filteredSuppliers = suppliers.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.supplierName.toLowerCase().includes(q) ||
      s.businessType?.toLowerCase().includes(q) ||
      s.contactName?.toLowerCase().includes(q)
    );
  });

  const activeSupplier =
    suppliers.find(s => s.supplierId === activeSupplierId) || suppliers[0];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Factory className="w-5 h-5 text-cyan-400" />
            <span>OEM Supplier Intelligence &amp; Operational Audit</span>
          </h2>
          <p className="text-xs text-slate-400">
            Factory background, commercial terms, automated production lines, inspection methodologies, and global trade records extracted from Made-in-China.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
            {suppliers.length} Verified OEM Factories
          </span>
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Loading Supplier Intelligence records...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300 mb-1">No Suppliers Found</h3>
          <p className="text-xs text-slate-500">Run the crawler pipeline to extract OEM suppliers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Supplier Directory Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search factory name, type..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {filteredSuppliers.map(s => {
                const isActive = s.supplierId === activeSupplier?.supplierId;
                return (
                  <div
                    key={s.supplierId}
                    onClick={() => setActiveSupplierId(s.supplierId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      isActive
                        ? 'bg-cyan-950/40 border-cyan-500/70 shadow-md'
                        : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {s.supplierName}
                      </h4>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                        {s.foundedDate ? `Est. ${s.foundedDate}` : 'OEM'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{s.employees} staff</span>
                      <span>•</span>
                      <span>{s.plantAreaSqm.toLocaleString()} m²</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono">{s.responseTimeAvg30d}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      {s.oemAvailable && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/80 rounded font-semibold">
                          OEM Available
                        </span>
                      )}
                      {s.odmAvailable && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-blue-950 text-blue-400 border border-blue-800/80 rounded font-semibold">
                          ODM
                        </span>
                      )}
                      {s.customizationAvailable && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-slate-800 text-slate-300 rounded">
                          Customization
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supplier Deep Intelligence Panel */}
          {activeSupplier && (
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              {/* Header Title & Quick Badges */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                      ID: {activeSupplier.supplierId}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {activeSupplier.businessType}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {activeSupplier.supplierName}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Contact: <strong>{activeSupplier.contactName}</strong></span>
                    <span>•</span>
                    <span>30d Avg Response: <strong className="text-emerald-400 font-mono">{activeSupplier.responseTimeAvg30d}</strong></span>
                  </p>
                </div>

                {activeSupplier.homepageUrl && (
                  <a
                    href={activeSupplier.homepageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-semibold border border-slate-700 transition"
                  >
                    <span>Homepage</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveSupplierTab('profile')}
                  className={`flex-1 py-1.5 rounded-md transition font-medium ${
                    activeSupplierTab === 'profile'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Factory Background
                </button>
                <button
                  onClick={() => setActiveSupplierTab('production')}
                  className={`flex-1 py-1.5 rounded-md transition font-medium ${
                    activeSupplierTab === 'production'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Production &amp; QA
                </button>
                <button
                  onClick={() => setActiveSupplierTab('commercial')}
                  className={`flex-1 py-1.5 rounded-md transition font-medium ${
                    activeSupplierTab === 'commercial'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Commercial &amp; Ports
                </button>
                <button
                  onClick={() => setActiveSupplierTab('market')}
                  className={`flex-1 py-1.5 rounded-md transition font-medium ${
                    activeSupplierTab === 'market'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Global Trade &amp; Markets
                </button>
              </div>

              {/* Tab 1: Factory Background */}
              {activeSupplierTab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Employees</span>
                      <span className="text-base font-bold text-white">{activeSupplier.employees} People</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Plant Area</span>
                      <span className="text-base font-bold text-white">{activeSupplier.plantAreaSqm?.toLocaleString()} m²</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Year Established</span>
                      <span className="text-base font-bold text-white">{activeSupplier.foundedDate || 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Registered Capital</span>
                      <span className="text-sm font-semibold text-slate-200 truncate block">{activeSupplier.registeredCapital || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Business Identity &amp; Contact Credentials
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Contact Person</span>
                        <span className="text-slate-200 font-medium">{activeSupplier.contactName} ({activeSupplier.contactGender || 'Representative'})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Domain User ID</span>
                        <span className="text-slate-200 font-mono">{activeSupplier.domainUserId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Business Type</span>
                        <span className="text-slate-200">{activeSupplier.businessType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">OEM Service Scope</span>
                        <span className="text-emerald-400 font-semibold">
                          {[
                            activeSupplier.oemAvailable && 'OEM Manufacturing',
                            activeSupplier.odmAvailable && 'ODM Engineering',
                            activeSupplier.customizationAvailable && 'Full Customization',
                          ].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Production Capability & Technical Expertise */}
              {activeSupplierTab === 'production' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Production Lines</span>
                      <span className="text-base font-bold text-cyan-400">{activeSupplier.productionLines} Automated Lines</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">QA/QC Inspectors</span>
                      <span className="text-base font-bold text-white">{activeSupplier.qaInspectors} Specialists</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">R&amp;D Engineers</span>
                      <span className="text-base font-bold text-white">{activeSupplier.rdEngineers} Engineers</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Audit Type</span>
                      <span className="text-xs font-semibold text-slate-300 truncate block">{activeSupplier.inspectionType || 'ISO Verified'}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Key Production Machinery &amp; Equipment
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {activeSupplier.productionMachines && activeSupplier.productionMachines.length > 0 ? (
                        activeSupplier.productionMachines.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                          >
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Automated manufacturing lines</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Quality Control &amp; Inspection Protocol
                    </h4>
                    <p className="text-xs text-slate-300">
                      {activeSupplier.inspectionMethod || '100% In-line QC and pre-shipment AQL verification.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Commercial Capabilities */}
              {activeSupplierTab === 'commercial' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                        Payment Terms &amp; Conditions
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeSupplier.paymentTerms?.map((term, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-slate-900 border border-slate-800 text-cyan-300 rounded font-mono"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                        Trade Incoterms
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeSupplier.incoterms?.map((inc, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-slate-900 border border-slate-800 text-blue-300 rounded font-mono"
                          >
                            {inc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Peak Lead Time</span>
                      <span className="text-sm font-bold text-slate-200">{activeSupplier.leadTimePeak || '25-30 Days'}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Off-Peak Lead Time</span>
                      <span className="text-sm font-bold text-slate-200">{activeSupplier.leadTimeOffpeak || '15-20 Days'}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Nearest Ports</span>
                      <span className="text-xs font-semibold text-slate-200 truncate block">
                        {activeSupplier.nearestPorts?.join(', ') || 'Shenzhen, Shanghai'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Global Trade & Markets */}
              {activeSupplierTab === 'market' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Export Experience</span>
                      <span className="text-base font-bold text-white">{activeSupplier.exportYears} Years</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Repeat Buyers Rate</span>
                      <span className="text-base font-bold text-emerald-400">{activeSupplier.repeatBuyersPercent || '90%+'}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Foreign Trade Staff</span>
                      <span className="text-base font-bold text-white">{activeSupplier.foreignTradeStaff} Specialists</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Key Export Distribution Markets
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {activeSupplier.mainMarkets?.map((market, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 flex items-center gap-1.5"
                        >
                          <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{market}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
