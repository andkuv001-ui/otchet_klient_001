import React, { useState, useRef, useEffect } from 'react';
import { 
  parseAvitoCsv, 
  analyzeAvitoSearch, 
  synthesizeReportFromAvitoSheet, 
  fetchGoogleSheetCsv, 
  loadAttachedSample,
  buildPricingTiers
} from '../services/avitoSheetParser';
import { parseWordstatText, DEFAULT_WORDSTAT_SAMPLE } from '../services/wordstatParser';
import { AvitoSearchItem, SearchMarketAnalysis } from '../types/avitoParser';
import { ReportData } from '../types/report';
import { 
  Sparkles, 
  Upload, 
  FileSpreadsheet, 
  Camera, 
  TrendingUp, 
  MapPin, 
  Search, 
  Check, 
  AlertCircle, 
  X, 
  Loader2, 
  ArrowRight, 
  Link as LinkIcon, 
  Image as ImageIcon,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

const POPULAR_CITIES = [
  'Оренбург',
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Екатеринбург',
  'Краснодар',
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

const PHOTO_PRESETS = [
  {
    title: 'Кондиционеры / Климат',
    url: '/src/assets/images/ac_master_photo_1793133720502.jpg',
    caption: 'Образец композиции главного фото. В объявления ставим ваши реальные фото.'
  },
  {
    title: 'Автодетейлинг / Полировка',
    url: '/src/assets/images/detailing_master_1793158867378.jpg',
    caption: 'Образец главного фото в детейлинге: автомобиль в работе под ярким гексагональным светом, виден зеркальный блеск кузова и профессионализм мастера.'
  },
  {
    title: 'Ремонт квартир под ключ',
    url: '/src/assets/images/renovation_master_1793133732916.jpg',
    caption: 'Главное фото: мастер на объекте с лазерным осепостроителем. Видно культуру производства, чистоту и профессиональный уровень бригады.'
  },
  {
    title: 'Кухни и мебель на заказ',
    url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    caption: 'Главное фото: готовая кухня в скандинавском стиле без ручек с подсветкой столешницы. Реальный кадр монтажника.'
  }
];

export interface UnifiedInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReport: ReportData;
  onApplyReport: (newReport: ReportData, analysis?: SearchMarketAnalysis, items?: AvitoSearchItem[]) => void;
  initialTab?: 'sheet' | 'geo' | 'photo' | 'wordstat';
}

export const UnifiedInputModal: React.FC<UnifiedInputModalProps> = ({
  isOpen,
  onClose,
  currentReport,
  onApplyReport,
  initialTab = 'sheet'
}) => {
  // Map 'geo' to 'sheet' since geo/keyword are now globally unified at the top
  const normalizedInitialTab = initialTab === 'geo' ? 'sheet' : initialTab;
  const [activeTab, setActiveTab] = useState<'sheet' | 'photo' | 'wordstat'>(normalizedInitialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Unified Common Parameters (Single source of truth)
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState('Оренбург');
  const [hasExistingAccount, setHasExistingAccount] = useState<boolean>(true);

  // 2. Sheet / CSV State
  const [sheetUrl, setSheetUrl] = useState('');
  const [rawCsvText, setRawCsvText] = useState('');
  const [parsedItems, setParsedItems] = useState<AvitoSearchItem[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<SearchMarketAnalysis | null>(null);

  // 3. Photo State
  const [heroImage, setHeroImage] = useState(PHOTO_PRESETS[0].url);
  const [heroCaption, setHeroCaption] = useState(PHOTO_PRESETS[0].caption);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Wordstat State
  const [wordstatRaw, setWordstatRaw] = useState(DEFAULT_WORDSTAT_SAMPLE);
  const [annualBudget, setAnnualBudget] = useState(180000);

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab === 'geo' ? 'sheet' : initialTab);
      const rawKw = currentReport.parsedSourceMeta?.keyword || currentReport.nicheName || '';
      const cleanKw = /детейл|михаил/i.test(rawKw) ? '' : rawKw;
      setKeyword(cleanKw);
      setRegion(currentReport.city || 'Оренбург');
      setHeroImage(currentReport.heroImage || PHOTO_PRESETS[0].url);
      setHeroCaption(currentReport.heroCaption || PHOTO_PRESETS[0].caption);
      setWordstatRaw(currentReport.seasonality?.wordstatRawText || DEFAULT_WORDSTAT_SAMPLE);
      setAnnualBudget(currentReport.seasonality?.annualBudgetRub || 180000);
      setHasExistingAccount(currentReport.hasExistingAccount !== undefined ? currentReport.hasExistingAccount : true);
      setErrorMessage(null);
      setStatusMessage(null);
    }
  }, [isOpen, initialTab, currentReport]);

  if (!isOpen) return null;

  // Real-time wordstat parsing
  const wordstatResult = parseWordstatText(wordstatRaw, annualBudget, keyword, region);

  // Parse CSV text directly into state
  const handleProcessCsvText = (csvString: string, sourceLabel: string = 'CSV') => {
    try {
      const items = parseAvitoCsv(csvString);
      if (items.length === 0) {
        throw new Error('В файле/тексте не найдены строки с объявлениями. Проверьте формат CSV.');
      }
      const analysis = analyzeAvitoSearch(items);
      setParsedItems(items);
      setMarketAnalysis(analysis);

      // Populate keyword and region strictly from the parsed table data
      if (analysis.keyword && !/михаил|детейлинг/i.test(analysis.keyword)) {
        setKeyword(analysis.keyword);
      }
      if (analysis.region) {
        setRegion(analysis.region);
      }

      // Adjust hero photo if recognized
      if (/кондиционер|климат|сплит/i.test(analysis.keyword)) {
        setHeroImage(PHOTO_PRESETS[0].url);
        setHeroCaption(PHOTO_PRESETS[0].caption);
      } else if (/ремонт|отделк/i.test(analysis.keyword)) {
        setHeroImage(PHOTO_PRESETS[2].url);
        setHeroCaption(PHOTO_PRESETS[2].caption);
      } else if (/детейл|полировк/i.test(analysis.keyword)) {
        setHeroImage(PHOTO_PRESETS[1].url);
        setHeroCaption(PHOTO_PRESETS[1].caption);
      }

      setStatusMessage(`Успешно загружено ${items.length} объявлений (${sourceLabel}). Направление: «${analysis.keyword}» (${analysis.region}).`);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка обработки CSV');
    }
  };

  // Load from Google Sheet URL
  const handleFetchSheet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetUrl.trim()) {
      setErrorMessage('Вставьте ссылку на Google Таблицу');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Загрузка таблицы из Google Sheets...');
    try {
      const csvText = await fetchGoogleSheetCsv(sheetUrl.trim());
      setRawCsvText(csvText.slice(0, 1000) + '...');
      handleProcessCsvText(csvText, 'Google Sheets');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Не удалось загрузить Google Таблицу. Проверьте ссылку и доступ.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload CSV file from computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawCsvText(content.slice(0, 1000) + '...');
        handleProcessCsvText(content, `Файл ${file.name}`);
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      setErrorMessage('Не удалось прочитать файл');
      setIsLoading(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Load attached sample (50 rows, AC installation Orenburg)
  const handleLoadAttachedSample = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Загрузка образца парсинга (Кондиционеры, Оренбург)...');
    try {
      const sampleData = await loadAttachedSample();
      setParsedItems(sampleData.items);
      setMarketAnalysis(sampleData.analysis);
      setKeyword(sampleData.analysis.keyword);
      setRegion(sampleData.analysis.region);
      setHeroImage(PHOTO_PRESETS[0].url);
      setHeroCaption(PHOTO_PRESETS[0].caption);
      setRawCsvText(`Образец парсинга Авито (${sampleData.items.length} строк по нише «${sampleData.analysis.keyword}», ${sampleData.analysis.region})`);
      setStatusMessage(`Загружен образец парсинга: ${sampleData.items.length} объявлений (${sampleData.analysis.region}).`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Не удалось прочитать прикрепленный файл');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload hero photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Выберите файл изображения (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setHeroImage(dataUrl);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // MASTER SUBMIT: Apply everything into the final report
  const handleApplyAll = () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rawKw = keyword.trim();
      const effectiveKeyword = (!rawKw || /^(михаил|детейлинг)/i.test(rawKw)) 
        ? (marketAnalysis?.keyword && !/^(михаил|детейлинг)/i.test(marketAnalysis.keyword) 
            ? marketAnalysis.keyword 
            : (currentReport.nicheName && !/детейл/i.test(currentReport.nicheName) ? currentReport.nicheName : 'Монтаж кондиционеров')) 
        : rawKw;
      const effectiveRegion = region.trim() || marketAnalysis?.region || currentReport.city || 'Оренбург';

      let baseReport: ReportData;

      if (parsedItems.length > 0) {
        const effectiveAnalysis: SearchMarketAnalysis = marketAnalysis ? {
          ...marketAnalysis,
          keyword: effectiveKeyword,
          region: effectiveRegion
        } : analyzeAvitoSearch(parsedItems, effectiveKeyword, effectiveRegion);

        baseReport = synthesizeReportFromAvitoSheet(parsedItems, effectiveAnalysis, undefined, hasExistingAccount);
      } else {
        baseReport = {
          ...currentReport,
          hasExistingAccount,
          nicheName: effectiveKeyword,
          city: effectiveRegion,
          kicker: currentReport.kicker.replace(/·\s*[^·]+\s*·\s*[\d\.\-]+$/, `· ${effectiveRegion} · ${new Date().toLocaleDateString('ru-RU')}`)
        };
        if (!hasExistingAccount) {
          baseReport.sprint = {
            title: 'Что делаем за 7 дней',
            items: [
              `Подготовка и оформление профиля Авито с нуля по чек-листу (28 пунктов).`,
              `Анализ цен и структуры карточек конкурентов из поисковой выдачи для отстройки.`,
              `Три новых продающих текста объявлений с понятной сметой и привязкой к ценам по ${effectiveRegion}.`,
              `План продвижения по сезонам с учетом графика поискового спроса Яндекс Вордстат.`,
              'Скрипт квалификации в чате Авито: ответ за 3 минуты и перевод на заказ/замер/осмотр.'
            ],
            note: `Запуск с нуля: готовим продающий аккаунт, отстраиваемся от конкурентов и запускаем первые обращения.`
          };
          baseReport.lead = `Запуск с нуля: чтобы не слить рекламный бюджет на старте, выстраиваем стратегию по реальной поисковой выдаче конкурентов в регионе ${effectiveRegion}. Ниже чек-лист, 3 объявления-образца и план продвижения.`;
        }
      }

      baseReport.hasExistingAccount = hasExistingAccount;
      baseReport.pricing = {
        ...baseReport.pricing,
        sectionTitle: hasExistingAccount 
          ? '6. Тарифы на маркетинг и продвижение на Авито' 
          : '4. Тарифы на маркетинг и продвижение на Авито',
        tiers: buildPricingTiers(hasExistingAccount),
        termsNote: 'Рекламный бюджет Авито оплачиваете вы в своём кабинете. Доступ: через функцию сотрудников в кабинете Авито или правки по нашим готовым текстам вносите сами.'
      };

      // Photo
      baseReport.heroImage = heroImage.trim() || baseReport.heroImage;
      baseReport.heroCaption = heroCaption.trim() || baseReport.heroCaption;

      // Wordstat
      if (wordstatResult) {
        baseReport.seasonality = {
          ...baseReport.seasonality,
          sectionTitle: '4. Продвижение с учётом сезона (спрос по Яндекс Вордстат)',
          annualBudgetRub: annualBudget,
          months: wordstatResult.months,
          periods: wordstatResult.periods,
          note: wordstatResult.note,
          wordstatAnalysis: wordstatResult.analysis,
          wordstatKeyword: effectiveKeyword,
          wordstatRegion: effectiveRegion,
          wordstatRawText: wordstatRaw.trim()
        };
      }

      baseReport.city = effectiveRegion;
      baseReport.nicheName = effectiveKeyword;

      onApplyReport(baseReport, marketAnalysis || undefined, parsedItems.length > 0 ? parsedItems : undefined);
      onClose();
    } catch (err: any) {
      console.error('Error applying unified data:', err);
      setErrorMessage(err?.message || 'Ошибка применения данных');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#1c1f26] border border-stone-700 text-stone-100 rounded-2xl w-full max-w-[880px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header (Clean, no duplicate sample button) */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white m-0">
                Входные данные отчёта
              </h3>
              <p className="text-xs text-stone-400 m-0 mt-0.5">
                Заполните параметры клиента один раз и загрузите данные выдачи, фото и Вордстат
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            title="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Error strip */}
        {errorMessage && (
          <div className="bg-red-950/80 border-b border-red-800/60 px-4 py-2.5 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}
        {statusMessage && !errorMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-4 py-2 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="flex-1">{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* UNIFIED TOP SECTION: Client & Search Direction (Specified ONCE, not duplicated!) */}
        <div className="p-4 sm:p-5 bg-[#16181f] border-b border-stone-800 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Keyword / Direction */}
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                  Поисковый запрос / Ниша:
                </span>
                {marketAnalysis?.keyword && (
                  <span className="text-[10px] text-emerald-400 font-normal">
                    (из таблицы: «{marketAnalysis.keyword}»)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Например: Установка кондиционеров, Ремонт квартир..."
                className="w-full bg-[#0f1115] border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:outline-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* 2. Region / City */}
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Город / Регион:
                </span>
                {marketAnalysis?.region && (
                  <span className="text-[10px] text-emerald-400 font-normal">
                    (из таблицы: «{marketAnalysis.region}»)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Например: Оренбург, Москва, Казань..."
                className="w-full bg-[#0f1115] border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:outline-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Quick City Chips (Under Region) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-stone-400 mr-1">Быстрый выбор:</span>
            {POPULAR_CITIES.slice(0, 10).map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setRegion(city)}
                className={`text-[11px] px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  region.toLowerCase() === city.toLowerCase()
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-stone-800/90 hover:bg-stone-700 text-stone-300'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* 3. Account Status Checkbox (Specified ONCE) */}
          <div className={`p-3 rounded-xl border transition-all ${
            hasExistingAccount 
              ? 'bg-[#101917] border-emerald-600/40' 
              : 'bg-[#1b1510] border-amber-600/40'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasExistingAccount}
                onChange={(e) => setHasExistingAccount(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-stone-600 text-emerald-600 focus:ring-emerald-500 bg-stone-900 cursor-pointer accent-emerald-500"
              />
              <div className="flex-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white">
                    У клиента есть действующий аккаунт на Авито
                  </span>
                  {hasExistingAccount ? (
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      Разделы 1 и 2 включены (аудит + калькулятор)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                      Запуск с нуля (разделы 1 и 2 скрыты)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 mt-1 mb-0 leading-relaxed">
                  {hasExistingAccount 
                    ? 'В отчёте рассчитываются потери звонков по текущей статистике, формируется чек-лист аудита и 3 тарифа (Аудит 2 000 ₽, Пакет 8 000 ₽, Ведение 19 000 ₽/мес).' 
                    : 'Галочка снята: аккаунта нет. Разделы аудита и калькулятора исключены. Формируются 2 тарифа под запуск с нуля (Пакет 8 000 ₽ и Ведение 19 000 ₽/мес).'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 3 Tab Navigation Bar (No duplicate query/geo tab!) */}
        <div className="px-4 sm:px-5 pt-2.5 pb-2 border-b border-stone-800 bg-[#121418] flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'sheet'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Выдача Авито (Google Таблица / CSV)</span>
            {parsedItems.length > 0 && (
              <span className="bg-black/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {parsedItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('photo')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'photo'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Образец фото</span>
          </button>

          <button
            onClick={() => setActiveTab('wordstat')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'wordstat'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Сезонность (Яндекс Вордстат)</span>
            {wordstatResult && (
              <span className="bg-black/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {wordstatResult.months.length} мес
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: Google Sheet / CSV */}
          {activeTab === 'sheet' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Option 1: Google Sheet Link */}
              <div className="bg-stone-900/70 p-4 rounded-xl border border-stone-800">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Ссылка на Google Таблицу (поисковая выдача Авито):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="flex-1 bg-[#101216] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleFetchSheet}
                    disabled={isLoading || !sheetUrl.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    <span>Загрузить</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 mt-2 m-0">
                  Таблица должна иметь доступ по ссылке (Файл → Поделиться → «Все, у кого есть ссылка»).
                </p>
              </div>

              {/* Option 2 & 3: File Upload OR Ready Sample */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-dashed border-stone-700 hover:border-emerald-500/70 rounded-xl p-4 text-center bg-stone-900/40 transition-colors flex flex-col justify-between">
                  <div>
                    <Upload className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-white mb-1">
                      Загрузить CSV файл
                    </div>
                    <p className="text-[11px] text-stone-400 mb-3">
                      Экспорт парсинга выдачи с компьютера
                    </p>
                  </div>
                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-600 cursor-pointer transition-colors">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Выбрать .csv файл</span>
                    <input 
                      type="file" 
                      accept=".csv,text/csv,text/plain" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="border border-stone-800 rounded-xl p-4 bg-gradient-to-br from-stone-900/80 to-[#102422]/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Готовый образец парсинга
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                        50 строк
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">
                      Реальные 50 объявлений конкурентов по нише <b>«Установка кондиционеров»</b> (Оренбург) со сбором просмотров и платных пакетов.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadAttachedSample}
                    disabled={isLoading}
                    className="mt-3 w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Загрузить образец (Кондиционеры)</span>
                  </button>
                </div>
              </div>

              {/* Parsed Summary Box if loaded */}
              {parsedItems.length > 0 && marketAnalysis && (
                <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Таблица распознана ({parsedItems.length} объявлений)
                    </span>
                    <span className="text-xs text-stone-400">
                      Регион: <b>{marketAnalysis.region}</b> · Запрос: <b>{marketAnalysis.keyword}</b>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-black/30 p-2 rounded-lg">
                      <div className="text-stone-400 text-[10px]">Ср. просмотров</div>
                      <div className="font-extrabold text-white text-sm mt-0.5">{marketAnalysis.avgViewsPerAd}</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg">
                      <div className="text-stone-400 text-[10px]">Платные услуги</div>
                      <div className="font-extrabold text-emerald-400 text-sm mt-0.5">{marketAnalysis.paidPromoPercent}%</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg">
                      <div className="text-stone-400 text-[10px]">Ср. цена</div>
                      <div className="font-extrabold text-white text-sm mt-0.5">{marketAnalysis.avgPrice.toLocaleString('ru-RU')} ₽</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg">
                      <div className="text-stone-400 text-[10px]">Всего просмотров</div>
                      <div className="font-extrabold text-white text-sm mt-0.5">{marketAnalysis.totalViews.toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paste Raw CSV */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Или вставьте сырой текст CSV / TSV напрямую:
                </label>
                <textarea
                  rows={2}
                  value={rawCsvText}
                  onChange={(e) => {
                    setRawCsvText(e.target.value);
                    if (e.target.value.includes('\n') && e.target.value.length > 50) {
                      handleProcessCsvText(e.target.value, 'Ручная вставка');
                    }
                  }}
                  placeholder="Заголовок,Цена,Просмотров,Платные услуги,Адрес..."
                  className="w-full bg-[#101216] border border-stone-800 rounded-lg p-2.5 text-xs text-stone-300 font-mono focus:outline-emerald-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Hero Photo */}
          {activeTab === 'photo' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-900/70 p-4 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    Предпросмотр фото:
                  </label>
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-black border border-stone-700 shadow-md">
                    <img 
                      src={heroImage} 
                      alt="Hero preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs text-[10px] text-stone-200 p-2 rounded-lg border border-white/10 line-clamp-2">
                      {heroCaption || 'Подпись к фото'}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Загрузить свой файл изображения:
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Выбрать файл с диска (JPG, PNG)</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Или вставьте прямую ссылку (URL):
                    </label>
                    <input
                      type="url"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#101216] border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Подпись под фото (пояснение для клиента):
                    </label>
                    <textarea
                      rows={2}
                      value={heroCaption}
                      onChange={(e) => setHeroCaption(e.target.value)}
                      placeholder="Образец композиции главного фото. В объявления ставим ваши реальные фото."
                      className="w-full bg-[#101216] border border-stone-700 rounded-lg p-2 text-xs text-stone-200 focus:outline-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Preset Gallery */}
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Готовые эталонные композиции фото:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PHOTO_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setHeroImage(preset.url);
                        setHeroCaption(preset.caption);
                      }}
                      className={`cursor-pointer rounded-xl overflow-hidden border p-2 transition-all ${
                        heroImage === preset.url
                          ? 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/50'
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black mb-1.5">
                        <img 
                          src={preset.url} 
                          alt={preset.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-[11px] font-bold text-white truncate">
                        {preset.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Wordstat */}
          {activeTab === 'wordstat' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-stone-900/70 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Данные Яндекс Вордстат (история запросов по месяцам):
                  </label>
                  <button
                    type="button"
                    onClick={() => setWordstatRaw(DEFAULT_WORDSTAT_SAMPLE)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Вставить 13 месяцев (образец)
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={wordstatRaw}
                  onChange={(e) => setWordstatRaw(e.target.value)}
                  placeholder={`сентябрь 2025\t3 281\t0,000029\nоктябрь 2025\t2 385\t0,000020\n...`}
                  className="w-full bg-[#101216] border border-stone-700 rounded-lg p-2.5 text-xs text-stone-200 font-mono focus:outline-emerald-500 leading-relaxed"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Годовой рекламный бюджет клиента (₽):
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={annualBudget}
                      onChange={(e) => setAnnualBudget(Math.max(10000, Number(e.target.value) || 0))}
                      className="w-full bg-[#101216] border border-stone-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-emerald-500"
                    />
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Бюджет автоматически распределяется по месяцам пропорционально реальному спросу.
                    </p>
                  </div>

                  {wordstatResult && (
                    <div className="bg-black/40 border border-stone-800 rounded-lg p-2.5 flex flex-col justify-between text-xs">
                      <div className="flex items-center justify-between text-[11px] text-stone-300 font-medium">
                        <span>Распознано: <b>{wordstatResult.months.length} месяцев</b></span>
                        <span className="text-emerald-400 font-bold">Пик: {wordstatResult.analysis.peakMonth}</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-1">
                        Всего запросов: <b>{wordstatResult.analysis.totalQueries.toLocaleString('ru-RU')}</b>. Размах сезона: <b>×{wordstatResult.analysis.seasonalityMultiplier}</b>.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer with Single Master Action Button */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-[#14161b] flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Quick status summary badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-md font-medium border bg-stone-800 text-stone-300 border-stone-700">
              «{keyword ? (keyword.length > 20 ? keyword.slice(0, 18) + '...' : keyword) : 'Без запроса'}»
            </span>
            <span className="px-2 py-0.5 rounded-md font-medium border bg-stone-800 text-stone-300 border-stone-700">
              {region}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-medium border ${
              hasExistingAccount 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40' 
                : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
            }`}>
              {hasExistingAccount ? 'Аккаунт: Есть' : 'Без аккаунта'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-700 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleApplyAll}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Применить данные в отчёт</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
