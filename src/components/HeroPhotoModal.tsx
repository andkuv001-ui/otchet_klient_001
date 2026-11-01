import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  X, 
  Check, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface HeroPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string;
  currentCaption: string;
  onSave: (newImage: string, newCaption: string) => void;
  nicheName?: string;
}

const PRESET_GALLERY = [
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
    caption: 'Главное фото: мастер на реальном объекте с лазерным осепостроителем. Видно культуру производства, чистоту и профессиональный уровень бригады.'
  },
  {
    title: 'Кухни и мебель на заказ',
    url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    caption: 'Главное фото: готовая кухня в скандинавском стиле без ручек с подсветкой столешницы. Реальный кадр монтажника в СПб.'
  }
];

export const HeroPhotoModal: React.FC<HeroPhotoModalProps> = ({
  isOpen,
  onClose,
  currentImage,
  currentCaption,
  onSave,
  nicheName
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [imageUrl, setImageUrl] = useState(currentImage);
  const [caption, setCaption] = useState(currentCaption);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    onSave(imageUrl.trim(), caption.trim());
    onClose();
  };

  const handleSelectPreset = (preset: typeof PRESET_GALLERY[0]) => {
    setImageUrl(preset.url);
    setCaption(preset.caption);
    setPreviewError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#1c1f26] border border-stone-700 text-stone-100 rounded-2xl w-full max-w-[680px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white m-0">
                Образец главного фото для отчёта
              </h3>
              <p className="text-xs text-stone-400 m-0">
                Загрузите своё фото с объекта или укажите ссылку на изображение
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

        {/* Tabs */}
        <div className="flex items-center border-b border-stone-800 bg-stone-900/40 px-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Загрузить с устройства</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Указать ссылку (URL)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'border-emerald-400 text-emerald-300 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Готовые образцы</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleApply} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-700 hover:border-emerald-500/80 bg-stone-900/70 hover:bg-stone-900 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    Нажмите для выбора файла с фото
                  </span>
                  <span className="text-xs text-stone-400 block mt-0.5">
                    Поддерживаются JPG, PNG, WebP (фото мастера за работой, выполненный объект)
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Tab 2: URL */}
          {activeTab === 'url' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-300">
                Прямая ссылка на фото (URL):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setPreviewError(false);
                  }}
                  className="flex-1 text-xs sm:text-sm bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-white placeholder:text-stone-500 focus:outline-emerald-500"
                />
              </div>
              <p className="text-[11px] text-stone-400">
                Можно использовать ссылки с хостингов изображений, Яндекс Диска (прямые ссылки), Unsplash или собственного сайта.
              </p>
            </div>
          )}

          {/* Tab 3: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-300">
                Выберите подходящий отраслевой образец:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {PRESET_GALLERY.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    className={`border rounded-xl p-2.5 bg-stone-900 cursor-pointer transition-all flex flex-col gap-2 ${
                      imageUrl === p.url 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
                        : 'border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="h-28 bg-stone-950 rounded-lg overflow-hidden relative">
                      <img 
                        src={p.url} 
                        alt={p.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      {imageUrl === p.url && (
                        <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white p-1 rounded-full shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-stone-200 truncate">
                      {p.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Live Preview Box */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center">
            <div className="w-full sm:w-48 h-32 bg-stone-900 rounded-lg overflow-hidden shrink-0 border border-stone-800 flex items-center justify-center relative">
              {imageUrl && !previewError ? (
                <img
                  src={imageUrl}
                  alt="Предпросмотр"
                  className="w-full h-full object-cover"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <div className="text-center p-2 text-stone-500 text-xs">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <span>Фото не загружено</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5 w-full">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Текущий предпросмотр образца
              </span>
              <p className="text-[11px] text-stone-400 m-0 leading-normal">
                Это фото будет отображаться в главном блоке отчёта (Hero), экспортироваться в автономный HTML и в PDF-версию.
              </p>
            </div>
          </div>

          {/* Caption (Figcaption) input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300">
              Подпись к фото (рекомендация для клиента):
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Например: Образец композиции главного фото: мастер за работой в чистой квартире, видна аккуратность и профессионализм..."
              className="w-full text-xs sm:text-sm bg-stone-900 border border-stone-700 rounded-xl p-3 text-white placeholder:text-stone-500 focus:outline-emerald-500 resize-none leading-relaxed"
            />
            <p className="text-[11px] text-stone-400">
              Поясняет заказчику, почему выбрана именно такая композиция и как она повышает конверсию из поиска в клик.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Применить фото к отчёту</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
