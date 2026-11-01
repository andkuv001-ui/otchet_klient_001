import React, { useState } from 'react';
import { X, TrendingUp, Sparkles, Check, HelpCircle, FileText, BarChart3, AlertCircle, ArrowUpRight } from 'lucide-react';
import { parseWordstatText, DEFAULT_WORDSTAT_SAMPLE } from '../services/wordstatParser';
import { MonthData, SeasonPeriod, WordstatAnalysis } from '../types/report';

interface WordstatModalProps {
  isOpen: boolean;
  onClose: () => void;
  annualBudgetRub: number;
  currentKeyword?: string;
  currentRegion?: string;
  currentRawText?: string;
  onApply: (data: {
    months: MonthData[];
    periods: SeasonPeriod[];
    note: string;
    annualBudgetRub: number;
    wordstatAnalysis: WordstatAnalysis;
    keyword: string;
    region: string;
    rawText: string;
  }) => void;
}

export function WordstatModal({
  isOpen,
  onClose,
  annualBudgetRub,
  currentKeyword = '',
  currentRegion = '',
  currentRawText = '',
  onApply,
}: WordstatModalProps) {
  const [rawText, setRawText] = useState(currentRawText || DEFAULT_WORDSTAT_SAMPLE);
  const [budget, setBudget] = useState(annualBudgetRub || 180000);
  const [keyword, setKeyword] = useState(currentKeyword || 'монтаж кондиционера');
  const [region, setRegion] = useState(currentRegion || 'Оренбург');
  const [showHowTo, setShowHowTo] = useState(false);

  if (!isOpen) return null;

  // Real-time parsing of current raw text
  const parseResult = parseWordstatText(rawText, budget, keyword, region);

  const handleApply = () => {
    if (!parseResult) return;
    onApply({
      months: parseResult.months,
      periods: parseResult.periods,
      note: parseResult.note,
      annualBudgetRub: budget,
      wordstatAnalysis: parseResult.analysis,
      keyword,
      region,
      rawText,
    });
    onClose();
  };

  const handlePasteSample = () => {
    setRawText(DEFAULT_WORDSTAT_SAMPLE);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-[#e3dfd6] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e3dfd6] flex items-center justify-between bg-[#faf9f6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0f6e6a]/10 text-[#0f6e6a] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#16181d] m-0 flex items-center gap-2">
                4. Продвижение с учётом сезона: Данные Яндекс Вордстат
                <span className="text-[11px] font-semibold bg-[#e9f3f1] text-[#0f6e6a] px-2 py-0.5 rounded-full">
                  2.0 Pro
                </span>
              </h2>
              <p className="text-xs text-[#5d6470] m-0">
                Построение интерактивного графика поискового спроса и помесячного распределения бюджета
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-[#16181d] hover:bg-stone-200/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Top Options Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#faf9f6] p-3.5 rounded-xl border border-[#e3dfd6]">
            <div>
              <label className="block text-[11px] font-bold text-[#5d6470] uppercase tracking-wider mb-1">
                Ключевая фраза (Вордстат)
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="напр. монтаж кондиционера"
                className="w-full text-xs sm:text-sm font-medium px-2.5 py-1.5 bg-white border border-[#e3dfd6] rounded-lg focus:outline-none focus:border-[#0f6e6a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5d6470] uppercase tracking-wider mb-1">
                Регион / Локация
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="напр. Оренбург или Москва"
                className="w-full text-xs sm:text-sm font-medium px-2.5 py-1.5 bg-white border border-[#e3dfd6] rounded-lg focus:outline-none focus:border-[#0f6e6a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5d6470] uppercase tracking-wider mb-1">
                Годовой рекламный бюджет (₽)
              </label>
              <input
                type="number"
                step="10000"
                min="10000"
                value={budget}
                onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-xs sm:text-sm font-bold font-mono text-[#0f6e6a] px-2.5 py-1.5 bg-white border border-[#e3dfd6] rounded-lg focus:outline-none focus:border-[#0f6e6a]"
              />
            </div>
          </div>

          {/* Quick Helper Button & Instructions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#16181d] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0f6e6a]" />
                Поле ввода таблицы Вордстат (История запросов)
              </span>
              <button
                type="button"
                onClick={() => setShowHowTo(!showHowTo)}
                className="text-[11px] text-[#0f6e6a] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                {showHowTo ? 'Скрыть подсказку' : 'Как скопировать из Вордстат?'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteSample}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#e9f3f1] text-[#0f6e6a] hover:bg-[#0f6e6a] hover:text-white transition-colors cursor-pointer border border-[#0f6e6a]/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Вставить пример из ТЗ (13 мес.)
              </button>
              <button
                type="button"
                onClick={() => setRawText('')}
                className="text-xs text-stone-500 hover:text-rose-600 px-2 py-1 transition-colors cursor-pointer"
              >
                Очистить
              </button>
            </div>
          </div>

          {/* Collapsible How-To Box */}
          {showHowTo && (
            <div className="bg-[#e9f3f1]/60 border border-[#0f6e6a]/30 rounded-xl p-3 text-xs text-[#24272c] space-y-1.5 animate-in fade-in">
              <p className="font-semibold text-[#0f6e6a] m-0">Инструкция по копированию из Яндекс Вордстат (wordstat.yandex.ru):</p>
              <ol className="list-decimal pl-4 space-y-1 text-[#4a505b]">
                <li>Перейдите во вкладку <b>«История запросов»</b> (Помесячно) и укажите нужный регион.</li>
                <li>Выделите строки таблицы мышкой (начиная со столбца «Месяц» до «Доля запросов») и нажмите <b>Ctrl + C</b>.</li>
                <li>Вставьте текст в поле ниже через <b>Ctrl + V</b>. Система автоматически распознает табуляцию, пробелы и запятые в долях.</li>
              </ol>
            </div>
          )}

          {/* Text Area for Pasting Raw Rows */}
          <div className="relative">
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="сентябрь 2025&#9;3 281&#9;0,000029&#10;октябрь 2025&#9;2 385&#9;0,000020&#10;ноябрь 2025&#9;1 742&#9;0,000015..."
              className="w-full font-mono text-xs sm:text-[13px] leading-relaxed p-3.5 bg-[#faf9f6] border border-[#e3dfd6] rounded-xl focus:outline-none focus:border-[#0f6e6a] focus:bg-white resize-y"
            />
            <div className="absolute right-3 bottom-3 text-[11px] text-[#5d6470] bg-white/90 px-2 py-0.5 rounded shadow-2xs border border-[#e3dfd6]">
              {parseResult ? ` Успешно распознано: ${parseResult.months.length} мес.` : ' Ожидание ввода строк...'}
            </div>
          </div>

          {/* Realtime Parsed Preview & Analytics */}
          {parseResult ? (
            <div className="space-y-4 pt-1">
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-[#faf9f6] border border-[#e3dfd6] rounded-xl p-3">
                  <span className="text-[11px] font-semibold text-[#5d6470] block">Суммарный спрос</span>
                  <b className="text-base sm:text-lg font-bold text-[#16181d]">
                    {parseResult.analysis.totalQueries.toLocaleString('ru-RU')}
                  </b>
                  <span className="text-[10px] text-[#5d6470] block mt-0.5">за {parseResult.months.length} мес.</span>
                </div>

                <div className="bg-[#faf9f6] border border-[#e3dfd6] rounded-xl p-3">
                  <span className="text-[11px] font-semibold text-[#5d6470] block">Ср. спрос в месяц</span>
                  <b className="text-base sm:text-lg font-bold text-[#16181d]">
                    {parseResult.analysis.avgQueries.toLocaleString('ru-RU')}
                  </b>
                  <span className="text-[10px] text-[#5d6470] block mt-0.5">запросов / мес</span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[11px] font-semibold text-emerald-800 block">Пик спроса</span>
                  <b className="text-base sm:text-lg font-bold text-emerald-900">
                    {parseResult.analysis.peakQueries.toLocaleString('ru-RU')}
                  </b>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 truncate font-medium">
                    {parseResult.analysis.peakMonth}
                  </span>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                  <span className="text-[11px] font-semibold text-amber-800 block">Минимум спроса</span>
                  <b className="text-base sm:text-lg font-bold text-amber-900">
                    {parseResult.analysis.troughQueries.toLocaleString('ru-RU')}
                  </b>
                  <span className="text-[10px] text-amber-700 block mt-0.5 truncate font-medium">
                    {parseResult.analysis.troughMonth}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-[#e9f3f1] border border-[#0f6e6a]/30 rounded-xl p-3">
                  <span className="text-[11px] font-semibold text-[#0f6e6a] block">Сезонный размах</span>
                  <b className="text-base sm:text-lg font-bold text-[#0f6e6a]">
                    {parseResult.analysis.seasonalityMultiplier}x
                  </b>
                  <span className="text-[10px] text-[#0f6e6a] block mt-0.5">пик / спад</span>
                </div>
              </div>

              {/* Parsed Month-by-Month Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#16181d] m-0 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[#0f6e6a]" />
                    Предпросмотр распределения бюджета по данным Вордстат
                  </h3>
                  <span className="text-xs font-bold text-[#0f6e6a]">
                    Сумма долей: {parseResult.months.reduce((a, b) => a + b.percent, 0).toFixed(1)}% (100% бюджета)
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#e3dfd6] rounded-xl max-h-56">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#faf9f6] text-[#5d6470] border-b border-[#e3dfd6] sticky top-0 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Месяц</th>
                        <th className="py-2 px-3 text-right">Запросов Вордстат</th>
                        <th className="py-2 px-3 text-right">Доля в поиске</th>
                        <th className="py-2 px-3 text-right">Доля бюджета</th>
                        <th className="py-2 px-3 text-right">Бюджет в рублях</th>
                        <th className="py-2 px-3 text-center">Фаза сезона</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e3dfd6]/60 bg-white">
                      {parseResult.months.map((m, idx) => (
                        <tr key={idx} className="hover:bg-stone-50 transition-colors">
                          <td className="py-1.5 px-3 font-medium text-[#16181d]">
                            {m.month}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#16181d]">
                            {m.queries?.toLocaleString('ru-RU')}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-[#5d6470]">
                            {m.share ? m.share.toFixed(6) : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-[#0f6e6a]">
                            {m.percent} %
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#16181d]">
                            {m.budgetRub?.toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {m.seasonLevel === 'high' ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                                 Пик спроса
                              </span>
                            ) : m.seasonLevel === 'low' ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-100 text-stone-600">
                                ❄️ Спад
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                                ⚖️ Стандарт
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <b className="block">Не удалось распознать формат строк</b>
                <span className="text-amber-800">
                  Убедитесь, что каждая строка содержит название месяца и число запросов, например: 
                  <code className="mx-1 bg-amber-100/80 px-1.5 py-0.5 rounded font-mono">сентябрь 2025	3 281	0,000029</code>.
                  Нажмите кнопку «Вставить пример из ТЗ» для автоматического заполнения.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#e3dfd6] bg-[#faf9f6] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl text-[#5d6470] hover:text-[#16181d] hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            type="button"
            disabled={!parseResult}
            onClick={handleApply}
            className={`inline-flex items-center gap-2 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm ${
              parseResult
                ? 'bg-[#0f6e6a] text-white hover:bg-[#0c5956] cursor-pointer'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Применить график в отчёт
          </button>
        </div>
      </div>
    </div>
  );
}
