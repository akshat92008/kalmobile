'use client';

import React, { useState, useMemo } from 'react';
import {
  REPO_SUMMARY,
  AUDIT_FINDINGS,
  FILE_METRICS,
  ASSET_BREAKDOWN,
  LORE_DISCREPANCIES,
  type AuditFinding,
} from '@/lib/auditData';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  HardDrive,
  Cpu,
  Layers,
  GitBranch,
  Copy,
  Check,
  Sliders,
} from 'lucide-react';

type ActiveSection = 'findings' | 'architecture' | 'assets' | 'sandbox' | 'lore';
type SeverityFilter = 'All' | 'Critical' | 'High' | 'Medium' | 'Low';

export default function AuditDashboard() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('findings');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'AUD-01': true,
    'AUD-02': true,
    'AUD-04': true,
    'AUD-06': true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interactive Combat & Boon Math Sandbox State (verifying AUD-06 & rules.ts)
  const [sandboxMaxHp, setSandboxMaxHp] = useState<number>(250);
  const [sandboxHasAshvinsBoon, setSandboxHasAshvinsBoon] = useState<boolean>(true);
  const [sandboxShrineKalashaRank, setSandboxShrineKalashaRank] = useState<number>(1);
  const [sandboxComboStep, setSandboxComboStep] = useState<1 | 2 | 3 | 4>(4);
  const [sandboxWeapon, setSandboxWeapon] = useState<'jingu_bang' | 'chu_bai_spear' | 'wind_bear_talon'>('jingu_bang');
  const [sandboxVajraRank, setSandboxVajraRank] = useState<number>(2);
  const [sandboxIsBackstab, setSandboxIsBackstab] = useState<boolean>(true);
  const [sandboxHasIndraCritBoon, setSandboxHasIndraCritBoon] = useState<boolean>(true);

  const categories = useMemo(() => {
    const set = new Set<string>(AUDIT_FINDINGS.map((f) => f.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredFindings = useMemo(() => {
    return AUDIT_FINDINGS.filter((item) => {
      if (severityFilter !== 'All' && item.severity !== severityFilter) return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.file.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.rootCause.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [severityFilter, categoryFilter, searchQuery]);

  const toggleFinding = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPatch = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportMarkdown = () => {
    const lines: string[] = [
      `# Technical Audit Report: ${REPO_SUMMARY.projectName}`,
      `- Repository: ${REPO_SUMMARY.repoUrl}`,
      `- Commit SHA: ${REPO_SUMMARY.commitSha}`,
      `- Stack: ${REPO_SUMMARY.framework}`,
      `- Total Footprint: ${REPO_SUMMARY.totalRepoDiskSizeMB} MB (${REPO_SUMMARY.orphanedPublicAssetsMB} MB orphaned in public/)`,
      `- Source Lines: ${REPO_SUMMARY.totalSourceLines} LOC (KaliyugaArena.tsx = ${REPO_SUMMARY.monolithFileLines} LOC / ${REPO_SUMMARY.monolithSharePercent}%)`,
      '',
      '## Findings Summary',
      ...AUDIT_FINDINGS.map(
        (f) =>
          `### [${f.id}] (${f.severity}) ${f.title}\n- **Location**: \`${f.file}\` (${f.lines})\n- **Impact**: ${f.impactMetric}\n- **Summary**: ${f.summary}\n- **Root Cause**: ${f.rootCause}\n- **Remediation**:\n${f.remediationSteps.map((s) => `  - ${s}`).join('\n')}\n`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kaalyuga-technical-audit-report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sandbox Calculations comparing Buggy Repo Implementation vs Corrected Spec
  const sandboxCalc = useMemo(() => {
    const boonBonusRatio = sandboxHasAshvinsBoon ? 0.5 : 0;
    // Repo Line 1333: const healRatio = 0.42 + boonMods.gourdInstantHealRatio * 0.45;
    const repoBuggyHealRatio = 0.42 + boonBonusRatio * 0.45;
    const repoBuggyHealHp = Math.round(sandboxMaxHp * repoBuggyHealRatio);

    // Advertised Tooltip: "+50% Kalasha Heal Ratio"
    const fixedMultiplicativeRatio = 0.42 * (1 + boonBonusRatio);
    const fixedMultiplicativeHp = Math.round(sandboxMaxHp * fixedMultiplicativeRatio);

    // Sips calculation (Line 1030 vs Line 5762)
    const baseSips = 3 + sandboxShrineKalashaRank;
    const expectedSipsWithBoon = baseSips + (sandboxHasAshvinsBoon ? 1 : 0);
    const repoAfterShrinePurchaseSips = baseSips; // Line 5762 overwrites boon bonus!

    // Light attack damage calculation from rules.ts + boons.ts
    const baseComboTable = {
      1: { hp: 28, posture: 34 },
      2: { hp: 34, posture: 42 },
      3: { hp: 44, posture: 56 },
      4: { hp: 72, posture: 96 },
    }[sandboxComboStep];
    const weaponMult =
      sandboxWeapon === 'jingu_bang' ? 1.0 : sandboxWeapon === 'chu_bai_spear' ? 1.06 : 0.92;
    const shrineMult = 1 + sandboxVajraRank * 0.12;
    const backstabMult = sandboxIsBackstab ? (sandboxHasIndraCritBoon ? 1.8 : 1.35) : 1.0;

    const rawDamage = Math.round(baseComboTable.hp * weaponMult * shrineMult * backstabMult);
    const critDamage = Math.round(rawDamage * 1.75);

    return {
      repoBuggyHealRatio,
      repoBuggyHealHp,
      fixedMultiplicativeRatio,
      fixedMultiplicativeHp,
      expectedSipsWithBoon,
      repoAfterShrinePurchaseSips,
      rawDamage,
      critDamage,
      backstabMult,
    };
  }, [
    sandboxMaxHp,
    sandboxHasAshvinsBoon,
    sandboxShrineKalashaRank,
    sandboxComboStep,
    sandboxWeapon,
    sandboxVajraRank,
    sandboxIsBackstab,
    sandboxHasIndraCritBoon,
  ]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Top Bar Contract: Zone 1 Brand — Zone 2 Nav Links — Zone 3 Primary Action */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0B0F17]/95 backdrop-blur border-b border-slate-800">
        <a
          href="#top"
          className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          Kaliyuga Audit Workbench
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveSection('findings')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeSection === 'findings' ? 'text-slate-100 border-b-2 border-amber-400' : ''
            }`}
          >
            Findings Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('architecture')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeSection === 'architecture' ? 'text-slate-100 border-b-2 border-amber-400' : ''
            }`}
          >
            Codebase Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('assets')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeSection === 'assets' ? 'text-slate-100 border-b-2 border-amber-400' : ''
            }`}
          >
            Asset Forensics
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sandbox')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeSection === 'sandbox' ? 'text-slate-100 border-b-2 border-amber-400' : ''
            }`}
          >
            Mechanics Verifier
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('lore')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeSection === 'lore' ? 'text-slate-100 border-b-2 border-amber-400' : ''
            }`}
          >
            Lore &amp; Schema Drift
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Report (.md)
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-8 space-y-8">
        {/* Repository Executive Summary Header */}
        <section className="border border-slate-800 bg-[#111726] rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <div className="text-xs font-mono text-slate-400">
                github.com/akshat92008/kaalyuga · commit {REPO_SUMMARY.commitSha.slice(0, 12)} ·{' '}
                {REPO_SUMMARY.templateOrigin}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 mt-1">
                {REPO_SUMMARY.projectName} — Full-Stack Engineering Audit
              </h1>
              <p className="text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
                Static, architectural, runtime performance, and asset-pipeline audit of the isometric 3D
                mythic action roguelike &amp; Blender 5.2 EEVEE Next cutscene repository.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="text-xs font-mono text-slate-400">
                Stack: Next.js 15.4.9 · React 19.2.1 · Three.js 0.174.0
              </div>
            </div>
          </div>

          {/* 4-Column Quantitative KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            <div>
              <div className="text-xs font-medium text-slate-400">Repository Disk Footprint</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-red-400 mt-1">
                778.4 MB
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                442 MB cutscenes/ · 336 MB public/ (No Git LFS)
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-400">Orphaned / Dead Public Assets</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
                152.04 MB
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                32 of 53 files in public/assets/aistudio/ unreferenced
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-400">Monolith Concentration</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
                6,523 / 12,224 LOC
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                53.4% of entire codebase in KaliyugaArena.tsx
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-400">Automated Test Suite &amp; Persistence</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                10 / 10 Passing
              </div>
              <div className="text-xs text-red-400 mt-1 font-mono tabular-nums">
                0 localStorage calls (100% progress lost on reload)
              </div>
            </div>
          </div>
        </section>

        {/* Mobile / Secondary Workspace Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {(
              [
                { id: 'findings', label: '01. Audit Findings (9)', icon: AlertTriangle },
                { id: 'architecture', label: '02. Codebase & Loop Telemetry', icon: Cpu },
                { id: 'assets', label: '03. Asset & Cutscene Forensics', icon: HardDrive },
                { id: 'sandbox', label: '04. Combat & Boon Bug Verifier', icon: Sliders },
                { id: 'lore', label: '05. Wukong-to-Kaliyuga Drift', icon: GitBranch },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs font-mono text-slate-400 tabular-nums">
            3 Critical · 3 High · 2 Medium · 1 Low
          </div>
        </div>

        {/* SECTION 1: FINDINGS MATRIX */}
        {activeSection === 'findings' && (
          <section className="space-y-6">
            {/* Filter & Search Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111726] border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400 mr-1">Severity:</span>
                {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {sev}
                  </button>
                ))}

                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="ml-2 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-amber-400"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file, bug ID, or keyword..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Findings List */}
            {filteredFindings.length === 0 ? (
              <div className="border border-slate-800 bg-[#111726] rounded-xl p-12 text-center">
                <p className="text-sm text-slate-300">No audit findings match your current filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSeverityFilter('All');
                    setCategoryFilter('All');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-md cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFindings.map((finding: AuditFinding) => {
                  const isOpen = !!expandedIds[finding.id];
                  const sevColor =
                    finding.severity === 'Critical'
                      ? 'text-red-400'
                      : finding.severity === 'High'
                      ? 'text-amber-400'
                      : finding.severity === 'Medium'
                      ? 'text-sky-400'
                      : 'text-slate-400';

                  return (
                    <article
                      key={finding.id}
                      className="border border-slate-800 bg-[#111726] rounded-xl overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFinding(finding.id)}
                        className="w-full text-left px-6 py-4 flex items-start justify-between gap-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-slate-200">{finding.id}</span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-semibold ${sevColor}`}>
                              {finding.severity} Severity
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-400">{finding.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-300/90">{finding.impactMetric}</span>
                          </div>
                          <h2 className="text-base font-semibold text-slate-100">
                            {finding.title}
                          </h2>
                          <div className="text-xs font-mono text-slate-400">
                            Target: {finding.file} ({finding.lines})
                          </div>
                        </div>

                        <div className="mt-1 text-slate-400 shrink-0">
                          {isOpen ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 space-y-5">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <h3 className="text-xs font-semibold text-slate-300 mb-1.5">
                                Diagnostic Summary
                              </h3>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {finding.summary}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-xs font-semibold text-slate-300 mb-1.5">
                                Root Cause Analysis
                              </h3>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {finding.rootCause}
                              </p>
                            </div>
                          </div>

                          {/* Code Comparison */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="border border-red-900/50 bg-[#0B0F17] rounded-lg overflow-hidden">
                              <div className="px-3.5 py-2 bg-red-950/30 border-b border-red-900/40 flex items-center justify-between text-xs font-mono text-red-300">
                                <span>Current Repository Code ({finding.file})</span>
                              </div>
                              <pre className="p-3.5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                                <code>{finding.codeBefore}</code>
                              </pre>
                            </div>

                            <div className="border border-emerald-900/50 bg-[#0B0F17] rounded-lg overflow-hidden">
                              <div className="px-3.5 py-2 bg-emerald-950/30 border-b border-emerald-900/40 flex items-center justify-between text-xs font-mono text-emerald-300">
                                <span>Recommended Engineering Patch</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPatch(finding.id, finding.codeAfter)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-200 cursor-pointer"
                                >
                                  {copiedId === finding.id ? (
                                    <>
                                      <Check className="w-3 h-3" /> Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> Copy Fix
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                                <code>{finding.codeAfter}</code>
                              </pre>
                            </div>
                          </div>

                          {/* Actionable Remediation Checklist */}
                          <div>
                            <h3 className="text-xs font-semibold text-slate-300 mb-2">
                              Remediation Plan
                            </h3>
                            <ul className="space-y-1.5 text-sm text-slate-300">
                              {finding.remediationSteps.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-2.5">
                                  <span className="font-mono text-xs text-amber-400 mt-0.5">
                                    0{idx + 1}.
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION 2: CODEBASE & 60FPS LOOP TELEMETRY */}
        {activeSection === 'architecture' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="border border-slate-800 bg-[#111726] rounded-xl p-5 space-y-2">
                <div className="text-xs font-medium text-slate-400">
                  Offscreen Sprite Processing Cost
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-red-400">
                  5 Canvases × 26 Sprites = 130 Canvases
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <code className="text-amber-300">spriteProcessor.ts</code> creates{' '}
                  <code className="font-mono">cleanCanvas</code>,{' '}
                  <code className="font-mono">flashCanvas</code>,{' '}
                  <code className="font-mono">goldCanvas</code>,{' '}
                  <code className="font-mono">jadeCanvas</code>, and{' '}
                  <code className="font-mono">shadowCanvas</code> at full source resolution
                  (up to 2816×1536) for every preloaded sprite.
                </p>
              </div>

              <div className="border border-slate-800 bg-[#111726] rounded-xl p-5 space-y-2">
                <div className="text-xs font-medium text-slate-400">
                  Hybrid 3D-to-2D Render Pipeline
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-amber-400">
                  3 Canvas Contexts Composited / Frame
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <code className="text-amber-300">Rudra3DRenderer</code> (512×512 WebGL) and{' '}
                  <code className="text-amber-300">Boss3DRenderer</code> (560×560 WebGL) render
                  offscreen every tick and copy pixels to the main 2D Canvas via{' '}
                  <code className="font-mono">ctx.drawImage(webgl.canvas)</code>.
                </p>
              </div>

              <div className="border border-slate-800 bg-[#111726] rounded-xl p-5 space-y-2">
                <div className="text-xs font-medium text-slate-400">
                  Procedural Floor Redraw Overhead
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-amber-400">
                  21,420 Polygon Paths / Second
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lines 3842–3891 execute a 17×21 nested loop (357 diamond tiles) every frame at
                  60fps, constructing template-literal <code className="font-mono">rgba()</code>{' '}
                  strings and stroking double diamond paths instead of blitting a cached floor layer.
                </p>
              </div>
            </div>

            {/* File-by-File Telemetry Table */}
            <div className="border border-slate-800 bg-[#111726] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Source File Line Count &amp; Complexity Distribution
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Measured across all TypeScript, React, and Python production scripts in akshat92008/kaalyuga
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  Total TS/TSX: 12,224 LOC · Python: 2,790 LOC
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                      <th className="py-3 px-4 font-semibold">File Path</th>
                      <th className="py-3 px-4 font-semibold">Subsystem</th>
                      <th className="py-3 px-4 font-semibold text-right">Lines (LOC)</th>
                      <th className="py-3 px-4 font-semibold text-right">Size (KB)</th>
                      <th className="py-3 px-4 font-semibold">Complexity</th>
                      <th className="py-3 px-4 font-semibold">Architectural Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {FILE_METRICS.map((f) => {
                      const compColor =
                        f.complexityRating === 'Extreme'
                          ? 'text-red-400 font-semibold'
                          : f.complexityRating === 'High'
                          ? 'text-amber-400 font-semibold'
                          : f.complexityRating === 'Moderate'
                          ? 'text-sky-400'
                          : 'text-emerald-400';
                      return (
                        <tr key={f.path} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-200 whitespace-nowrap">
                            {f.path}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {f.category}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-200">
                            {f.loc.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-400">
                            {(f.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className={`py-3 px-4 whitespace-nowrap ${compColor}`}>
                            {f.complexityRating}
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-md">{f.healthNote}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: ASSET & CUTSCENE PIPELINE FORENSICS */}
        {activeSection === 'assets' && (
          <section className="space-y-6">
            <div className="border border-slate-800 bg-[#111726] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h2 className="text-base font-semibold text-slate-100">
                  Storage &amp; Binary Payload Audit (778.4 MB Total)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparison of active runtime assets vs. unreferenced dead files committed to the repository
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                      <th className="py-3 px-4 font-semibold">Directory / Bucket</th>
                      <th className="py-3 px-4 font-semibold text-right">Files</th>
                      <th className="py-3 px-4 font-semibold text-right">Orphaned Files</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Size</th>
                      <th className="py-3 px-4 font-semibold text-right">Dead / Redundant</th>
                      <th className="py-3 px-4 font-semibold">Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {ASSET_BREAKDOWN.map((row) => (
                      <tr key={row.directory} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono text-slate-200">{row.directory}</td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right text-slate-300">
                          {row.fileCount}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right text-amber-400">
                          {row.orphanedCount}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right text-slate-100 font-semibold">
                          {row.totalSizeMB.toFixed(2)} MB
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-right text-red-400 font-semibold">
                          {row.orphanedSizeMB.toFixed(2)} MB
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-md">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Non-Image Artifacts Committed to public/assets/aistudio */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-slate-800 bg-[#111726] rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-100">
                  Accidental Non-Game Artifacts in <code className="font-mono text-amber-300">public/assets/aistudio/</code>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  These files are publicly served by Next.js in production despite having zero
                  references in code:
                </p>
                <ul className="space-y-2 text-xs font-mono text-slate-300">
                  <li className="flex justify-between py-1.5 border-b border-slate-800">
                    <span>Ash-Bound_Warrior_s_Golden_Draught_92653fc8.pdf</span>
                    <span className="text-red-400 tabular-nums">3.90 MB (PDF Document)</span>
                  </li>
                  <li className="flex justify-between py-1.5 border-b border-slate-800">
                    <span>Screenshot_2026-10-25_at_11.55.22_AM_ab31e2f8.png</span>
                    <span className="text-red-400 tabular-nums">4.40 MB (macOS Screenshot)</span>
                  </li>
                  <li className="flex justify-between py-1.5 border-b border-slate-800">
                    <span>Screenshot_2026-10-25_at_2.31.51_PM_4af2c3b1.png</span>
                    <span className="text-red-400 tabular-nums">2.10 MB (macOS Screenshot)</span>
                  </li>
                  <li className="flex justify-between py-1.5 border-b border-slate-800">
                    <span>Paste_October_24__2026_-_4_38PM_6e8e76e2</span>
                    <span className="text-amber-400 tabular-nums">38.0 KB (Raw Text Prompt)</span>
                  </li>
                  <li className="flex justify-between py-1.5">
                    <span>Paste_October_25__2026_-_10_57AM_f3c3815e</span>
                    <span className="text-amber-400 tabular-nums">25.4 KB (Raw Text Prompt)</span>
                  </li>
                </ul>
              </div>

              <div className="border border-slate-800 bg-[#111726] rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-100">
                  Hardcoded Local Machine Paths in <code className="font-mono text-amber-300">cutscenes/scripts/*.py</code>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All 11 Blender Python scripts fail immediately on any machine other than the
                  original author&apos;s macOS laptop due to 39 hardcoded paths:
                </p>
                <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5 text-xs font-mono text-slate-300 space-y-1.5 overflow-x-auto">
                  <div>
                    <span className="text-slate-500"># render_master_cutscene.py:134</span>
                  </div>
                  <div className="text-red-300">
                    /Users/ashishsingh/Desktop/kaliyuga/wukong-master-guide-—-technical-code-audit-&amp;-sandbox (1)/public/models/...
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500"># fix_and_render_gow.py:8</span>
                  </div>
                  <div className="text-red-300">
                    sys.path.append(&quot;/Users/ashishsingh/.gemini/antigravity/brain/7de577fd.../scratch&quot;)
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500"># render_and_encode_gow_cutscene.py:11</span>
                  </div>
                  <div className="text-red-300">
                    FFMPEG_BIN = &quot;/Users/ashishsingh/.cache/uv/archive-v0/.../ffmpeg-macos-aarch64-v7.1&quot;
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: INTERACTIVE COMBAT & BOON MATH BUG VERIFIER */}
        {activeSection === 'sandbox' && (
          <section className="space-y-6">
            <div className="border border-slate-800 bg-[#111726] rounded-xl p-6">
              <div className="border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-base font-semibold text-slate-100">
                  Interactive Combat &amp; Boon Discrepancy Verifier (AUD-06)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Test live inputs against the exact formulas in{' '}
                  <code className="font-mono text-slate-300">lib/game/rules.ts</code>,{' '}
                  <code className="font-mono text-slate-300">lib/game/boons.ts</code>, and{' '}
                  <code className="font-mono text-slate-300">components/game/KaliyugaArena.tsx</code>{' '}
                  to inspect where UI tooltips and runtime math diverge.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Kalasha Heal & Shrine Sip Overwrite Bug */}
                <div className="space-y-4 border border-slate-800 bg-[#0B0F17] rounded-xl p-5">
                  <div className="text-xs font-mono text-amber-400">
                    VERIFIER A · KALASHA HEAL &amp; SHRINE SIP OVERWRITE (Lines 1333 &amp; 5762)
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Ashvins Boon (&quot;Soma of the Ashvins&quot;) vs. Homa Shrine Purchase
                  </h3>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Player Max HP (Rudra)</span>
                        <span className="font-mono tabular-nums text-amber-300">
                          {sandboxMaxHp} HP
                        </span>
                      </div>
                      <input
                        type="range"
                        min={220}
                        max={400}
                        step={30}
                        value={sandboxMaxHp}
                        onChange={(e) => setSandboxMaxHp(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">
                          Shrine Rank: Soma-Kalasha Vessel (+1 Sip / Rank)
                        </span>
                        <span className="font-mono tabular-nums text-amber-300">
                          Rank {sandboxShrineKalashaRank} / 2
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={1}
                        value={sandboxShrineKalashaRank}
                        onChange={(e) => setSandboxShrineKalashaRank(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={sandboxHasAshvinsBoon}
                        onChange={(e) => setSandboxHasAshvinsBoon(e.target.checked)}
                        className="accent-amber-400 w-4 h-4"
                      />
                      <span>
                        Active Boon: <strong>Soma of the Ashvins</strong> (+50% Kalasha Heal Ratio ·
                        +1 Max Kalasha Sip)
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                    <div className="p-3 rounded-lg bg-red-950/25 border border-red-900/40">
                      <div className="text-xs text-red-300 font-medium">
                        Actual Repo Code (Line 1333)
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-red-400 mt-1">
                        +{sandboxCalc.repoBuggyHealHp} HP ({Math.round(sandboxCalc.repoBuggyHealRatio * 100)}%)
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        0.42 + 0.5 * 0.45 = 64.5%
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-950/25 border border-emerald-900/40">
                      <div className="text-xs text-emerald-300 font-medium">
                        Patched Formula (+50% Ratio)
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-1">
                        +{sandboxCalc.fixedMultiplicativeHp} HP (
                        {Math.round(sandboxCalc.fixedMultiplicativeRatio * 100)}%)
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        0.42 * (1 + 0.5) = 63.0%
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expected Max Sips (Shrine + Boon):</span>
                      <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                        {sandboxCalc.expectedSipsWithBoon} Sips
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Actual Max Sips After Buying Any Shrine Upgrade (Line 5762):
                      </span>
                      <span className="font-mono tabular-nums text-red-400 font-semibold">
                        {sandboxCalc.repoAfterShrinePurchaseSips} Sips (Boon +1 Sip Wiped!)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Combat Damage & Shadow Strike Backstab Verifier */}
                <div className="space-y-4 border border-slate-800 bg-[#0B0F17] rounded-xl p-5">
                  <div className="text-xs font-mono text-amber-400">
                    VERIFIER B · COMBO DAMAGE, WEAPON SCALING &amp; BACKSTAB MULTIPLIER
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Deterministic Combat Resolution (<code className="font-mono">rules.ts</code> +{' '}
                    <code className="font-mono">boons.ts</code>)
                  </h3>

                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'jingu_bang', label: 'Khanda Mace (1.0x)' },
                          { id: 'chu_bai_spear', label: 'Pinaka Spear (1.06x)' },
                          { id: 'wind_bear_talon', label: 'Vajra Claws (0.92x)' },
                        ] as const
                      ).map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSandboxWeapon(w.id)}
                          className={`px-2.5 py-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
                            sandboxWeapon === w.id
                              ? 'bg-amber-400/15 border-amber-400 text-amber-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Light Attack Combo Step (1–4)</span>
                        <span className="font-mono tabular-nums text-amber-300">
                          Step {sandboxComboStep}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        step={1}
                        value={sandboxComboStep}
                        onChange={(e) =>
                          setSandboxComboStep(Number(e.target.value) as 1 | 2 | 3 | 4)
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">
                          Shrine Rank: Vajra-Grip Sinew (+12% Damage / Rank)
                        </span>
                        <span className="font-mono tabular-nums text-amber-300">
                          Rank {sandboxVajraRank} / 4
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={4}
                        step={1}
                        value={sandboxVajraRank}
                        onChange={(e) => setSandboxVajraRank(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sandboxIsBackstab}
                          onChange={(e) => setSandboxIsBackstab(e.target.checked)}
                          className="accent-amber-400 w-4 h-4"
                        />
                        <span>Shadow Strike (Attacking Behind Enemy)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sandboxHasIndraCritBoon}
                          onChange={(e) => setSandboxHasIndraCritBoon(e.target.checked)}
                          className="accent-amber-400 w-4 h-4"
                        />
                        <span>Thousand-Eyed Dharma Boon (1.8x Backstab)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-xs text-slate-400">Standard Hit Damage</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1">
                        {sandboxCalc.rawDamage} DMG
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Backstab Mult: {sandboxCalc.backstabMult.toFixed(2)}x
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-950/25 border border-amber-800/40">
                      <div className="text-xs text-amber-300">Critical Hit Damage (1.75x)</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
                        {sandboxCalc.critDamage} DMG
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Crit Chance: {sandboxHasIndraCritBoon ? '30%' : '6%'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 5: WUKONG-TO-KALIYUGA LORE & SCHEMA DRIFT */}
        {activeSection === 'lore' && (
          <section className="space-y-6">
            <div className="border border-slate-800 bg-[#111726] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h2 className="text-base font-semibold text-slate-100">
                  Domain &amp; Schema Drift: &quot;Black Myth: Wukong&quot; Internals vs. &quot;Kaliyuga&quot; UI Layer (AUD-08)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Internal TypeScript union types, property names, and line 3642&apos;s revive
                  floating text retain Journey to the West identifiers from an earlier prototype
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                      <th className="py-3 px-4 font-semibold">Internal Code Identifier</th>
                      <th className="py-3 px-4 font-semibold">Original Prototype Meaning</th>
                      <th className="py-3 px-4 font-semibold">Displayed Kaliyuga UI String</th>
                      <th className="py-3 px-4 font-semibold">Subtitle / Property Field</th>
                      <th className="py-3 px-4 font-semibold">Source File Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {LORE_DISCREPANCIES.map((item) => {
                      const isLeak = item.internalIdentifier.includes('JIUMING HAOMAO');
                      return (
                        <tr
                          key={item.internalIdentifier}
                          className={isLeak ? 'bg-red-950/20' : 'hover:bg-slate-800/30'}
                        >
                          <td className="py-3.5 px-4 font-mono text-amber-300">
                            {item.internalIdentifier}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{item.internalOrigin}</td>
                          <td
                            className={`py-3.5 px-4 font-medium ${
                              isLeak ? 'text-red-400 font-bold' : 'text-slate-100'
                            }`}
                          >
                            {item.displayedKaliyugaName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {item.displayedDeityOrSubtitle}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {item.fileLocation}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 max-w-[1380px] w-full mx-auto">
        <span>
          Technical Audit Workbench for akshat92008/kaalyuga · Commit 2e16e20445e7
        </span>
        <span className="font-mono tabular-nums">
          12,224 TS/TSX LOC · 2,790 Python LOC · 10/10 Unit Tests Verified
        </span>
      </footer>
    </div>
  );
}
