import React, { useState, useEffect } from 'react';
import { ReportData } from './types/report';
import { REFERENCE_AC_REPORT } from './data/niches';
import { HeaderNav } from './components/HeaderNav';
import { ReportViewer } from './components/ReportViewer';
import { AiGeneratorModal } from './components/AiGeneratorModal';
import { UnifiedInputModal } from './components/UnifiedInputModal';
import { generateStandaloneHtml } from './services/htmlExporter';
import { SearchMarketAnalysis, AvitoSearchItem } from './types/avitoParser';
import { 
  Download, 
  Maximize2, 
  Settings2,
  SlidersHorizontal
} from 'lucide-react';

export default function App() {
  const [report, setReport] = useState<ReportData>(() => {
    const saved = localStorage.getItem('niche_report_v2_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (!parsed.viewsSummary) {
            parsed.viewsSummary = REFERENCE_AC_REPORT.viewsSummary;
          }
          if (!parsed.seasonality?.wordstatAnalysis || !parsed.seasonality?.months?.[0]?.queries) {
            parsed.seasonality = REFERENCE_AC_REPORT.seasonality;
          }
          // Sanitize if previously polluted with 'Михаил' or 'Детейлинг'
          const hasDetailingInAds = parsed.sampleAds?.ads?.some((a: any) => /детейл|полировк|самообслуживан/i.test(a.title || '') || /детейл|полировк/i.test(a.body || ''));
          if (hasDetailingInAds || /детейл|михаил/i.test(parsed.nicheName) || /детейл|михаил/i.test(parsed.parsedSourceMeta?.keyword || '')) {
            localStorage.removeItem('niche_report_v2_data');
            return REFERENCE_AC_REPORT;
          }
          // Migrate old pricing tiers if cached from older version
          if (parsed.pricing?.tiers?.[1]?.sum === '5 000 ₽' || parsed.pricing?.tiers?.[2]?.sum === '9 000 ₽ / мес') {
            parsed.pricing = {
              ...REFERENCE_AC_REPORT.pricing,
              sectionTitle: parsed.hasExistingAccount !== false 
                ? '6. Тарифы на маркетинг и продвижение на Авито' 
                : '4. Тарифы на маркетинг и продвижение на Авито'
            };
          }
          // Migrate old verbose caption to requested concise caption
          if (parsed.heroCaption && /Образец композиции главного фото:/i.test(parsed.heroCaption)) {
            parsed.heroCaption = 'Образец композиции главного фото. В объявления ставим ваши реальные фото.';
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved report, using default', e);
      }
    }
    return REFERENCE_AC_REPORT;
  });

  const [viewMode, setViewMode] = useState<'client' | 'interactive' | 'edit'>('interactive');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [unifiedModalTab, setUnifiedModalTab] = useState<'sheet' | 'geo' | 'photo' | 'wordstat'>('sheet');
  const [hasParsedSheet, setHasParsedSheet] = useState(false);
  const [marketAnalysis, setMarketAnalysis] = useState<SearchMarketAnalysis | null>(null);
  const [showVersionBanner, setShowVersionBanner] = useState(true);

  const handleOpenUnifiedModal = (tab: 'sheet' | 'geo' | 'photo' | 'wordstat' = 'sheet') => {
    setUnifiedModalTab(tab);
    setIsUnifiedModalOpen(true);
  };

  // Check if current report already has parsedSourceMeta
  useEffect(() => {
    if (report.parsedSourceMeta) {
      setHasParsedSheet(true);
    }
  }, [report]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('niche_report_v2_data', JSON.stringify(report));
  }, [report]);

  // Handler to select another pre-built niche
  const handleSelectNiche = (newReport: ReportData) => {
    setReport(newReport);
    setHasParsedSheet(Boolean(newReport.parsedSourceMeta));
  };

  // Reset to the pristine baseline from URL
  const handleResetToBaseline = () => {
    setReport(REFERENCE_AC_REPORT);
    setHasParsedSheet(false);
    localStorage.removeItem('niche_report_v2_data');
  };

  const handleDownloadStandaloneHtml = () => {
    const htmlContent = generateStandaloneHtml(report);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${report.id}_${report.nicheKey}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#16181d] flex flex-col selection:bg-[#0f6e6a]/20">
      
      {/* 2.0 Control Toolbar */}
      {viewMode !== 'client' ? (
        <HeaderNav
          currentReport={report}
          onSelectNiche={handleSelectNiche}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onResetToBaseline={handleResetToBaseline}
          onOpenUnifiedModal={handleOpenUnifiedModal}
          hasParsedData={hasParsedSheet}
        />
      ) : (
        /* Floating restoration pill for client view */
        <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-2 bg-[#16181d]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-lg border border-stone-700 text-xs">
          <span className="font-semibold text-emerald-400">Режим: Клиентский вид</span>
          <button
            onClick={() => handleOpenUnifiedModal('sheet')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-2.5 py-0.5 rounded-md text-white font-bold transition-all cursor-pointer shadow-xs"
            title="Загрузить входные данные"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Входные данные</span>
          </button>
          <button
            onClick={() => setViewMode('interactive')}
            className="flex items-center gap-1 bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded-md text-stone-200 transition-colors cursor-pointer"
            title="Вернуться в панель управления 2.0"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Панель 2.0</span>
          </button>
          <button
            onClick={handleDownloadStandaloneHtml}
            className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 px-2 py-0.5 rounded-md text-white font-medium transition-colors cursor-pointer"
            title="Скачать автономный HTML"
          >
            <Download className="w-3.5 h-3.5" />
            <span>HTML</span>
          </button>
        </div>
      )}

      {/* Info notification banner */}
      {showVersionBanner && viewMode !== 'client' && (
        <div className="no-print bg-[#e9f3f1] border-b border-[#0f6e6a]/20 py-2 px-4 text-xs text-[#0f6e6a] flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 max-w-[1080px] mx-auto w-full">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-[#0f6e6a] text-white px-2 py-0.5 rounded-md shrink-0">
              {hasParsedSheet ? 'Парсинг Авито' : 'Входные данные'}
            </span>
            <span className="leading-snug text-[#16181d] flex-1">
              {hasParsedSheet ? (
                <>
                  Отчёт сформирован на основе <b>Google Таблицы парсинга поисковой выдачи Авито</b> по нише <b>«{report.parsedSourceMeta?.keyword || report.nicheName}»</b> ({report.city}): {report.viewsSummary?.totalAds ?? report.parsedSourceMeta?.totalAds ?? 0} объявлений конкурентов. Все офферы, фото и Вордстат синхронизированы.
                </>
              ) : (
                <>
                  Вся входная информация (Google Таблица / CSV, образец фото, поисковый запрос, город, Яндекс Вордстат) настраивается в едином окне входных данных.
                </>
              )}
            </span>
            <button
              onClick={() => handleOpenUnifiedModal('sheet')}
              className="text-xs font-bold bg-[#0f6e6a] hover:bg-[#0c5956] text-white px-3 py-1 rounded-lg shadow-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{hasParsedSheet ? 'Изменить входные данные' : 'Входные данные'}</span>
            </button>
          </div>
          <button
            onClick={() => setShowVersionBanner(false)}
            className="text-[#0f6e6a] hover:text-[#0c5956] font-bold text-sm px-1.5 cursor-pointer shrink-0"
            title="Скрыть подсказку"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Report View */}
      <main className="flex-1 pb-16">
        <ReportViewer
          data={report}
          onUpdateData={setReport}
          isEditMode={viewMode === 'edit'}
          onOpenUnifiedModal={handleOpenUnifiedModal}
        />
      </main>

      {/* Floating Action Bar at the bottom on larger screens */}
      {viewMode === 'interactive' && (
        <aside className="no-print fixed bottom-4 right-4 z-40 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#e3dfd6] shadow-xl rounded-2xl p-2">
          <button
            onClick={handleDownloadStandaloneHtml}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#0f6e6a] hover:bg-[#0c5956] text-white transition-all shadow-xs cursor-pointer"
            title="Скачать самостоятельный файл report.html"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт в HTML</span>
          </button>
          <button
            onClick={() => setViewMode('client')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#faf9f6] hover:bg-[#e9f3f1] text-[#16181d] border border-[#e3dfd6] transition-colors cursor-pointer"
            title="Открыть вид без панели"
          >
            <Maximize2 className="w-4 h-4 text-[#5d6470]" />
            <span>Чистый вид</span>
          </button>
        </aside>
      )}

      {/* UNIFIED ALL-IN-ONE DATA LOADER MODAL */}
      <UnifiedInputModal
        isOpen={isUnifiedModalOpen}
        onClose={() => setIsUnifiedModalOpen(false)}
        currentReport={report}
        initialTab={unifiedModalTab}
        onApplyReport={(newReport, analysis) => {
          setReport(newReport);
          if (analysis) {
            setMarketAnalysis(analysis);
            setHasParsedSheet(true);
          }
          setViewMode('interactive');
        }}
      />

      {/* AI Generator Modal */}
      <AiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onReportGenerated={(newReport) => {
          setReport(newReport);
          setHasParsedSheet(false);
          setViewMode('interactive');
        }}
      />
    </div>
  );
}
