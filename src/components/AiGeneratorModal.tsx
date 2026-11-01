import React, { useState } from 'react';
import { generateReportWithAi } from '../services/aiGenerator';
import { ReportData } from '../types/report';
import { Sparkles, X, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportGenerated: (report: ReportData) => void;
}

const PRESET_IDEAS = [
  { niche: 'Автосервис, кузовной ремонт и покраска', city: 'Казань', platform: 'Авито' },
  { niche: 'Юрист по банкротству физлиц и списанию долгов', city: 'Екатеринбург', platform: 'Авито' },
  { niche: 'Бурение скважин на воду и обустройство септиков', city: 'Уфа', platform: 'Авито' },
  { niche: 'Химчистка мягкой мебели и ковров на дому', city: 'Краснодар', platform: 'Яндекс Услуги' },
  { niche: 'Электрик: монтаж проводки в коттеджах', city: 'Новосибирск', platform: 'Профи.ру' }
];

export const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({
  isOpen,
  onClose,
  onReportGenerated
}) => {
  const [nicheName, setNicheName] = useState('');
  const [city, setCity] = useState('Москва');
  const [platform, setPlatform] = useState('Авито');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nicheName.trim()) {
      setError('Пожалуйста, укажите нишу или услугу');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const generated = await generateReportWithAi({
        nicheName: nicheName.trim(),
        city: city.trim() || 'Москва',
        platform: platform || 'Авито',
        notes: notes.trim()
      });
      onReportGenerated(generated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Не удалось сгенерировать отчет. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_IDEAS[0]) => {
    setNicheName(preset.niche);
    setCity(preset.city);
    setPlatform(preset.platform);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1c1f26] border border-stone-700 text-stone-100 rounded-2xl w-full max-w-[620px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0">
                Генератор отчетов по любой нише 2.0
              </h3>
              <p className="text-xs text-stone-400 m-0">
                Создаёт аудит, 3 образца объявлений и сезонный медиаплан в эталонном формате
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

        {/* Modal Body */}
        <form onSubmit={handleGenerate} className="p-5 space-y-4 overflow-y-auto">
          
          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1.5 uppercase tracking-wider">
              Быстрые примеры для проверки:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_IDEAS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectPreset(p)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors cursor-pointer text-left"
                >
                  {p.niche.split(',')[0]} ({p.city})
                </button>
              ))}
            </div>
          </div>

          {/* Niche Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Ниша или услуга клиента <span className="text-emerald-400">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Например: Автосервис и детейлинг, Монтаж септиков, Бурение скважин..."
              value={nicheName}
              onChange={(e) => setNicheName(e.target.value)}
              className="w-full text-sm bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-white placeholder:text-stone-500 focus:outline-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* City & Platform Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                <span>Город / Регион оказания услуг</span>
                <span className="text-[10px] text-emerald-400 font-normal">Любой город РФ</span>
              </label>
              <input 
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Санкт-Петербург, Москва, Казань, Оренбург, Краснодар, Екатеринбург..."
                className="w-full text-sm bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2 text-white placeholder:text-stone-500 focus:outline-emerald-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[
                  'Санкт-Петербург', 'Москва', 'Казань', 'Екатеринбург', 
                  'Краснодар', 'Оренбург', 'Новосибирск', 'Нижний Новгород', 
                  'Самара', 'Ростов-на-Дону', 'Уфа', 'Тюмень', 'Пермь', 'Воронеж', 'Сочи'
                ].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCity(c)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      city.toLowerCase() === c.toLowerCase()
                        ? 'bg-emerald-800 text-white border-emerald-500 font-bold'
                        : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Платформа
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full text-sm bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2 text-white focus:outline-emerald-500"
              >
                <option value="Авито">Авито</option>
                <option value="Авито Pro">Авито Pro</option>
                <option value="Яндекс Услуги">Яндекс Услуги</option>
                <option value="Профи.ру">Профи.ру</option>
                <option value="ВКонтакте">ВКонтакте</option>
              </select>
            </div>
          </div>

          {/* Additional details */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Заметки или пожелания (необязательно)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Например: 'Клиент жалуется, что клики есть, но звонят только по мелочам. Нужно сделать акцент на комплексных услугах с чеком от 50 000 руб'..."
              className="w-full text-sm bg-stone-900 border border-stone-700 rounded-xl p-3 text-white placeholder:text-stone-500 focus:outline-emerald-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Формируем отчёт 2.0...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Сгенерировать отчёт</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
