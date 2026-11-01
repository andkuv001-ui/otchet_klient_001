import React, { useState, useEffect } from 'react';
import { 
  parseAvitoCsv, 
  analyzeAvitoSearch, 
  synthesizeReportFromAvitoSheet, 
  fetchGoogleSheetCsv, 
  loadAttachedSample 
} from '../services/avitoSheetParser';
import { AvitoSearchItem, SearchMarketAnalysis } from '../types/avitoParser';
import { ReportData } from '../types/report';
import { 
  Table, 
  FileSpreadsheet, 
  Upload, 
  Link, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  Eye, 
  TrendingUp, 
  ShieldCheck, 
  BadgePercent, 
  X, 
  Loader2, 
  ArrowRight,
  ExternalLink,
  Layers,
  Building2,
  SlidersHorizontal,
  MapPin
} from 'lucide-react';

const POPULAR_CITIES = [
  'Санкт-Петербург',
  'Москва',
  'Казань',
  'Екатеринбург',
  'Краснодар',
  'Оренбург',
  'Новосибирск',
  'Нижний Новгород',
  'Самара',
  'Ростов-на-Дону',
  'Уфа',
  'Тюмень',
  'Пермь',
  'Воронеж',
  'Челябинск',
  'Сочи'
];

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyReport: (report: ReportData, analysis: SearchMarketAnalysis, rawItems: AvitoSearchItem[]) => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  onApplyReport
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'analysis' | 'competitors'>('import');
  const [sheetUrl, setSheetUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed dataset state
  const [items, setItems] = useState<AvitoSearchItem[]>([]);
  const [analysis, setAnalysis] = useState<SearchMarketAnalysis | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<string>('Все конкуренты (Сводный аудит)');
  const [searchQuery, setSearchQuery] = useState('');

  // Overrides for keyword / region if detected imperfectly
  const [customKeyword, setCustomKeyword] = useState('');
  const [customRegion, setCustomRegion] = useState('');

  if (!isOpen) return null;

  // Handler: Load the real attached sample table
  const handleLoadSample = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loadAttachedSample();
      setItems(data.items);
      setAnalysis(data.analysis);
      setCustomKeyword(data.analysis.keyword);
      setCustomRegion(data.analysis.region);
      setActiveTab('analysis');
    } catch (err: any) {
      setError(err?.message || 'Ошибка загрузки образца');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Fetch from Google Sheet Link
  const handleFetchFromLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const csvText = await fetchGoogleSheetCsv(sheetUrl);
      const parsedItems = parseAvitoCsv(csvText);
      if (parsedItems.length === 0) {
        throw new Error('В таблице не найдено строк данных. Проверьте структуру и доступ по ссылке.');
      }
      const parsedAnalysis = analyzeAvitoSearch(parsedItems);
      setItems(parsedItems);
      setAnalysis(parsedAnalysis);
      setCustomKeyword(parsedAnalysis.keyword);
      setCustomRegion(parsedAnalysis.region);
      setActiveTab('analysis');
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить Google Таблицу. Проверьте права доступа («Доступ по ссылке»).');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Parse raw pasted text
  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    try {
      const parsedItems = parseAvitoCsv(rawText);
      if (parsedItems.length === 0) {
        throw new Error('Не удалось распознать строки таблицы. Вставьте корректный CSV или TSV.');
      }
      const parsedAnalysis = analyzeAvitoSearch(parsedItems);
      setItems(parsedItems);
      setAnalysis(parsedAnalysis);
      setCustomKeyword(parsedAnalysis.keyword);
      setCustomRegion(parsedAnalysis.region);
      setActiveTab('analysis');
    } catch (err: any) {
      setError(err?.message || 'Ошибка при разборе текста');
    }
  };

  // Handler: Upload local CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const parsedItems = parseAvitoCsv(content);
          const parsedAnalysis = analyzeAvitoSearch(parsedItems);
          setItems(parsedItems);
          setAnalysis(parsedAnalysis);
          setCustomKeyword(parsedAnalysis.keyword);
          setCustomRegion(parsedAnalysis.region);
          setActiveTab('analysis');
        } catch (err: any) {
          setError('Ошибка при чтении файла');
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Generate Report from the parsed sheet
  const handleGenerateReport = () => {
    if (!analysis || items.length === 0) return;
    const finalAnalysis = {
      ...analysis,
      keyword: customKeyword || analysis.keyword,
      region: customRegion || analysis.region
    };
    const report = synthesizeReportFromAvitoSheet(items, finalAnalysis, selectedSeller);
    onApplyReport(report, finalAnalysis, items);
    onClose();
  };

  // Filtered competitor list for search
  const filteredItems = items.filter(it => {
    const q = searchQuery.toLowerCase();
    return it.title.toLowerCase().includes(q) || 
           it.sellerName.toLowerCase().includes(q) ||
           it.address.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#1c1f26] border border-stone-700 text-stone-100 rounded-2xl w-full max-w-[960px] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white m-0">
                  Интеграция с Google Таблицей парсинга Авито
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  v2.0 Parser
                </span>
              </div>
              <p className="text-xs text-stone-400 m-0">
                Загрузка поисковой выдачи по ключевику и региону для автоматического формирования отчета
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-stone-800 bg-stone-900/40 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Источник данных</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            disabled={items.length === 0}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'analysis'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>2. Аналитика выдачи {items.length > 0 && `(${items.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('competitors')}
            disabled={items.length === 0}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'competitors'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>3. База объявлений</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1">
          
          {/* TAB 1: Import */}
          {activeTab === 'import' && (
            <div className="space-y-5">

              {/* Pre-generation Region / Location & Keyword Input */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-emerald-500/40 rounded-2xl p-4.5 shadow-lg space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white m-0">
                        Локация и ключевик перед генерацией отчёта
                      </h4>
                      <p className="text-[11px] text-stone-400 m-0">
                        Укажите любой город РФ — тексты объявлений, сезонность, средние чеки и чек-лист адаптируются под выбранный регион
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-medium">
                    {customRegion || 'Любой город РФ'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Region Input & Quick Chips */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-200 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        Город / Регион поиска:
                      </span>
                      {customRegion && (
                        <span className="text-[11px] text-emerald-400 font-bold">
                          {customRegion}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Санкт-Петербург, Москва, Казань, Оренбург, Екатеринбург..."
                      value={customRegion}
                      onChange={(e) => setCustomRegion(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-white placeholder:text-stone-500 focus:outline-emerald-500 focus:border-emerald-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {POPULAR_CITIES.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setCustomRegion(c)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            customRegion.toLowerCase() === c.toLowerCase()
                              ? 'bg-emerald-700 text-white border-emerald-400 font-bold'
                              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keyword Input & Quick Chips */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-200 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-emerald-400" />
                        Ключевой запрос / Ниша:
                      </span>
                      {customKeyword && (
                        <span className="text-[11px] text-emerald-400 font-bold">
                          {customKeyword}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Детейлинг, Ремонт квартир, Кондиционеры, Кухни..."
                      value={customKeyword}
                      onChange={(e) => setCustomKeyword(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-white placeholder:text-stone-500 focus:outline-emerald-500 focus:border-emerald-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {['Детейлинг', 'Полировка авто', 'Химчистка авто', 'Оклейка пленкой', 'Ремонт квартир', 'Кондиционеры'].map((k) => (
                        <button
                          type="button"
                          key={k}
                          onClick={() => setCustomKeyword(k)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            customKeyword.toLowerCase() === k.toLowerCase()
                              ? 'bg-emerald-700 text-white border-emerald-400 font-bold'
                              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feature highlight: One-click instant load of attached sample */}
              <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-700/60 rounded-2xl p-4.5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1 max-w-[580px]">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-3 h-3" />
                    Прикреплённый файл из задания
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white m-0">
                    Загрузить готовую выборку Авито (50 объявлений) {customRegion ? `· регион ${customRegion}` : ''}
                  </h4>
                  <p className="text-xs text-stone-300 m-0">
                    Реальный парсинг выдачи Авито: продавцы, рейтинг, отзывы, цены, полные тексты офферов и статистика просмотров{customRegion ? ` с привязкой к ${customRegion}` : ''}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Загрузить выборку {customRegion ? `(${customRegion})` : ''}</span>
                </button>
              </div>

              {/* Method A: Google Sheet Public URL */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4.5">
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Link className="w-4 h-4 text-emerald-400" />
                  Вариант A: Ссылка на Google Таблицу
                </h4>
                <p className="text-xs text-stone-400 mb-3">
                  Вставьте ссылку на Google Таблицу с парсингом (например, <code className="bg-stone-800 px-1 py-0.5 rounded text-stone-300">https://docs.google.com/spreadsheets/d/...</code>). Убедитесь, что доступ открыт для чтения.
                </p>

                <form onSubmit={handleFetchFromLink} className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 text-xs sm:text-sm bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-white placeholder:text-stone-500 focus:outline-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !sheetUrl.trim()}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Загрузить
                  </button>
                </form>
              </div>

              {/* Method B: Local File / Paste */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Upload CSV */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4.5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      Вариант B: Загрузить CSV / TSV файл
                    </h4>
                    <p className="text-xs text-stone-400 mb-3">
                      Экспортируйте таблицу парсинга в .csv или .tsv и выберите файл.
                    </p>
                  </div>

                  <label className="block w-full py-2.5 px-3 rounded-xl border border-dashed border-stone-700 text-center text-xs font-semibold text-stone-300 hover:bg-stone-800/80 hover:border-emerald-500 transition-colors cursor-pointer">
                    <span>Выбрать файл с компьютера...</span>
                    <input 
                      type="file" 
                      accept=".csv,.tsv,.txt" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                {/* Paste Text */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4.5">
                  <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    Вариант C: Вставить скопированные строки
                  </h4>
                  <p className="text-xs text-stone-400 mb-2">
                    Выделите ячейки в Google Sheets или Excel и вставьте сюда (Ctrl+V).
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Вставьте сюда CSV или строки из таблицы..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full text-xs bg-stone-950 border border-stone-700 rounded-lg p-2 text-white mb-2 resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleParseRawText}
                    disabled={!rawText.trim()}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Распознать вставленный текст
                  </button>
                </div>

              </div>

              {error && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl">
                  {error}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Analysis & Synthesis */}
          {activeTab === 'analysis' && analysis && (
            <div className="space-y-6">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-stone-400 block font-medium">Ключевик и регион</span>
                  <b className="text-sm font-bold text-white block mt-0.5 truncate">
                    {analysis.keyword}
                  </b>
                  <span className="text-xs text-emerald-400">{analysis.region}</span>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-stone-400 block font-medium">Конкурентов в выборке</span>
                  <b className="text-xl font-extrabold text-white block mt-0.5">
                    {analysis.totalAds} объявл.
                  </b>
                  <span className="text-xs text-stone-400">{analysis.totalViews.toLocaleString('ru-RU')} просм.</span>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-stone-400 block font-medium">Средняя цена услуги</span>
                  <b className="text-xl font-extrabold text-emerald-400 block mt-0.5">
                    {analysis.avgPrice.toLocaleString('ru-RU')} ₽
                  </b>
                  <span className="text-xs text-stone-400">медиана: {analysis.medianPrice.toLocaleString('ru-RU')} ₽</span>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-stone-400 block font-medium">Платное продвижение</span>
                  <b className="text-xl font-extrabold text-amber-400 block mt-0.5">
                    {analysis.paidPromoPercent} %
                  </b>
                  <span className="text-xs text-stone-400">XL / Продвинуто</span>
                </div>
              </div>

              {/* Detailed Views Summary Preview from Real Table Data */}
              <div className="bg-stone-900/90 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    Сводные данные выдачи (рассчитаны строго по вашей таблице)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {items.length} объявлений
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-400 block">Просмотров в ср.</span>
                    <b className="text-base text-white block mt-0.5">{items.length > 0 ? (items.map(it => it.viewsTotal || it.viewsToday || 0).reduce((a, b) => a + b, 0) / items.length).toFixed(2) : 0}</b>
                  </div>
                  <div className="bg-stone-950/80 p-2.5 rounded-xl border border-emerald-900/60">
                    <span className="text-[10px] text-emerald-400 block font-medium">С платными</span>
                    <b className="text-base text-emerald-300 block mt-0.5">
                      {(() => {
                        const wp = items.filter(it => it.paidPromo && it.paidPromo.trim() !== '' && it.paidPromo.trim() !== '-');
                        return wp.length > 0 ? (wp.map(it => it.viewsTotal || it.viewsToday || 0).reduce((a, b) => a + b, 0) / wp.length).toFixed(2) : '0';
                      })()}
                    </b>
                  </div>
                  <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-400 block">Без платных (органика)</span>
                    <b className="text-base text-stone-200 block mt-0.5">
                      {(() => {
                        const np = items.filter(it => !it.paidPromo || it.paidPromo.trim() === '' || it.paidPromo.trim() === '-');
                        return np.length > 0 ? (np.map(it => it.viewsTotal || it.viewsToday || 0).reduce((a, b) => a + b, 0) / np.length).toFixed(2) : '0';
                      })()}
                    </b>
                  </div>
                  <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-400 block">Мин / Макс</span>
                    <b className="text-base text-stone-200 block mt-0.5">
                      {items.length > 0 ? Math.min(...items.map(it => it.viewsTotal || it.viewsToday || 0)) : 0} / {items.length > 0 ? Math.max(...items.map(it => it.viewsTotal || it.viewsToday || 0)) : 0}
                    </b>
                  </div>
                  <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800">
                    <span className="text-[10px] text-stone-400 block">С платными / Без</span>
                    <b className="text-base text-stone-200 block mt-0.5">
                      {items.filter(it => it.paidPromo && it.paidPromo.trim() !== '' && it.paidPromo.trim() !== '-').length} / {items.filter(it => !it.paidPromo || it.paidPromo.trim() === '' || it.paidPromo.trim() === '-').length}
                    </b>
                  </div>
                </div>
              </div>

              {/* Target Scope Selection */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                    Параметры формирования отчета 2.0
                  </h4>
                  <span className="text-xs text-emerald-400 font-semibold">
                    На основе {items.length} карточек
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Для кого формируем аудит:
                    </label>
                    <select
                      value={selectedSeller}
                      onChange={(e) => setSelectedSeller(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-emerald-500"
                    >
                      <option value="Все конкуренты (Сводный аудит)">
                        Все конкуренты (Сводный аудит ниши и выдачи в регионе)
                      </option>
                      {analysis.topSellers.map((s, idx) => (
                        <option key={idx} value={s.name}>
                          {s.name} ({s.adsCount} объявление, {s.totalViews.toLocaleString('ru-RU')} просм., {s.rating}⭐)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Выберите конкретного продавца для персонального аудита его объявлений или сводный отчет.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                          <span>Ключевой запрос:</span>
                        </label>
                        <input
                          type="text"
                          value={customKeyword}
                          onChange={(e) => setCustomKeyword(e.target.value)}
                          className="w-full text-xs bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            Целевой регион / Город:
                          </span>
                        </label>
                        <input
                          type="text"
                          value={customRegion}
                          onChange={(e) => setCustomRegion(e.target.value)}
                          placeholder="Москва, Казань, Оренбург, Санкт-Петербург..."
                          className="w-full text-xs bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    {/* Quick city selector chips */}
                    <div>
                      <span className="text-[10px] text-stone-400 block mb-1">
                        Быстрый выбор региона (любой город):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {POPULAR_CITIES.map((c) => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => setCustomRegion(c)}
                            className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                              customRegion.toLowerCase() === c.toLowerCase()
                                ? 'bg-emerald-700 text-white border-emerald-400 font-bold'
                                : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Action Button */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('competitors')}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-800 transition-colors"
                  >
                    Посмотреть все {items.length} объявлений...
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Сформировать эталонный отчёт 2.0</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Service clusters */}
              <div>
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Структура услуг в поисковой выдаче:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {analysis.commonServices.map((cl, idx) => (
                    <div key={idx} className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-stone-200">{cl.title}</div>
                        <div className="text-[11px] text-stone-400">{cl.count} объявлений в выборке</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400">~{cl.avgPrice.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Competitors Table */}
          {activeTab === 'competitors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-[340px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    placeholder="Поиск по названию, продавцу, адресу..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-stone-900 border border-stone-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-stone-500"
                  />
                </div>
                <span className="text-xs text-stone-400">
                  Показано {filteredItems.length} из {items.length}
                </span>
              </div>

              <div className="border border-stone-800 rounded-xl overflow-hidden overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-900 text-stone-400 font-semibold sticky top-0 border-b border-stone-800">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Заголовок</th>
                      <th className="py-2 px-3">Продавец</th>
                      <th className="py-2 px-3">Цена</th>
                      <th className="py-2 px-3">Просмотры</th>
                      <th className="py-2 px-3">Рейтинг</th>
                      <th className="py-2 px-3">Продвижение</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-200">
                    {filteredItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-stone-800/50 transition-colors">
                        <td className="py-2 px-3 text-stone-500">{it.position || idx + 1}</td>
                        <td className="py-2 px-3 font-medium max-w-[220px] truncate" title={it.title}>
                          {it.title}
                        </td>
                        <td className="py-2 px-3 max-w-[140px] truncate text-stone-300">
                          {it.sellerName}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                          {it.price > 0 ? `${it.price.toLocaleString('ru-RU')} ₽` : 'По запросу'}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {it.viewsTotal.toLocaleString('ru-RU')}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-amber-400 font-semibold">{it.rating || '—'}</span>
                          <span className="text-[10px] text-stone-400"> ({it.reviews})</span>
                        </td>
                        <td className="py-2 px-3">
                          {it.paidPromo ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                              {it.paidPromo}
                            </span>
                          ) : (
                            <span className="text-stone-500 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Сформировать эталонный отчёт 2.0</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
