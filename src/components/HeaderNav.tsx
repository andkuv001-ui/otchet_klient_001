import React, { useState } from 'react';
import { ReportData } from '../types/report';
import { ALL_NICHES, REFERENCE_AC_REPORT } from '../data/niches';
import { generateStandaloneHtml } from '../services/htmlExporter';
import { 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  Printer, 
  Sparkles, 
  Edit3, 
  Eye, 
  FileCode, 
  RotateCcw,
  Layers,
  ChevronDown,
  Monitor,
  FileSpreadsheet,
  SlidersHorizontal
} from 'lucide-react';

interface HeaderNavProps {
  currentReport: ReportData;
  onSelectNiche: (report: ReportData) => void;
  viewMode: 'client' | 'interactive' | 'edit';
  onChangeViewMode: (mode: 'client' | 'interactive' | 'edit') => void;
  onOpenAiModal: () => void;
  onResetToBaseline: () => void;
  onOpenUnifiedModal: (tab?: 'sheet' | 'geo' | 'photo' | 'wordstat') => void;
  hasParsedData?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentReport,
  onSelectNiche,
  viewMode,
  onChangeViewMode,
  onOpenAiModal,
  onResetToBaseline,
  onOpenUnifiedModal,
  hasParsedData = false
}) => {
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [showNicheDropdown, setShowNicheDropdown] = useState(false);

  // Download standalone HTML matching the user's reference format
  const handleDownloadHtml = () => {
    const htmlContent = generateStandaloneHtml(currentReport);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `niche_report_${currentReport.id}_${currentReport.nicheKey || 'audit'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open standalone HTML in clean window
  const handleOpenHtmlWindow = () => {
    const htmlContent = generateStandaloneHtml(currentReport);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  // Copy full HTML code
  const handleCopyHtmlCode = () => {
    const htmlContent = generateStandaloneHtml(currentReport);
    navigator.clipboard.writeText(htmlContent);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2200);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#16181d] text-white border-b border-stone-800 shadow-md">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left: Branding & Niche Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              NicheReport 2.0
            </span>
            <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-800 text-emerald-400 border border-stone-700">
              Эталон Zollerz
            </span>
          </div>

          {/* Niche Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNicheDropdown(!showNicheDropdown)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-colors cursor-pointer text-stone-200"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[140px] sm:max-w-[200px] truncate">
                {currentReport.nicheName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {showNicheDropdown && (
              <div 
                className="absolute left-0 top-full mt-1.5 w-[280px] sm:w-[320px] bg-stone-900 border border-stone-700 rounded-xl shadow-2xl py-2 z-50 text-stone-200"
                onClick={() => setShowNicheDropdown(false)}
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Готовые эталонные ниши:
                </div>

                {ALL_NICHES.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onSelectNiche(n)}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-800 transition-colors flex items-center justify-between ${
                      currentReport.id === n.id ? 'bg-emerald-950/60 text-emerald-300 font-bold' : ''
                    }`}
                  >
                    <div>
                      <div className="leading-snug">{n.nicheName}</div>
                      <div className="text-[10px] text-stone-400">{n.city} · {n.kicker.split('·')[0]}</div>
                    </div>
                    {currentReport.id === n.id && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}

                <div className="border-t border-stone-800 mt-1 pt-1 px-2">
                  <button
                    onClick={onOpenAiModal}
                    className="w-full text-left px-2 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/50 rounded-lg flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Сгенерировать другую нишу (AI 2.0)...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PRIMARY ONE-BUTTON DATA LOADER */}
          <button
            onClick={() => onOpenUnifiedModal('sheet')}
            className={`flex items-center gap-2 text-xs font-bold px-3 sm:px-3.5 py-1.5 rounded-xl transition-all shadow-md cursor-pointer ${
              hasParsedData 
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border border-emerald-400/50 shadow-emerald-950/40 ring-1 ring-emerald-400/40' 
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-500/40'
            }`}
            title="Загрузить входные данные отчёта (Таблица / CSV, Фото, Вордстат, Город, Запрос)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-200" />
            <span>Загрузить данные</span>
            {hasParsedData && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs font-medium">
          <button
            onClick={() => onChangeViewMode('client')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'client' 
                ? 'bg-emerald-600 text-white font-semibold shadow-xs' 
                : 'text-stone-300 hover:text-white'
            }`}
            title="Чистый отчёт как на сайте по ссылке"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Клиентский вид</span>
          </button>

          <button
            onClick={() => onChangeViewMode('interactive')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'interactive' 
                ? 'bg-[#0f6e6a] text-white font-semibold shadow-xs' 
                : 'text-stone-300 hover:text-white'
            }`}
            title="Интерактивные расчеты, чек-листы и копирование"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Интерактив 2.0</span>
          </button>

          <button
            onClick={() => onChangeViewMode('edit')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'edit' 
                ? 'bg-amber-600 text-white font-semibold shadow-xs' 
                : 'text-stone-300 hover:text-white'
            }`}
            title="Редактировать значения и текст отчета"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Редактор</span>
          </button>
        </div>

        {/* Right: Export & Output actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Download HTML */}
          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer"
            title="Скачать самостоятельный автономный HTML-файл (точно как по ссылке)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Скачать HTML</span>
          </button>

          {/* Open standalone HTML in new window */}
          <button
            onClick={handleOpenHtmlWindow}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
            title="Открыть автономный HTML в отдельной вкладке"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Открыть HTML</span>
          </button>

          {/* Copy HTML code */}
          <button
            onClick={handleCopyHtmlCode}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
            title="Скопировать чистый HTML-код страницы"
          >
            {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedHtml ? 'Код скопирован' : 'Код HTML'}</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={() => window.print()}
            className="hidden md:flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
            title="Распечатать или сохранить в PDF"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* AI Generator button */}
          <button
            onClick={onOpenAiModal}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 text-white transition-opacity shadow-xs cursor-pointer"
            title="Сгенерировать отчёт по любой нише с AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Ниша</span>
          </button>

          {/* Reset to baseline button */}
          <button
            onClick={onResetToBaseline}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors cursor-pointer"
            title="Сбросить к исходному эталону (Кондиционеры / Оренбург Задание 13718)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </nav>
  );
};
