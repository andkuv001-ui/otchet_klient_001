import React, { useState, useMemo } from 'react';
import { ReportData, CalcRow, SearchViewsSummary, PaidServiceItem } from '../types/report';
import { DEFAULT_VIEWS_SUMMARY } from '../data/niches';
import { buildPricingTiers } from '../services/avitoSheetParser';
import { 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  HelpCircle, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Coins, 
  Calendar,
  Sparkles,
  Camera,
  MapPin,
  X,
  Eye,
  Zap,
  Layers,
  BarChart3,
  Flame,
  Table,
  SlidersHorizontal,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { MonthData, SeasonPeriod, WordstatAnalysis } from '../types/report';

interface ReportViewerProps {
  data: ReportData;
  onUpdateData: (updated: ReportData) => void;
  isEditMode?: boolean;
  onOpenUnifiedModal?: (tab?: 'sheet' | 'geo' | 'photo' | 'wordstat') => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  data,
  onUpdateData,
  isEditMode = false,
  onOpenUnifiedModal
}) => {
  const [copiedAdId, setCopiedAdId] = useState<string | null>(null);
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [activeTabAd, setActiveTabAd] = useState<number>(0);
  const [showBudgetRubles, setShowBudgetRubles] = useState<boolean>(true);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [seasonViewMode, setSeasonViewMode] = useState<'chart' | 'cards' | 'table'>('chart');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  // Apply new Wordstat data to report
  const handleApplyWordstat = (res: {
    months: MonthData[];
    periods: SeasonPeriod[];
    note: string;
    annualBudgetRub: number;
    wordstatAnalysis: WordstatAnalysis;
    keyword: string;
    region: string;
    rawText: string;
  }) => {
    onUpdateData({
      ...data,
      seasonality: {
        ...data.seasonality,
        sectionTitle: `4. Продвижение с учётом сезона (${res.keyword ? `${res.keyword}, ` : ''}${res.region || data.city})`,
        months: res.months,
        periods: res.periods,
        note: res.note,
        annualBudgetRub: res.annualBudgetRub,
        wordstatAnalysis: res.wordstatAnalysis,
        wordstatKeyword: res.keyword,
        wordstatRegion: res.region,
        wordstatRawText: res.rawText
      }
    });
  };

  const viewsSummary: SearchViewsSummary = useMemo(() => {
    return data.viewsSummary || DEFAULT_VIEWS_SUMMARY;
  }, [data.viewsSummary]);

  const handleUpdateViewsSummary = (field: keyof SearchViewsSummary, value: any) => {
    onUpdateData({
      ...data,
      viewsSummary: {
        ...viewsSummary,
        [field]: value
      }
    });
  };

  const handleUpdatePaidServiceCount = (id: string, count: number) => {
    const updatedServices = viewsSummary.paidServices.map(ps => 
      ps.id === id ? { ...ps, count: Math.max(0, count) } : ps
    );
    onUpdateData({
      ...data,
      viewsSummary: {
        ...viewsSummary,
        paidServices: updatedServices
      }
    });
  };

  // Copy ad text handler
  const handleCopyAd = (adId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAdId(adId);
    setTimeout(() => setCopiedAdId(null), 2200);
  };

  // Toggle "Why"
  const toggleWhy = (adId: string) => {
    setExpandedWhy(prev => ({ ...prev, [adId]: !prev[adId] }));
  };

  // Calculator logic
  const { totalViews, totalContacts, avgCr, calculatedRows } = useMemo(() => {
    let tv = 0;
    let tc = 0;
    data.calculator.rows.forEach(r => {
      tv += Number(r.views) || 0;
      tc += Number(r.contacts) || 0;
    });
    const avg = tv > 0 ? tc / tv : 0;
    const threshold = avg * (data.calculator.thresholdRatio || 0.6);

    const calcRows = data.calculator.rows.map(r => {
      const cr = r.views > 0 ? (r.contacts / r.views) : 0;
      const isBad = avg > 0 && cr < threshold;
      return {
        ...r,
        crPercent: (cr * 100).toFixed(1),
        isBad
      };
    });

    return {
      totalViews: tv,
      totalContacts: tc,
      avgCr: (avg * 100).toFixed(1),
      calculatedRows: calcRows
    };
  }, [data.calculator.rows, data.calculator.thresholdRatio]);

  // Section title formatting if client has no account (omits Section 1 Calculator and Section 2 Checklist, decrements numbers by 2)
  const getSectionTitle = (title: string, originalIndex: number): string => {
    if (data.hasExistingAccount === false) {
      const newIndex = originalIndex - 2;
      return title.replace(new RegExp(`^${originalIndex}\\.\\s*`), `${newIndex}. `);
    }
    return title;
  };

  // Update calculator row
  const handleRowChange = (id: string, field: 'views' | 'contacts' | 'name', value: any) => {
    const updatedRows = data.calculator.rows.map(r => {
      if (r.id === id) {
        return {
          ...r,
          [field]: field === 'name' ? value : Math.max(0, parseInt(value, 10) || 0)
        };
      }
      return r;
    });
    onUpdateData({
      ...data,
      calculator: {
        ...data.calculator,
        rows: updatedRows
      }
    });
  };

  // Add new calculator row
  const handleAddRow = () => {
    const newRow: CalcRow = {
      id: 'row_' + Date.now(),
      name: 'Новое объявление',
      views: 500,
      contacts: 5
    };
    onUpdateData({
      ...data,
      calculator: {
        ...data.calculator,
        rows: [...data.calculator.rows, newRow]
      }
    });
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    if (data.calculator.rows.length <= 1) return;
    onUpdateData({
      ...data,
      calculator: {
        ...data.calculator,
        rows: data.calculator.rows.filter(r => r.id !== id)
      }
    });
  };

  // Checklist check toggle
  const handleToggleCheck = (groupId: string, itemId: string) => {
    const updatedGroups = data.auditChecklist.groups.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        items: g.items.map(it => {
          if (it.id !== itemId) return it;
          return { ...it, checked: !it.checked };
        })
      };
    });
    onUpdateData({
      ...data,
      auditChecklist: {
        ...data.auditChecklist,
        groups: updatedGroups
      }
    });
  };

  // Checklist statistics
  const { totalCheckItems, checkedCount, auditScorePercent } = useMemo(() => {
    let total = 0;
    let checked = 0;
    data.auditChecklist.groups.forEach(g => {
      g.items.forEach(it => {
        total++;
        if (it.checked) checked++;
      });
    });
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    return {
      totalCheckItems: total,
      checkedCount: checked,
      auditScorePercent: percent
    };
  }, [data.auditChecklist.groups]);

  // Comprehensive Wordstat & Seasonality Analytics
  const wordstatStats = useMemo(() => {
    const months = data.seasonality.months || [];
    const queriesList = months.map(m => m.queries || 0);
    const hasQueries = queriesList.some(q => q > 0);
    const maxQueries = Math.max(...queriesList, 1);
    const minQueries = hasQueries ? Math.min(...queriesList.filter(q => q > 0)) : 0;
    const totalQueries = queriesList.reduce((a, b) => a + b, 0);
    const avgQueries = months.length > 0 ? Math.round(totalQueries / months.length) : 0;
    const maxPercent = Math.max(...months.map(m => m.percent), 15);

    let peakMonth = months[0]?.month || '';
    let peakQueries = months[0]?.queries || 0;
    let troughMonth = months[0]?.month || '';
    let troughQueries = months[0]?.queries || 0;

    months.forEach(m => {
      const q = m.queries || 0;
      if (q >= peakQueries) {
        peakQueries = q;
        peakMonth = m.month;
      }
      if (troughQueries === 0 || (q > 0 && q <= troughQueries)) {
        troughQueries = q;
        troughMonth = m.month;
      }
    });

    const multiplier = troughQueries > 0 
      ? (peakQueries / troughQueries).toFixed(2)
      : '1.0';

    return {
      hasQueries,
      maxQueries,
      minQueries: troughQueries,
      totalQueries,
      avgQueries,
      maxPercent,
      peakMonth,
      peakQueries,
      troughMonth,
      troughQueries,
      multiplier
    };
  }, [data.seasonality.months]);

  const maxMonthPercent = wordstatStats.maxPercent;

  return (
    <div className="report-content max-w-[1080px] mx-auto px-4 md:px-6 py-6 font-sans text-[#16181d] leading-relaxed">
      
      {/* Top Header */}
      <header className="pt-4 pb-2 border-b border-[#e3dfd6]/60 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[13px] tracking-[0.06em] uppercase font-semibold text-[#0f6e6a]">
              {data.kicker}
            </div>
            <button
              type="button"
              onClick={() => onOpenUnifiedModal?.('sheet')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e9f3f1] hover:bg-[#d4ebe6] text-[#0f6e6a] border border-[#0f6e6a]/25 transition-all cursor-pointer no-print"
              title="Нажмите, чтобы сменить регион / город во входных данных"
            >
              <MapPin className="w-3 h-3 text-[#0f6e6a]" />
              <span>{data.city || 'Сменить регион'}</span>
              <span className="text-[10px] text-[#0f6e6a]/70 underline ml-0.5">изменить</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick toggle: client has active account or new from scratch */}
            <button
              type="button"
              onClick={() => {
                const nextVal = data.hasExistingAccount === false ? true : false;
                onUpdateData({ 
                  ...data, 
                  hasExistingAccount: nextVal,
                  pricing: {
                    ...data.pricing,
                    sectionTitle: nextVal 
                      ? '6. Тарифы на маркетинг и продвижение на Авито' 
                      : '4. Тарифы на маркетинг и продвижение на Авито',
                    tiers: buildPricingTiers(nextVal)
                  }
                });
              }}
              className={`no-print inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                data.hasExistingAccount !== false
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title="Нажмите, чтобы переключить: есть действующий аккаунт у клиента или запуск с нуля"
            >
              <span className={`w-2 h-2 rounded-full ${data.hasExistingAccount !== false ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{data.hasExistingAccount !== false ? 'Аккаунт есть (аудит + калькулятор)' : 'Без аккаунта (запуск с нуля)'}</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e9f3f1] text-[#0f6e6a] border border-[#0f6e6a]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Формат Zollerz Niche · v2.0</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-[38px] font-bold tracking-tight text-[#16181d] mt-2 mb-3 leading-[1.18]">
          {data.title}
        </h1>
        <p className="text-base sm:text-lg text-[#2b2f36] max-w-[780px] leading-relaxed">
          {data.lead}
        </p>

        {/* Parsed Google Sheet / Search Source Callout */}
        {data.parsedSourceMeta && (
          <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-white border border-[#0f6e6a]/30 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#e3dfd6]/70">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs sm:text-[13px] font-bold text-[#0f6e6a]">
                  Основа отчёта: Парсинг поисковой выдачи Авито ({data.parsedSourceMeta.region} · «{data.parsedSourceMeta.keyword}»)
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#5d6470] bg-[#faf9f6] px-2 py-0.5 rounded border border-[#e3dfd6]">
                Google Sheet / CSV
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-[#faf9f6] p-2 rounded-lg border border-[#e3dfd6]/60">
                <span className="text-[11px] text-[#5d6470] block">Объявлений в выборке</span>
                <b className="text-sm sm:text-base font-extrabold text-[#16181d]">{data.parsedSourceMeta.totalAds} шт.</b>
              </div>
              <div className="bg-[#faf9f6] p-2 rounded-lg border border-[#e3dfd6]/60">
                <span className="text-[11px] text-[#5d6470] block">Ср. цена в регионе</span>
                <b className="text-sm sm:text-base font-extrabold text-[#0f6e6a]">{data.parsedSourceMeta.avgPrice.toLocaleString('ru-RU')} ₽</b>
              </div>
              <div className="bg-[#faf9f6] p-2 rounded-lg border border-[#e3dfd6]/60">
                <span className="text-[11px] text-[#5d6470] block">Платное продвижение</span>
                <b className="text-sm sm:text-base font-extrabold text-[#9a4b12]">{data.parsedSourceMeta.paidPromoPercent} %</b>
              </div>
              <div className="bg-[#faf9f6] p-2 rounded-lg border border-[#e3dfd6]/60">
                <span className="text-[11px] text-[#5d6470] block">Ср. рейтинг в ТОПе</span>
                <b className="text-sm sm:text-base font-extrabold text-[#16181d]">{data.parsedSourceMeta.avgRating} ⭐</b>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section: Photo + 7-Day Sprint Card */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 items-stretch mb-10">
        <figure className="m-0 bg-white border border-[#e3dfd6] rounded-2xl overflow-hidden shadow-xs flex flex-col group">
          <div className="relative overflow-hidden bg-stone-100 flex-1 min-h-[260px] sm:min-h-[340px]">
            <img 
              src={data.heroImage} 
              alt={data.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              onError={(e) => {
                // Fallback to sample photo if local path not resolved
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80';
              }}
            />

            {/* Quick Action Overlay to provide / change hero photo */}
            <div className="absolute top-3 right-3 z-10 no-print flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenUnifiedModal?.('photo')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md text-white text-xs font-semibold shadow-md transition-all border border-white/20 cursor-pointer"
                title="Сменить образец главного фото или изменить подпись"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Образец фото</span>
              </button>
            </div>
          </div>

          <figcaption className="text-xs sm:text-[13px] text-[#5d6470] p-3.5 bg-white border-t border-[#e3dfd6]/60 leading-snug">
            {isEditMode ? (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[#0f6e6a] block">Редактирование подписи:</span>
                <textarea
                  rows={2}
                  value={data.heroCaption}
                  onChange={(e) => onUpdateData({ ...data, heroCaption: e.target.value })}
                  className="w-full text-xs p-2 border border-[#e3dfd6] rounded-lg bg-[#faf9f6] focus:bg-white focus:outline-[#0f6e6a]"
                />
              </div>
            ) : (
              data.heroCaption
            )}
          </figcaption>
        </figure>

        <div className="bg-white border border-[#e3dfd6] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e3dfd6]/70">
              <h3 className="text-lg font-bold text-[#16181d] m-0">
                {data.sprint.title}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#0f6e6a]/10 text-[#0f6e6a]">
                Срок: 7 дней
              </span>
            </div>

            <ol className="list-decimal pl-5 space-y-2.5 text-sm sm:text-[15px] text-[#2b2f36] marker:font-bold marker:text-[#0f6e6a]">
              {data.sprint.items.map((item, idx) => (
                <li key={idx} className="leading-snug">
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 pt-3.5 border-t border-dashed border-[#e3dfd6]">
            <p className="text-xs sm:text-[13px] text-[#5d6470] m-0 italic bg-[#faf9f6] p-3 rounded-lg border border-[#e3dfd6]/60">
              {data.sprint.note}
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODULE: СВОДНЫЕ ДАННЫЕ ВЫДАЧИ (ПРОСМОТРЫ И ПЛАТНЫЕ СЕРВИСЫ)
          Расположен строго перед разделом 1. "Где теряются звонки"
         ========================================================================= */}
      <section className="mb-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0f6e6a] bg-[#0f6e6a]/10 px-2 py-0.5 rounded inline-block">
              Сводная аналитика поисковой выдачи · {data.city}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] mt-1.5 mb-1">
              {viewsSummary.sectionTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5d6470] bg-white border border-[#e3dfd6] px-2.5 py-1 rounded-md shadow-2xs">
              Выборка: {viewsSummary.totalAds} объявлений
            </span>
          </div>
        </div>

        <p className="text-sm sm:text-[15px] text-[#5d6470] mb-5">
          {viewsSummary.subtitle || `Сводная статистика поисковой выдачи Авито: сравнение охватов органических карточек и эффективности платных пакетов продвижения по региону ${data.city}.`}
        </p>

        {/* 5 Key Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {/* Card 1: Просмотров в среднем */}
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-[#0f6e6a]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#5d6470] mb-1">
              <span className="font-semibold text-[#16181d]">Просмотров сегодня (ср.)</span>
              <Eye className="w-3.5 h-3.5 text-[#0f6e6a]" />
            </div>
            {isEditMode ? (
              <input
                type="number"
                step="0.01"
                value={viewsSummary.avgViews}
                onChange={(e) => handleUpdateViewsSummary('avgViews', parseFloat(e.target.value) || 0)}
                className="text-xl font-extrabold text-[#16181d] border border-[#e3dfd6] rounded px-1.5 py-0.5 bg-[#faf9f6]"
              />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-[#16181d] tracking-tight">
                {viewsSummary.avgViews}
              </div>
            )}
            <div className="text-[11px] text-[#5d6470] mt-1.5 flex items-center justify-between">
              <span>по всей выборке</span>
              <span className="text-[10px] font-semibold text-[#0f6e6a] bg-[#0f6e6a]/10 px-1.5 py-0.2 rounded">{viewsSummary.totalAds} объявл.</span>
            </div>
          </div>

          {/* Card 2: С платными сервисами */}
          <div className="bg-white border border-[#0f6e6a]/40 rounded-xl p-3.5 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white to-[#0f6e6a]/5 hover:border-[#0f6e6a] transition-colors">
            <div className="flex items-center justify-between text-xs text-[#0f6e6a] font-semibold mb-1">
              <span>С платными (сегодня)</span>
              <Zap className="w-3.5 h-3.5 text-[#0f6e6a]" />
            </div>
            {isEditMode ? (
              <input
                type="number"
                step="0.01"
                value={viewsSummary.avgViewsWithPaid}
                onChange={(e) => handleUpdateViewsSummary('avgViewsWithPaid', parseFloat(e.target.value) || 0)}
                className="text-xl font-extrabold text-[#0f6e6a] border border-[#e3dfd6] rounded px-1.5 py-0.5 bg-[#faf9f6]"
              />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f6e6a] tracking-tight">
                {viewsSummary.avgViewsWithPaid}
              </div>
            )}
            <div className="text-[11px] text-[#5d6470] mt-1.5 flex items-center justify-between">
              <span>в среднем на бусте</span>
              <span className="text-[10px] font-bold text-[#0f6e6a] bg-[#0f6e6a]/15 px-1.5 py-0.2 rounded">
                {viewsSummary.adsWithPaid} объявл. ({viewsSummary.totalAds > 0 ? Math.round((viewsSummary.adsWithPaid / viewsSummary.totalAds) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* Card 3: Без платных сервисов */}
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-[#0f6e6a]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#5d6470] mb-1">
              <span className="font-semibold text-[#16181d]">Без платных (сегодня)</span>
              <BarChart3 className="w-3.5 h-3.5 text-stone-500" />
            </div>
            {isEditMode ? (
              <input
                type="number"
                step="0.01"
                value={viewsSummary.avgViewsWithoutPaid}
                onChange={(e) => handleUpdateViewsSummary('avgViewsWithoutPaid', parseFloat(e.target.value) || 0)}
                className="text-xl font-extrabold text-[#16181d] border border-[#e3dfd6] rounded px-1.5 py-0.5 bg-[#faf9f6]"
              />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-[#16181d] tracking-tight">
                {viewsSummary.avgViewsWithoutPaid}
              </div>
            )}
            <div className="text-[11px] text-[#5d6470] mt-1.5 flex items-center justify-between">
              <span>органика (за сегодня)</span>
              <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded">
                {viewsSummary.adsWithoutPaid} объявл. ({viewsSummary.totalAds > 0 ? Math.round((viewsSummary.adsWithoutPaid / viewsSummary.totalAds) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* Card 4: Min / Max Views */}
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-[#0f6e6a]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#5d6470] mb-1">
              <span className="font-semibold text-[#16181d]">Сегодня (Мин — Макс)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#16181d] tracking-tight">
              {viewsSummary.minViews} <span className="text-stone-300 font-light">/</span> {viewsSummary.maxViews}
            </div>
            <div className="text-[11px] text-[#5d6470] mt-1.5 flex items-center justify-between">
              <span>мин: {viewsSummary.minViews}</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50">макс: {viewsSummary.maxViews}</span>
            </div>
          </div>

          {/* Card 5: Total Ads breakdown */}
          <div className="col-span-2 lg:col-span-1 bg-white border border-[#e3dfd6] rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-[#0f6e6a]/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-[#5d6470] mb-1">
              <span className="font-medium">Всего объявлений</span>
              <Layers className="w-3.5 h-3.5 text-[#0f6e6a]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#16181d] tracking-tight">
              {viewsSummary.totalAds}
            </div>
            <div className="text-[11px] text-[#5d6470] mt-1.5 flex items-center justify-between">
              <span className="text-[#0f6e6a] font-semibold">{viewsSummary.adsWithPaid} платных</span>
              <span className="text-stone-500">{viewsSummary.adsWithoutPaid} бесплатных</span>
            </div>
          </div>
        </div>

        {/* Breakdown Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Card A: Paid vs Organic Ratio Bar & Stats */}
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#16181d] m-0 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0f6e6a]"></span>
                Количество объявлений: Платные vs Бесплатные
              </h3>
              <span className="text-xs font-bold text-[#0f6e6a] bg-[#0f6e6a]/10 px-2 py-0.5 rounded">
                {Math.round((viewsSummary.adsWithPaid / viewsSummary.totalAds) * 100)}% используют услуги
              </span>
            </div>

            {/* Split Visual Bar */}
            <div className="h-6 w-full bg-stone-100 rounded-lg overflow-hidden flex mb-3.5 p-0.5 border border-[#e3dfd6]">
              <div 
                style={{ width: `${(viewsSummary.adsWithPaid / viewsSummary.totalAds) * 100}%` }}
                className="bg-[#0f6e6a] h-full rounded-l-md flex items-center justify-center text-[11px] text-white font-bold transition-all shadow-inner"
                title={`Объявления с платными сервисами: ${viewsSummary.adsWithPaid} (${Math.round((viewsSummary.adsWithPaid / viewsSummary.totalAds) * 100)}%)`}
              >
                Платные: {viewsSummary.adsWithPaid} шт ({Math.round((viewsSummary.adsWithPaid / viewsSummary.totalAds) * 100)}%)
              </div>
              <div 
                style={{ width: `${(viewsSummary.adsWithoutPaid / viewsSummary.totalAds) * 100}%` }}
                className="bg-stone-300 hover:bg-stone-300/90 h-full rounded-r-md flex items-center justify-center text-[11px] text-stone-800 font-semibold transition-all"
                title={`Объявления без платных сервисов: ${viewsSummary.adsWithoutPaid} (${Math.round((viewsSummary.adsWithoutPaid / viewsSummary.totalAds) * 100)}%)`}
              >
                Без сервисов: {viewsSummary.adsWithoutPaid} шт ({Math.round((viewsSummary.adsWithoutPaid / viewsSummary.totalAds) * 100)}%)
              </div>
            </div>

            {/* Detailed Row Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#e9f3f1] p-3 rounded-lg border border-[#0f6e6a]/25">
                <div className="text-[#0f6e6a] font-bold mb-0.5">Объявлений с платными сервисами</div>
                <div className="text-xl font-extrabold text-[#0f6e6a]">
                  {viewsSummary.adsWithPaid} <span className="text-xs font-normal text-[#5d6470]">из {viewsSummary.totalAds}</span>
                </div>
                <div className="text-[11px] text-[#5d6470] mt-1.5 pt-1.5 border-t border-[#0f6e6a]/20 flex justify-between">
                  <span>Просмотров в ср.:</span>
                  <b className="text-[#0f6e6a]">{viewsSummary.avgViewsWithPaid}</b>
                </div>
              </div>

              <div className="bg-[#faf9f6] p-3 rounded-lg border border-[#e3dfd6]">
                <div className="text-[#5d6470] font-bold mb-0.5">Объявлений без платных сервисов</div>
                <div className="text-xl font-extrabold text-[#16181d]">
                  {viewsSummary.adsWithoutPaid} <span className="text-xs font-normal text-[#5d6470]">из {viewsSummary.totalAds}</span>
                </div>
                <div className="text-[11px] text-[#5d6470] mt-1.5 pt-1.5 border-t border-[#e3dfd6] flex justify-between">
                  <span>Просмотров в ср.:</span>
                  <b className="text-[#16181d]">{viewsSummary.avgViewsWithoutPaid}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Paid Services Breakdown (XL, Выделено, Продвинуто, Значки) */}
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#16181d] m-0 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Платные сервисы (распределение подключений)
                </h3>
                <span className="text-[11px] font-semibold text-[#5d6470] bg-[#faf9f6] px-2 py-0.5 rounded border border-[#e3dfd6]">
                  Всего: {viewsSummary.paidServices.reduce((a, b) => a + b.count, 0)} подключений
                </span>
              </div>

              {/* Paid Services Badges List */}
              <div className="space-y-1.5">
                {viewsSummary.paidServices.map((ps) => (
                  <div 
                    key={ps.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#faf9f6] hover:bg-[#f3f0e8] border border-[#e3dfd6]/70 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        ps.name.includes('XL') ? 'bg-indigo-600' :
                        ps.name.includes('Выделено') ? 'bg-amber-500' :
                        ps.name.includes('Значки') ? 'bg-emerald-500' : 'bg-[#0f6e6a]'
                      }`}></span>
                      <span className="font-semibold text-[#16181d]">{ps.name}</span>
                      {ps.badge && (
                        <span className="text-[10px] text-[#5d6470] bg-white px-1.5 py-0.2 rounded border border-[#e3dfd6]">
                          {ps.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isEditMode ? (
                        <input 
                          type="number"
                          min="0"
                          value={ps.count}
                          onChange={(e) => handleUpdatePaidServiceCount(ps.id, parseInt(e.target.value, 10) || 0)}
                          className="w-14 text-right font-bold text-[#0f6e6a] border border-[#e3dfd6] rounded px-1 py-0.5 bg-white text-xs"
                        />
                      ) : (
                        <span className="font-extrabold text-sm text-[#0f6e6a] bg-white px-2 py-0.5 rounded border border-[#e3dfd6] min-w-[28px] text-center">
                          {ps.count}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-dashed border-[#e3dfd6] flex items-center justify-between text-[11px] text-[#5d6470]">
              <span>Формат XL: <b>9</b> · Продвинуто: <b>20</b> (7+6+4+3)</span>
              <span>Выделено: <b>4</b> · Значки: <b>2</b></span>
            </div>
          </div>
        </div>

        {/* Analytical Insight Box */}
        <div className="bg-[#e9f3f1] border-l-4 border-[#0f6e6a] p-3.5 sm:p-4 rounded-r-xl text-xs sm:text-[13px] text-[#2b2f36] leading-relaxed">
          <div className="font-bold text-[#0f6e6a] mb-1 flex items-center gap-1.5 text-xs sm:text-[13px]">
            <Sparkles className="w-4 h-4 text-[#0f6e6a] shrink-0" />
            <span>Аналитический вывод авитолога: почему среднее без платных услуг (137.2) выше, чем с платными (25.75)?</span>
          </div>
          <p className="m-0 text-[#2b2f36]">
            {viewsSummary.conclusionNote || `У карточек без платных сервисов среднее (137.2) выше, чем с платными (25.75), так как бесплатные объявления висят в выдаче долго и накапливают просмотры за месяцы (вплоть до максимальных 816 просмотров). Платные сервисы (XL, Продвинуто) конкуренты включают на свежие карточки для быстрого старта, где просмотры еще не успели аккумулироваться, но они дают моментальные целевые звонки. Без платного продвижения новое объявление будет догонять органических лидеров месяцами.`}
          </p>
        </div>
      </section>

      {/* SECTION 1: Conversion Calculator (Only if client has active Avito account) */}
      {data.hasExistingAccount !== false && (
        <section className="mb-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] m-0">
              {data.calculator.sectionTitle}
            </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#5d6470]">
              Интерактивный расчет конверсий
            </span>
          </div>
        </div>
        
        <p className="text-sm sm:text-[15px] text-[#5d6470] mb-4">
          {data.calculator.intro}
        </p>

        {/* Calculator Stats Quick Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 text-center">
            <span className="text-xs text-[#5d6470] block">Всего просмотров</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#16181d]">{totalViews.toLocaleString('ru-RU')}</span>
          </div>
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 text-center">
            <span className="text-xs text-[#5d6470] block">Всего контактов</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#0f6e6a]">{totalContacts.toLocaleString('ru-RU')}</span>
          </div>
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 text-center">
            <span className="text-xs text-[#5d6470] block">Средняя конверсия</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#0f6e6a]">{avgCr} %</span>
          </div>
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 text-center">
            <span className="text-xs text-[#5d6470] block">Объявлений к доработке</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#b3261e]">
              {calculatedRows.filter(r => r.isBad).length}
            </span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch border border-[#e3dfd6] rounded-xl bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-sm sm:text-[15px]">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e3dfd6] text-xs sm:text-[13px] font-semibold text-[#5d6470]">
                <th className="py-2.5 px-3.5 sm:px-4">Объявление</th>
                <th className="py-2.5 px-3 sm:px-4 w-[110px] sm:w-[130px]">Просмотры</th>
                <th className="py-2.5 px-3 sm:px-4 w-[110px] sm:w-[130px]">Контакты</th>
                <th className="py-2.5 px-3 sm:px-4 w-[100px] text-right sm:text-left">Конверсия</th>
                <th className="py-2.5 px-3 sm:px-4 w-[140px] text-center">Вывод</th>
                {isEditMode && <th className="py-2.5 px-2 w-[40px]"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3dfd6]">
              {calculatedRows.map((r) => (
                <tr key={r.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="py-2.5 px-3.5 sm:px-4 font-medium text-[#16181d]">
                    {isEditMode ? (
                      <input 
                        type="text" 
                        value={r.name} 
                        onChange={(e) => handleRowChange(r.id, 'name', e.target.value)}
                        className="w-full text-sm font-medium border border-[#e3dfd6] rounded px-2 py-1 bg-white focus:outline-[#0f6e6a]"
                      />
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="py-2 px-3 sm:px-4">
                    <input 
                      type="number" 
                      min="0"
                      value={r.views}
                      onChange={(e) => handleRowChange(r.id, 'views', e.target.value)}
                      className="w-full max-w-[100px] text-sm border border-[#e3dfd6] rounded-md px-2.5 py-1.5 bg-[#faf9f6] hover:bg-white focus:bg-white focus:outline-[#0f6e6a] focus:ring-1 focus:ring-[#0f6e6a]"
                    />
                  </td>
                  <td className="py-2 px-3 sm:px-4">
                    <input 
                      type="number" 
                      min="0"
                      value={r.contacts}
                      onChange={(e) => handleRowChange(r.id, 'contacts', e.target.value)}
                      className="w-full max-w-[100px] text-sm border border-[#e3dfd6] rounded-md px-2.5 py-1.5 bg-[#faf9f6] hover:bg-white focus:bg-white focus:outline-[#0f6e6a] focus:ring-1 focus:ring-[#0f6e6a]"
                    />
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 text-right sm:text-left font-mono font-medium text-xs sm:text-sm text-[#16181d]">
                    {r.crPercent} %
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 text-center">
                    {r.isBad ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#b3261e] bg-red-50 border border-red-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Править первым
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6e6a] bg-[#e9f3f1] border border-[#0f6e6a]/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Позже
                      </span>
                    )}
                  </td>
                  {isEditMode && (
                    <td className="py-2 px-2 text-center">
                      <button 
                        onClick={() => handleRemoveRow(r.id)} 
                        title="Удалить строку"
                        className="text-stone-400 hover:text-red-600 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {/* Account Average Summary Row */}
              <tr className="bg-[#faf9f6] font-semibold text-[#16181d] border-t-2 border-[#e3dfd6]">
                <td className="py-3 px-3.5 sm:px-4">
                  <b>Среднее по аккаунту</b>
                </td>
                <td className="py-3 px-3 sm:px-4 font-mono font-bold">
                  {totalViews.toLocaleString('ru-RU')}
                </td>
                <td className="py-3 px-3 sm:px-4 font-mono font-bold text-[#0f6e6a]">
                  {totalContacts.toLocaleString('ru-RU')}
                </td>
                <td className="py-3 px-3 sm:px-4 font-mono font-bold text-[#0f6e6a] text-right sm:text-left">
                  {avgCr} %
                </td>
                <td className="py-3 px-3 sm:px-4 text-center text-xs text-[#5d6470]">
                  Базовый эталон
                </td>
                {isEditMode && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
          <p className="text-xs sm:text-[13px] text-[#5d6470] m-0">
            {data.calculator.note}
          </p>
          {isEditMode && (
            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0f6e6a] text-white hover:bg-[#0c5956] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Добавить объявление
            </button>
          )}
        </div>
      </section>
      )}

      {/* SECTION 2: Audit Checklist (Only if client has active Avito account) */}
      {data.hasExistingAccount !== false && (
      <section className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] m-0">
            {getSectionTitle(data.auditChecklist.sectionTitle, 2)}
          </h2>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5d6470]">Статус готовности:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e9f3f1] text-[#0f6e6a] border border-[#0f6e6a]/20">
              {checkedCount} из {totalCheckItems} ({auditScorePercent}%)
            </span>
          </div>
        </div>

        <p className="text-sm sm:text-[15px] text-[#5d6470] mb-4">
          Проверьте готовность по 4 ключевым кластерам. Кликните по пункту, чтобы отметить выполненные требования.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.auditChecklist.groups.map((group) => {
            const groupChecked = group.items.filter(it => it.checked).length;
            return (
              <div 
                key={group.id} 
                className="bg-white border border-[#e3dfd6] rounded-2xl p-4 sm:p-5 shadow-xs"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e3dfd6]/60">
                  <h3 className="text-base sm:text-[17px] font-bold text-[#16181d] m-0">
                    {group.title}
                  </h3>
                  <span className="text-xs font-medium text-[#5d6470]">
                    {groupChecked}/{group.items.length}
                  </span>
                </div>

                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li 
                      key={item.id}
                      onClick={() => handleToggleCheck(group.id, item.id)}
                      className={`group flex items-start gap-2.5 py-2 px-2 rounded-lg cursor-pointer transition-colors border-b border-dashed border-[#e3dfd6]/60 last:border-b-0 ${
                        item.checked ? 'bg-emerald-50/30' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-colors shrink-0 ${
                        item.checked ? 'bg-[#0f6e6a] border-[#0f6e6a] text-white' : 'border-[#0f6e6a] group-hover:border-[#0c5956]'
                      }`}>
                        {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={`text-xs sm:text-[13.5px] leading-snug select-none ${
                        item.checked ? 'text-[#16181d] font-medium' : 'text-[#4a505b]'
                      }`}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* SECTION 3: 3 Sample Ads */}
      <section className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] m-0">
            {getSectionTitle(data.sampleAds.sectionTitle, 3)}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#5d6470] mb-5">
          {data.sampleAds.subtitle}
        </p>

        <div className="space-y-5">
          {data.sampleAds.ads.map((ad, idx) => (
            <div 
              key={ad.id} 
              className="bg-white border border-[#e3dfd6] rounded-2xl p-4 sm:p-6 shadow-xs relative"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#e9f3f1] text-[#0f6e6a]">
                  {ad.tag}
                </span>

                <button
                  onClick={() => handleCopyAd(ad.id, `${ad.title}\n\n${ad.price}\n\n${ad.body}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#e3dfd6] bg-[#faf9f6] text-[#16181d] hover:bg-[#e9f3f1] hover:text-[#0f6e6a] hover:border-[#0f6e6a]/40 transition-colors shadow-2xs"
                >
                  {copiedAdId === ad.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Текст скопирован!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#5d6470]" />
                      <span>Скопировать объявление</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-lg sm:text-xl font-bold text-[#16181d] mt-1 mb-1.5">
                {ad.title}
              </div>
              <div className="text-sm sm:text-base font-bold text-[#0f6e6a] mb-3">
                {ad.price}
              </div>

              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-[14px] text-[#24272c] bg-[#faf9f6] border border-[#e3dfd6] rounded-xl p-3.5 sm:p-4 leading-relaxed overflow-x-auto selection:bg-[#0f6e6a]/20">
                {ad.body}
              </pre>

              {/* "Why" Block */}
              <div className="mt-3 text-xs sm:text-[13.5px] text-[#5d6470] bg-[#e9f3f1]/40 border-l-3 border-[#0f6e6a] p-3 rounded-r-lg leading-relaxed">
                <span className="font-semibold text-[#0f6e6a]">Маркетинговая логика: </span>
                {ad.why}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: Seasonality & Budget Distribution with Yandex Wordstat */}
      <section className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0f6e6a] bg-[#0f6e6a]/10 px-2 py-0.5 rounded inline-block">
                Яндекс Вордстат · Сезонность спроса
              </span>
              {data.seasonality.wordstatKeyword && (
                <span className="text-[11px] font-medium text-[#5d6470] bg-white border border-[#e3dfd6] px-2 py-0.5 rounded-full">
                  Запрос: «{data.seasonality.wordstatKeyword}»
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] m-0">
              {getSectionTitle(data.seasonality.sectionTitle, 4)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Button to open Wordstat input in Unified modal */}
            {onOpenUnifiedModal && (
              <button
                type="button"
                onClick={() => onOpenUnifiedModal('wordstat')}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#0f6e6a] text-white hover:bg-[#0c5956] shadow-2xs transition-all cursor-pointer"
                title="Настроить данные Яндекс Вордстат и рекламный бюджет"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Настроить Вордстат</span>
              </button>
            )}

            {/* View switcher */}
            <div className="inline-flex items-center bg-white border border-[#e3dfd6] rounded-xl p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setSeasonViewMode('chart')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  seasonViewMode === 'chart'
                    ? 'bg-[#0f6e6a] text-white'
                    : 'text-[#5d6470] hover:text-[#16181d]'
                }`}
                title="График спроса и бюджета"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">График</span>
              </button>

              <button
                type="button"
                onClick={() => setSeasonViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  seasonViewMode === 'cards'
                    ? 'bg-[#0f6e6a] text-white'
                    : 'text-[#5d6470] hover:text-[#16181d]'
                }`}
                title="Карточки месяцев"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Сетка</span>
              </button>

              <button
                type="button"
                onClick={() => setSeasonViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  seasonViewMode === 'table'
                    ? 'bg-[#0f6e6a] text-white'
                    : 'text-[#5d6470] hover:text-[#16181d]'
                }`}
                title="Таблица"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Таблица</span>
              </button>
            </div>

            {/* Currency / percent toggle */}
            <button 
              onClick={() => setShowBudgetRubles(!showBudgetRubles)}
              className="text-xs font-semibold text-[#0f6e6a] bg-white border border-[#e3dfd6] hover:bg-[#faf9f6] px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              {showBudgetRubles ? 'В процентах (%)' : 'В рублях (₽)'}
            </button>
          </div>
        </div>

        <p className="text-sm sm:text-[15px] text-[#5d6470] mb-4">
          {data.seasonality.intro}
        </p>

        {/* Wordstat Analysis Summary Cards Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-medium text-[#5d6470] block">Суммарный спрос</span>
            <b className="text-base sm:text-lg font-bold text-[#16181d]">
              {wordstatStats.totalQueries.toLocaleString('ru-RU')}
            </b>
            <span className="text-[10px] text-[#5d6470] block mt-0.5">
              за {data.seasonality.months.length} мес.
            </span>
          </div>

          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-medium text-[#5d6470] block">Среднемесячный</span>
            <b className="text-base sm:text-lg font-bold text-[#16181d]">
              {wordstatStats.avgQueries.toLocaleString('ru-RU')}
            </b>
            <span className="text-[10px] text-[#5d6470] block mt-0.5">
              запросов / мес
            </span>
          </div>

          <div className="bg-white border border-[#0f6e6a]/40 bg-gradient-to-br from-white to-emerald-50/50 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-[#0f6e6a] block">Пик спроса</span>
            <b className="text-base sm:text-lg font-bold text-[#0f6e6a]">
              {wordstatStats.peakQueries.toLocaleString('ru-RU')}
            </b>
            <span className="text-[10px] text-[#0f6e6a] block mt-0.5 truncate font-medium">
              {wordstatStats.peakMonth}
            </span>
          </div>

          <div className="bg-white border border-amber-200 bg-gradient-to-br from-white to-amber-50/40 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-800 block">Минимум спроса</span>
            <b className="text-base sm:text-lg font-bold text-amber-900">
              {wordstatStats.troughQueries.toLocaleString('ru-RU')}
            </b>
            <span className="text-[10px] text-amber-700 block mt-0.5 truncate font-medium">
              {wordstatStats.troughMonth}
            </span>
          </div>

          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-medium text-[#5d6470] block">Размах сезона</span>
            <b className="text-base sm:text-lg font-bold text-[#16181d]">
              {wordstatStats.multiplier}x
            </b>
            <span className="text-[10px] text-[#5d6470] block mt-0.5">
              отношение пик / спад
            </span>
          </div>

          {/* Annual Budget Editor */}
          <div className="bg-white border border-[#e3dfd6] rounded-xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-[#16181d] block">Годовой бюджет</span>
            <div className="flex items-center gap-1 mt-0.5">
              <input 
                type="number"
                step="10000"
                min="10000"
                value={data.seasonality.annualBudgetRub}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                  const updatedMonths = data.seasonality.months.map(m => ({
                    ...m,
                    budgetRub: Math.round((val * m.percent) / 100)
                  }));
                  onUpdateData({
                    ...data,
                    seasonality: {
                      ...data.seasonality,
                      annualBudgetRub: val,
                      months: updatedMonths
                    }
                  });
                }}
                className="w-full text-sm font-mono font-bold text-[#0f6e6a] border border-[#e3dfd6] rounded px-1.5 py-0.5 bg-[#faf9f6] focus:bg-white focus:outline-none"
              />
              <span className="text-xs font-bold text-[#16181d]">₽</span>
            </div>
            <span className="text-[10px] text-[#5d6470] block mt-1">автопересчёт</span>
          </div>
        </div>

        {/* VIEW 1: COMBINED INTERACTIVE SVG GRAPH */}
        {seasonViewMode === 'chart' && (
          <div className="bg-white border border-[#e3dfd6] rounded-2xl p-4 sm:p-5 shadow-xs mb-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#0f6e6a]"></span>
                  <span className="text-xs font-semibold text-[#16181d]">Спрос (Яндекс Вордстат, запр.)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-semibold text-[#5d6470]">Рекомендуемый бюджет (₽)</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-stone-400"></span>
                  <span className="text-[11px] text-[#5d6470]">Среднее: {wordstatStats.avgQueries}</span>
                </div>
              </div>

              <div className="text-xs text-[#5d6470]">
                Наведите курсор на точку графика для просмотра деталей
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="relative w-full overflow-x-auto">
              <svg 
                viewBox="0 0 1000 270" 
                className="w-full h-auto min-w-[700px] select-none overflow-visible"
              >
                <defs>
                  {/* Wordstat Area Gradient */}
                  <linearGradient id="wordstatCurveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f6e6a" stopOpacity="0.32" />
                    <stop offset="60%" stopColor="#0f6e6a" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#0f6e6a" stopOpacity="0.01" />
                  </linearGradient>

                  <linearGradient id="budgetBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <line x1="55" y1="35" x2="960" y2="35" stroke="#e3dfd6" strokeDasharray="3 3" />
                <line x1="55" y1="85" x2="960" y2="85" stroke="#e3dfd6" strokeDasharray="3 3" />
                <line x1="55" y1="135" x2="960" y2="135" stroke="#e3dfd6" strokeDasharray="3 3" />
                <line x1="55" y1="185" x2="960" y2="185" stroke="#e3dfd6" strokeDasharray="3 3" />
                <line x1="55" y1="225" x2="960" y2="225" stroke="#d5d0c4" strokeWidth="1.5" />

                {/* Average Queries Dashed Line */}
                {(() => {
                  const maxQ = wordstatStats.maxQueries * 1.08;
                  const avgY = 225 - (wordstatStats.avgQueries / maxQ) * 190;
                  return (
                    <g>
                      <line 
                        x1="55" 
                        y1={avgY} 
                        x2="960" 
                        y2={avgY} 
                        stroke="#0f6e6a" 
                        strokeDasharray="4 4" 
                        strokeWidth="1.5"
                        strokeOpacity="0.6"
                      />
                      <text x="965" y={avgY + 4} fill="#0f6e6a" fontSize="10" fontWeight="600">
                        Ср. {wordstatStats.avgQueries}
                      </text>
                    </g>
                  );
                })()}

                {/* Y-axis Labels */}
                <text x="50" y="38" textAnchor="end" fill="#88909c" fontSize="10" fontFamily="monospace">
                  {Math.round(wordstatStats.maxQueries * 1.05).toLocaleString('ru-RU')}
                </text>
                <text x="50" y="138" textAnchor="end" fill="#88909c" fontSize="10" fontFamily="monospace">
                  {Math.round(wordstatStats.maxQueries * 0.5).toLocaleString('ru-RU')}
                </text>
                <text x="50" y="228" textAnchor="end" fill="#88909c" fontSize="10" fontFamily="monospace">
                  0
                </text>

                {/* Calculate points for curves and bars */}
                {(() => {
                  const months = data.seasonality.months;
                  const n = months.length;
                  if (n === 0) return null;

                  const chartLeft = 70;
                  const chartRight = 940;
                  const chartWidth = chartRight - chartLeft;
                  const step = n > 1 ? chartWidth / (n - 1) : 0;
                  const maxQ = wordstatStats.maxQueries * 1.08;

                  const points = months.map((m, idx) => {
                    const x = chartLeft + idx * step;
                    const q = m.queries || (m.percent * 100);
                    const y = 225 - (q / maxQ) * 190;
                    return { x, y, q, m, idx };
                  });

                  // Area Path (Close to bottom at y=225)
                  const areaD = `M ${points[0].x} 225 ` + 
                    points.map(p => `L ${p.x} ${p.y}`).join(' ') + 
                    ` L ${points[points.length - 1].x} 225 Z`;

                  // Line Path
                  const lineD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <g>
                      {/* Budget Mini Bars Background Indicators */}
                      {points.map((p) => {
                        const barHeight = Math.max(6, (p.m.percent / maxMonthPercent) * 70);
                        const isHovered = hoveredMonthIdx === p.idx;
                        return (
                          <rect
                            key={`bar-${p.idx}`}
                            x={p.x - 12}
                            y={225 - barHeight}
                            width={24}
                            height={barHeight}
                            fill={isHovered ? '#0f6e6a' : 'url(#budgetBarGrad)'}
                            rx={3}
                            opacity={isHovered ? 0.35 : 0.85}
                            className="transition-all duration-200"
                          />
                        );
                      })}

                      {/* Area Fill */}
                      <path d={areaD} fill="url(#wordstatCurveGradient)" />

                      {/* Line Stroke */}
                      <path 
                        d={lineD} 
                        fill="none" 
                        stroke="#0f6e6a" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />

                      {/* Interactive Data Points */}
                      {points.map((p) => {
                        const isHovered = hoveredMonthIdx === p.idx;
                        const isPeak = p.m.queries === wordstatStats.peakQueries;
                        const isTrough = p.m.queries === wordstatStats.troughQueries;

                        return (
                          <g 
                            key={`pt-${p.idx}`} 
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredMonthIdx(p.idx)}
                            onMouseLeave={() => setHoveredMonthIdx(null)}
                          >
                            {/* Hover hit area */}
                            <circle cx={p.x} cy={p.y} r={18} fill="transparent" />

                            {/* Outer glow on peak or hover */}
                            {(isHovered || isPeak) && (
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r={isHovered ? 11 : 8} 
                                fill={isPeak ? '#0f6e6a' : '#0f6e6a'} 
                                opacity="0.25" 
                              />
                            )}

                            {/* Main Point */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isHovered ? 7 : (isPeak || isTrough ? 6 : 5)}
                              fill={isHovered ? '#0c5956' : '#ffffff'}
                              stroke="#0f6e6a"
                              strokeWidth={isHovered ? 3.5 : 2.5}
                              className="transition-all duration-150"
                            />

                            {/* Query count label on top of point */}
                            <text
                              x={p.x}
                              y={p.y - 10}
                              textAnchor="middle"
                              fill={isPeak ? '#0f6e6a' : (isHovered ? '#16181d' : '#4a505b')}
                              fontSize={isHovered || isPeak ? '11' : '10'}
                              fontWeight={isHovered || isPeak ? '700' : '600'}
                              fontFamily="monospace"
                            >
                              {p.q.toLocaleString('ru-RU')}
                            </text>

                            {/* X-axis Month Label */}
                            <text
                              x={p.x}
                              y={242}
                              textAnchor="middle"
                              fill={isHovered ? '#0f6e6a' : '#16181d'}
                              fontSize="11"
                              fontWeight={isHovered ? '700' : '600'}
                            >
                              {p.m.shortMonth || p.m.month}
                            </text>

                            {/* Budget Subtext */}
                            <text
                              x={p.x}
                              y={258}
                              textAnchor="middle"
                              fill={isHovered ? '#0f6e6a' : '#88909c'}
                              fontSize="9.5"
                              fontFamily="monospace"
                            >
                              {showBudgetRubles 
                                ? `${Math.round(((p.m.budgetRub || ((data.seasonality.annualBudgetRub * p.m.percent) / 100)) / 1000))}k ₽` 
                                : `${p.m.percent}%`}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Floating Tooltip Box when month is hovered */}
            {hoveredMonthIdx !== null && data.seasonality.months[hoveredMonthIdx] && (
              <div className="mt-3 p-3 bg-[#faf9f6] border border-[#0f6e6a]/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0f6e6a]"></div>
                  <b className="text-[#16181d] text-sm">
                    {data.seasonality.months[hoveredMonthIdx].month}
                  </b>
                  {data.seasonality.months[hoveredMonthIdx].seasonLevel === 'high' ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      🔥 Высокий сезон (Пик)
                    </span>
                  ) : data.seasonality.months[hoveredMonthIdx].seasonLevel === 'low' ? (
                    <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ❄️ Спад спроса
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ⚖️ Стандартный сезон
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>
                    Спрос Вордстат: <b className="text-[#16181d]">{data.seasonality.months[hoveredMonthIdx].queries?.toLocaleString('ru-RU')} запр.</b>
                  </span>
                  {data.seasonality.months[hoveredMonthIdx].share && (
                    <span>
                      Доля: <b className="text-[#5d6470]">{data.seasonality.months[hoveredMonthIdx].share?.toFixed(6)}</b>
                    </span>
                  )}
                  <span>
                    Доля бюджета: <b className="text-[#0f6e6a]">{data.seasonality.months[hoveredMonthIdx].percent}%</b>
                  </span>
                  <span>
                    Бюджет: <b className="text-[#0f6e6a]">
                      {(data.seasonality.months[hoveredMonthIdx].budgetRub || Math.round((data.seasonality.annualBudgetRub * data.seasonality.months[hoveredMonthIdx].percent) / 100)).toLocaleString('ru-RU')} ₽
                    </b>
                  </span>
                </div>

                <div className="w-full text-[11px] text-[#5d6470] italic border-t border-[#e3dfd6]/60 pt-1.5 mt-0.5">
                  Тактика: {data.seasonality.months[hoveredMonthIdx].strategyNote || 'Оптимизация рекламных ставок и конверсии карточек'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DETAILED MONTHS CARDS GRID */}
        {seasonViewMode === 'cards' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-5">
            {data.seasonality.months.map((m, idx) => {
              const barHeightPx = Math.max(8, Math.round((m.percent / maxMonthPercent) * 58));
              const monthRubles = m.budgetRub || Math.round((data.seasonality.annualBudgetRub * m.percent) / 100);
              const isPeak = m.queries === wordstatStats.peakQueries;
              const isTrough = m.queries === wordstatStats.troughQueries;

              return (
                <div 
                  key={idx} 
                  className={`bg-white border rounded-xl p-2.5 text-center flex flex-col justify-between shadow-2xs hover:border-[#0f6e6a] transition-all ${
                    isPeak 
                      ? 'border-[#0f6e6a] ring-1 ring-[#0f6e6a]/20 bg-emerald-50/20' 
                      : isTrough 
                        ? 'border-amber-200 bg-amber-50/20' 
                        : 'border-[#e3dfd6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <b className="text-xs sm:text-[13px] text-[#16181d] truncate">
                      {m.shortMonth || m.month}
                    </b>
                    {m.seasonLevel === 'high' ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">Пик</span>
                    ) : m.seasonLevel === 'low' ? (
                      <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1 py-0.2 rounded">Спад</span>
                    ) : null}
                  </div>

                  {m.queries && (
                    <div className="text-[11px] font-mono font-bold text-[#0f6e6a] bg-[#e9f3f1] py-0.5 px-1 rounded my-1">
                      {m.queries.toLocaleString('ru-RU')} запр.
                    </div>
                  )}
                  
                  <div className="h-[55px] flex items-end justify-center my-1">
                    <div 
                      style={{ height: `${barHeightPx}px` }}
                      className={`w-3/5 rounded-t-sm transition-all duration-300 relative group ${
                        isPeak ? 'bg-[#0f6e6a]' : isTrough ? 'bg-amber-400' : 'bg-[#0f6e6a]/70 hover:bg-[#0f6e6a]'
                      }`}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-10 font-mono">
                        {monthRubles.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>

                  <div className="text-[11.5px] font-bold text-[#16181d]">
                    {m.percent} %
                  </div>
                  {showBudgetRubles && (
                    <div className="text-[10px] text-[#5d6470] font-mono truncate">
                      {Math.round(monthRubles / 1000)}k ₽
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 3: STRUCTURED TABLE VIEW */}
        {seasonViewMode === 'table' && (
          <div className="overflow-x-auto border border-[#e3dfd6] rounded-xl bg-white shadow-xs mb-5">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#faf9f6] text-[#5d6470] border-b border-[#e3dfd6] font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Месяц</th>
                  <th className="py-2.5 px-3.5 text-right">Спрос Вордстат</th>
                  <th className="py-2.5 px-3.5 text-right">Доля в поиске</th>
                  <th className="py-2.5 px-3.5 text-right">Доля бюджета</th>
                  <th className="py-2.5 px-3.5 text-right">Рекомендуемый бюджет</th>
                  <th className="py-2.5 px-3.5 text-center">Фаза сезона</th>
                  <th className="py-2.5 px-3.5">Тактика продвижения</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3dfd6]/60">
                {data.seasonality.months.map((m, idx) => {
                  const rubles = m.budgetRub || Math.round((data.seasonality.annualBudgetRub * m.percent) / 100);
                  return (
                    <tr key={idx} className="hover:bg-stone-50 transition-colors">
                      <td className="py-2 px-3.5 font-bold text-[#16181d]">
                        {m.month}
                      </td>
                      <td className="py-2 px-3.5 text-right font-mono font-bold text-[#0f6e6a]">
                        {m.queries ? `${m.queries.toLocaleString('ru-RU')} запр.` : '—'}
                      </td>
                      <td className="py-2 px-3.5 text-right font-mono text-[#5d6470]">
                        {m.share ? m.share.toFixed(6) : '—'}
                      </td>
                      <td className="py-2 px-3.5 text-right font-bold text-[#16181d]">
                        {m.percent} %
                      </td>
                      <td className="py-2 px-3.5 text-right font-mono font-bold text-[#16181d]">
                        {rubles.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2 px-3.5 text-center">
                        {m.seasonLevel === 'high' ? (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                            Пик спроса
                          </span>
                        ) : m.seasonLevel === 'low' ? (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-100 text-stone-600">
                            Спад
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                            Стабильный
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-[11px] text-[#5d6470]">
                        {m.strategyNote || 'Стандартное органическое продвижение'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3 Season Periods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          {data.seasonality.periods.map((period, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-[#e3dfd6] rounded-xl p-4 shadow-xs hover:border-[#0f6e6a]/40 transition-colors"
            >
              <h3 className="text-sm sm:text-base font-bold text-[#16181d] mt-0 mb-1.5 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  idx === 0 ? 'bg-stone-400' : idx === 1 ? 'bg-amber-500' : 'bg-emerald-600'
                }`}></span>
                {period.title}
              </h3>
              <p className="text-xs sm:text-[13px] text-[#5d6470] leading-relaxed m-0">
                {period.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Note Box */}
        <div className="border-l-4 border-[#0f6e6a] bg-[#e9f3f1] p-3.5 sm:p-4 rounded-r-xl mt-4 text-xs sm:text-sm text-[#16181d] leading-relaxed shadow-2xs">
          <b>Логика авитолога: </b>{data.seasonality.note}
        </div>
      </section>

      {/* SECTION 5: Roadmap & Measurement Plan */}
      <section className="mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] mb-3">
          {getSectionTitle(data.roadmap.sectionTitle, 5)}
        </h2>

        <div className="overflow-x-auto -webkit-overflow-scrolling-touch border border-[#e3dfd6] rounded-xl bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-sm sm:text-[15px]">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#e3dfd6] text-xs sm:text-[13px] font-semibold text-[#5d6470]">
                <th className="py-2.5 px-3.5 sm:px-4 w-[130px] sm:w-[150px]">Шаг</th>
                <th className="py-2.5 px-3.5 sm:px-4">Что делаем</th>
                <th className="py-2.5 px-3.5 sm:px-4 w-[200px] sm:w-[260px]">Как поймём, что сработало</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3dfd6]">
              {data.roadmap.steps.map((st, idx) => (
                <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3 px-3.5 sm:px-4 font-bold text-xs sm:text-sm text-[#0f6e6a] align-top">
                    {st.step}
                  </td>
                  <td className="py-3 px-3.5 sm:px-4 text-xs sm:text-sm text-[#16181d] align-top">
                    {st.action}
                  </td>
                  <td className="py-3 px-3.5 sm:px-4 text-xs sm:text-sm text-[#5d6470] align-top">
                    <span className="inline-block bg-[#faf9f6] border border-[#e3dfd6] px-2 py-1 rounded text-xs text-[#2b2f36]">
                      {st.proof}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs sm:text-[13px] text-[#5d6470] mt-2.5 italic">
          {data.roadmap.disclaimer}
        </p>
      </section>

      {/* SECTION 6: Pricing Packages */}
      <section className="mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] mb-4">
          {getSectionTitle(data.pricing.sectionTitle, 6)}
        </h2>

        <div className={`grid grid-cols-1 ${data.pricing.tiers.length === 2 ? 'md:grid-cols-2 max-w-[760px] mx-auto' : 'md:grid-cols-3'} gap-4`}>
          {data.pricing.tiers.map((tier) => (
            <div 
              key={tier.id} 
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                tier.isMain 
                  ? 'border-[#0f6e6a] border-2 shadow-md relative ring-4 ring-[#0f6e6a]/10' 
                  : 'border-[#e3dfd6]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                    tier.isMain ? 'bg-[#0f6e6a] text-white' : 'bg-[#e9f3f1] text-[#0f6e6a]'
                  }`}>
                    {tier.tag}
                  </span>
                  {tier.isMain && (
                    <span className="text-[11px] font-bold text-[#0f6e6a] uppercase tracking-wide">
                      Хит продаж
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-[#16181d] mb-2 leading-snug">
                  {tier.title}
                </p>

                <b className="block text-2xl sm:text-[28px] font-extrabold text-[#16181d] my-3 leading-none">
                  {tier.sum}
                </b>

                <div className="text-xs sm:text-[13px] text-[#5d6470] space-y-1.5 leading-snug whitespace-pre-line border-t border-[#e3dfd6]/60 pt-3">
                  {tier.details}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#e3dfd6]/60">
                <button
                  onClick={() => setSelectedTierId(selectedTierId === tier.id ? null : tier.id)}
                  className={`w-full py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    selectedTierId === tier.id
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : tier.isMain
                      ? 'bg-[#0f6e6a] text-white hover:bg-[#0c5956]'
                      : 'bg-[#faf9f6] text-[#16181d] border border-[#e3dfd6] hover:bg-[#e9f3f1] hover:text-[#0f6e6a]'
                  }`}
                >
                  {selectedTierId === tier.id ? '✓ Выбран в предложение' : 'Выбрать этот тариф'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-[13px] text-[#5d6470] mt-3">
          {data.pricing.termsNote}
        </p>
      </section>

      {/* SECTION 7: Kickoff Checklist */}
      <section className="mb-14">
        <h2 className="text-xl sm:text-2xl font-bold text-[#16181d] mb-3">
          {getSectionTitle(data.kickoff.sectionTitle, 7)}
        </h2>

        <div className="bg-white border border-[#e3dfd6] rounded-2xl p-4 sm:p-5 shadow-xs">
          <ul className="space-y-2">
            {data.kickoff.items.map((item, idx) => (
              <li 
                key={idx}
                className="flex items-start gap-3 py-2 border-b border-dashed border-[#e3dfd6]/70 last:border-b-0"
              >
                <div className="mt-1 w-3.5 h-3.5 rounded-[3px] border-2 border-[#0f6e6a] shrink-0"></div>
                <span className="text-xs sm:text-sm text-[#2b2f36] leading-relaxed font-medium">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 mb-6 pt-4 border-t border-[#e3dfd6] text-xs text-[#5d6470] flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 leading-normal max-w-[700px]">
          {data.footer}
        </p>
        <div className="text-[11px] font-mono text-[#0f6e6a]">
          NicheReport 2.0 Engine · {data.id}
        </div>
      </footer>
    </div>
  );
};
