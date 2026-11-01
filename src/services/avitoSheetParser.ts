import { AvitoSearchItem, SearchMarketAnalysis } from '../types/avitoParser';
import { ReportData, CalcRow, SearchViewsSummary, PaidServiceItem, SampleAd, PriceTier } from '../types/report';
import { parseWordstatText, DEFAULT_WORDSTAT_SAMPLE } from './wordstatParser';
import { SAMPLE_AC_ORENBURG_CSV } from '../data/acSampleCsv';

/**
 * Robust RFC 4180 CSV / TSV parser handling multiline quotes and commas
 */
export function parseCsv(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  // Detect separator: comma or tab
  const firstLine = text.slice(0, text.indexOf('\n'));
  const separator = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      cell = '';
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  return lines;
}

/**
 * Convert parsed rows to typed AvitoSearchItem objects
 */
export function parseAvitoCsv(csvText: string): AvitoSearchItem[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  
  const findCol = (positivePatterns: string[], negativePatterns: string[] = []): number => {
    // 1. Exact match first
    for (const pat of positivePatterns) {
      const idx = headers.findIndex(h => h === pat);
      if (idx >= 0 && !negativePatterns.some(neg => headers[idx].includes(neg))) {
        return idx;
      }
    }
    // 2. Contains match with negative filters
    for (const pat of positivePatterns) {
      const idx = headers.findIndex(h => {
        if (!h.includes(pat)) return false;
        if (negativePatterns.some(neg => h.includes(neg))) return false;
        return true;
      });
      if (idx >= 0) return idx;
    }
    return -1;
  };

  // Find column indexes with strict anti-collision patterns
  const colSearchQuery = findCol(
    ['поисковый запрос', 'поисковая фраза', 'ключевой запрос', 'ключевое слово', 'запрос', 'поиск', 'search query', 'query', 'keyword'],
    ['id', 'url', 'ссылка', 'дата', 'время']
  );

  const colSellerUrl = findCol(
    ['ссылка на продавца', 'url продавца', 'профиль продавца', 'seller url'],
    ['объявление', 'объявления']
  );

  const colSellerName = findCol(
    ['название продавца', 'имя продавца', 'продавец', 'магазин', 'компания', 'автор', 'контактное лицо', 'seller'],
    ['ссылка', 'url', 'объявление', 'объявления', 'заголовок']
  );

  const colVerified = findCol(['документы проверены', 'проверены', 'верификац', 'паспорт']);
  const colAdsCount = findCol(['кол-во объявлений', 'количество объявлений', 'объявлений у продавца', 'всего объявлений']);
  const colRating = findCol(['рейтинг', 'оценка', 'stars']);
  const colReviews = findCol(['отзывы', 'отзывов', 'кол-во отзывов']);

  const colAdUrl = findCol(
    ['ссылка на объявление', 'url объявления', 'ссылка объявления', 'ad url'],
    ['продавца', 'seller', 'профиль', 'магазин']
  ) >= 0 ? findCol(
    ['ссылка на объявление', 'url объявления', 'ссылка объявления', 'ad url'],
    ['продавца', 'seller', 'профиль', 'магазин']
  ) : findCol(
    ['ссылка', 'url'],
    ['продавца', 'seller', 'профиль', 'магазин', 'автор']
  );

  const colAvitoId = findCol(['avito id', 'id объявления', 'номер объявления', 'id']);

  // CRITICAL FIX: colTitle must NEVER match seller name/shop/author!
  let colTitle = findCol(
    ['заголовок', 'заголовок объявления', 'название объявления', 'наименование объявления', 'title', 'ad title', 'услуга', 'наименование услуги'],
    ['продавца', 'продавец', 'seller', 'магазин', 'компания', 'автор', 'контакт', 'профиль']
  );
  if (colTitle < 0) {
    colTitle = findCol(
      ['наименование', 'товар', 'объявление'],
      ['продавца', 'продавец', 'seller', 'магазин', 'компания', 'автор', 'контакт', 'профиль', 'ссылка', 'url', 'id', 'дата']
    );
  }

  const colPrice = findCol(['цена', 'стоимость', 'прайс', 'price', 'тариф']);
  const colDescription = findCol(['описание', 'текст', 'описание объявления', 'description']);
  const colAddress = findCol(['адрес', 'город', 'локация', 'регион', 'местоположение', 'address', 'city']);
  const colDate = findCol(['дата публикации', 'дата', 'размещено', 'время', 'date']);
  const colPos = findCol(['позиция объявлений', 'позиция', 'место в выдаче', 'место', 'pos', 'position']);
  const colViewsToday = findCol(['просмотров сегодня', 'сегодня просмотров', 'просмотры сегодня']);
  
  // For total views: check 'всего просмотров' first, then generic 'просмотров', 'просмотры', 'показов', 'показы', 'views'
  let colViewsTotal = findCol(['всего просмотров', 'всего просмотры', 'общие просмотры']);
  if (colViewsTotal < 0) {
    colViewsTotal = findCol(['кол-во просмотров', 'количество просмотров', 'просмотров', 'просмотры', 'показов', 'показы', 'views', 'охват']);
  }
  const colPaid = findCol(['платные услуги', 'платные сервисы', 'услуги продвижения', 'продвижение', 'платное', 'пакет услуг', 'пакет', 'vas']);
  const colHours = findCol(['график работы', 'время работы', 'режим работы', 'часы работы']);
  const colCamera = findCol(['камера', 'видеонаблюдение']);
  const colCategory = findCol(['категория', 'раздел', 'подкатегория', 'рубрика']);
  const colExp = findCol(['опыт', 'стаж']);
  const colServiceType = findCol(['тип автосервиса', 'тип услуги', 'специализация', 'вид']);

  const items: AvitoSearchItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 5) continue;

    const rawRating = colRating >= 0 ? r[colRating] : '0';
    const cleanRating = parseFloat(rawRating?.replace(',', '.') || '0') || 0;

    const rawPrice = colPrice >= 0 ? r[colPrice] : '0';
    const cleanPrice = parseInt(rawPrice?.replace(/\D/g, '') || '0', 10) || 0;

    const rawReviews = colReviews >= 0 ? r[colReviews] : '0';
    const cleanReviews = parseInt(rawReviews?.replace(/\D/g, '') || '0', 10) || 0;

    const rawViewsToday = colViewsToday >= 0 ? r[colViewsToday] : '0';
    const cleanViewsToday = parseInt(rawViewsToday?.replace(/\D/g, '') || '0', 10) || 0;

    const rawViewsTotal = colViewsTotal >= 0 ? r[colViewsTotal] : '0';
    const cleanViewsTotal = parseInt(rawViewsTotal?.replace(/\D/g, '') || '0', 10) || 0;

    const rawPos = colPos >= 0 ? r[colPos] : `${i}`;
    const cleanPos = parseInt(rawPos?.replace(/\D/g, '') || `${i}`, 10) || i;

    const rawSearchQuery = colSearchQuery >= 0 ? (r[colSearchQuery] || '').trim() : '';

    const item: AvitoSearchItem = {
      sellerUrl: colSellerUrl >= 0 ? r[colSellerUrl] || '' : '',
      sellerName: colSellerName >= 0 ? r[colSellerName] || 'Продавец Авито' : 'Продавец Авито',
      verifiedDocs: colVerified >= 0 && (r[colVerified]?.toLowerCase().includes('проверены') || r[colVerified]?.toLowerCase().includes('да')),
      adsCount: colAdsCount >= 0 ? (parseInt(r[colAdsCount], 10) || 1) : 1,
      rating: cleanRating,
      reviews: cleanReviews,
      adUrl: colAdUrl >= 0 ? r[colAdUrl] || '' : '',
      avitoId: colAvitoId >= 0 ? r[colAvitoId] || '' : '',
      title: colTitle >= 0 ? r[colTitle] || 'Объявление' : 'Объявление',
      price: cleanPrice,
      description: colDescription >= 0 ? r[colDescription] || '' : '',
      address: colAddress >= 0 ? r[colAddress] || '' : '',
      publishDate: colDate >= 0 ? r[colDate] || '' : '',
      position: cleanPos,
      viewsToday: cleanViewsToday,
      viewsTotal: cleanViewsTotal,
      paidPromo: colPaid >= 0 ? r[colPaid] || '' : '',
      workingHours: colHours >= 0 ? r[colHours] || '' : '',
      camera: colCamera >= 0 ? r[colCamera] || '' : '',
      category: colCategory >= 0 ? r[colCategory] || '' : '',
      experience: colExp >= 0 ? r[colExp] || '' : '',
      serviceType: colServiceType >= 0 ? r[colServiceType] || '' : '',
      searchQuery: rawSearchQuery
    };

    items.push(item);
  }

  return items;
}

/**
 * Extract statistical market analysis from the search items
 */
export function analyzeAvitoSearch(
  items: AvitoSearchItem[], 
  overrideKeyword?: string, 
  overrideRegion?: string
): SearchMarketAnalysis {
  if (items.length === 0) {
    return {
      keyword: overrideKeyword || 'Услуги',
      region: overrideRegion || 'Россия',
      totalAds: 0,
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0,
      avgRating: 0,
      verifiedPercent: 0,
      paidPromoPercent: 0,
      totalViews: 0,
      avgViewsPerAd: 0,
      topSellers: [],
      commonServices: []
    };
  }

  // Detect Region from addresses or overrides
  let detectedRegion = overrideRegion?.trim() || '';
  if (!detectedRegion) {
    const cityCounts: Record<string, number> = {};
    items.forEach(it => {
      const match = it.address.match(/(Санкт-Петербург|Москва|Казань|Екатеринбург|Новосибирск|Оренбург|Краснодар|Самара|Нижний Новгород|Уфа|Тюмень|Пермь|Воронеж|Ростов-на-Дону|Челябинск|Волгоград|Красноярск|Саратов|Тольятти|Барнаул|Ижевск|Ульяновск|Владивосток|Ярославль|Иркутск|Хабаровск|Сочи|Ставрополь|Калининград|Сургут|Тверь|Белгород|Курск|Рязань|Астрахань|Пенза|Липецк|Киров|Тула|Чебоксары)/i);
      if (match) {
        cityCounts[match[0]] = (cityCounts[match[0]] || 0) + 1;
      } else if (it.address.includes(',')) {
        const part = it.address.split(',')[0].replace(/г\.|город\s+/i, '').trim();
        if (part && part.length < 25) {
          cityCounts[part] = (cityCounts[part] || 0) + 1;
        }
      }
    });
    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
    detectedRegion = sortedCities.length > 0 ? sortedCities[0][0] : 'Москва';
  }

  // Detect Keyword (Search Query / Направление) from explicit query, patterns, titles or categories
  let detectedKeyword = overrideKeyword?.trim() || '';

  // 1. If table has an explicit search query column, use the first non-empty value
  if (!detectedKeyword) {
    const fromSearchCol = items.find(it => it.searchQuery && it.searchQuery.trim())?.searchQuery?.trim();
    if (fromSearchCol && fromSearchCol.length > 2) {
      detectedKeyword = fromSearchCol;
    }
  }

  // 2. Detect from titles using high-precision niche patterns
  if (!detectedKeyword) {
    const titlesConcat = items.map(it => it.title.toLowerCase()).join(' ');
    
    // Niche patterns
    const patterns: [RegExp, string][] = [
      [/монтаж кондиционер|установк.*кондиционер|сплит-систем/i, 'Монтаж кондиционеров'],
      [/заправк.*кондиционер|чистк.*кондиционер|ремонт кондиционер/i, 'Ремонт и заправка кондиционеров'],
      [/детейлинг/i, 'Детейлинг авто'],
      [/полировк/i, 'Полировка авто'],
      [/химчистк/i, 'Химчистка авто'],
      [/оклейк.*пленк|бронепленк|антигравийн/i, 'Оклейка авто пленкой'],
      [/шумоизоляц/i, 'Шумоизоляция авто'],
      [/ремонт квартир|отделк.*квартир/i, 'Ремонт квартир'],
      [/натяжн.*потол/i, 'Натяжные потолки'],
      [/ремонт стиральн/i, 'Ремонт стиральных машин'],
      [/ремонт холодильн/i, 'Ремонт холодильников'],
      [/электрик/i, 'Услуги электрика'],
      [/сантехник/i, 'Услуги сантехника'],
      [/клининг|уборк.*квартир/i, 'Клининг и уборка'],
      [/грузоперевоз/i, 'Грузоперевозки'],
      [/эвакуатор/i, 'Услуги эвакуатора'],
      [/кухн.*на заказ/i, 'Кухни на заказ'],
      [/шкаф.*купе/i, 'Шкафы-купе на заказ'],
      [/пластиков.*окн|окна пвх/i, 'Пластиковые окна'],
      [/банкротств/i, 'Банкротство физлиц'],
      [/юрист|юридическ/i, 'Юридические услуги'],
      [/бурени.*скважин/i, 'Бурение скважин'],
      [/кровл|ремонт крыш/i, 'Кровельные работы'],
      [/фундамент/i, 'Строительство фундаментов'],
      [/автосервис|ремонт авто/i, 'Ремонт авто']
    ];

    for (const [regex, kw] of patterns) {
      if (regex.test(titlesConcat)) {
        detectedKeyword = kw;
        break;
      }
    }

    if (!detectedKeyword) {
      // Check first meaningful category
      const cat = items.find(it => it.category && it.category.trim() && !it.category.includes('Все объявления') && !it.category.includes('Предложение') && !it.category.includes('Услуги'))?.category;
      if (cat) {
        detectedKeyword = cat.trim();
      } else {
        // Fallback: take clean version of first real ad title, strictly excluding personal names
        const personalNamePattern = /^(михаил|александр|сергей|андрей|дмитрий|иван|алексей|максим|владимир|евгений|роман|артем|денис|игорь|павел|николай|виктор|олег|антон|константин|владислав|юрий|виталий|руслан|вячеслав|илья|тимур|кирилл|глеб|продавец|частное лицо|мастер|специалист|ип|ооо)\b/i;
        
        const candidate = items.find(it => 
          it.title && 
          it.title !== 'Объявление' && 
          !personalNamePattern.test(it.title.trim())
        );

        if (candidate) {
          detectedKeyword = candidate.title
            .split(/[\/\,\.\-\|\(\)]/)[0]
            .replace(/[\d\+\!\?₽]/g, '')
            .trim();
        }
        
        if (!detectedKeyword || personalNamePattern.test(detectedKeyword)) {
          detectedKeyword = 'Услуги и сервис';
        }
      }
    }
  }

  // Prices
  const validPrices = items.map(it => it.price).filter(p => p > 0).sort((a, b) => a - b);
  const minPrice = validPrices.length > 0 ? validPrices[0] : 0;
  const maxPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1] : 0;
  const avgPrice = validPrices.length > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : 0;
  const medianPrice = validPrices.length > 0 ? validPrices[Math.floor(validPrices.length / 2)] : 0;

  // Ratings & Verification
  const validRatings = items.map(it => it.rating).filter(r => r > 0);
  const avgRating = validRatings.length > 0 ? Number((validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(1)) : 4.9;
  const verifiedCount = items.filter(it => it.verifiedDocs).length;
  const verifiedPercent = Math.round((verifiedCount / items.length) * 100);

  // Paid promotions
  const paidPromoCount = items.filter(it => {
    const p = (it.paidPromo || '').trim().toLowerCase();
    return p !== '' && p !== '-' && p !== '0' && p !== 'нет' && p !== 'false' && p !== 'без услуг';
  }).length;
  const paidPromoPercent = Math.round((paidPromoCount / items.length) * 100);

  // Views (check both viewsTotal and viewsToday)
  const totalViews = items.reduce((acc, it) => acc + (it.viewsTotal || it.viewsToday || 0), 0);
  const avgViewsPerAd = Math.round(totalViews / items.length);

  // Top Sellers
  const sellerMap: Record<string, { count: number; views: number; rating: number; reviews: number; verified: boolean }> = {};
  items.forEach(it => {
    const itemViews = it.viewsTotal || it.viewsToday || 0;
    if (!sellerMap[it.sellerName]) {
      sellerMap[it.sellerName] = { count: 0, views: 0, rating: it.rating, reviews: it.reviews, verified: it.verifiedDocs };
    }
    sellerMap[it.sellerName].count += 1;
    sellerMap[it.sellerName].views += itemViews;
    if (it.reviews > sellerMap[it.sellerName].reviews) sellerMap[it.sellerName].reviews = it.reviews;
  });

  const topSellers = Object.entries(sellerMap)
    .map(([name, data]) => ({
      name,
      adsCount: data.count,
      rating: data.rating,
      reviews: data.reviews,
      totalViews: data.views,
      verified: data.verified
    }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);

  // Common clusters dynamically generated from the items
  const clusterMap: Record<string, { count: number; prices: number[] }> = {};
  items.forEach(it => {
    const cleanTitle = it.title.replace(/<[^>]*>/g, '').split(/[\/\,\.\-\|\(\)]/)[0].trim();
    if (cleanTitle.length > 3) {
      const key = cleanTitle.slice(0, 45);
      if (!clusterMap[key]) clusterMap[key] = { count: 0, prices: [] };
      clusterMap[key].count += 1;
      if (it.price > 0) clusterMap[key].prices.push(it.price);
    }
  });

  const clusters = Object.entries(clusterMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([title, data]) => ({
      title,
      count: data.count,
      avgPrice: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : avgPrice
    }));

  return {
    keyword: detectedKeyword,
    region: detectedRegion,
    totalAds: items.length,
    avgPrice,
    minPrice,
    maxPrice,
    medianPrice,
    avgRating,
    verifiedPercent,
    paidPromoPercent,
    totalViews,
    avgViewsPerAd,
    topSellers,
    commonServices: clusters
  };
}

/**
 * Formats a raw competitor headline into a crisp, magnetic Avito headline
 */
export function formatCompetitorHeadline(rawTitle: string, region: string, keyword: string): string {
  let clean = rawTitle
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/[\!\?]{2,}/g, '!')
    .replace(/\s+/g, ' ')
    .trim();

  // If title is all uppercase, lowercase with initial caps
  if (clean === clean.toUpperCase() && clean.length > 8) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }

  // If title is too brief (under 12 chars), enrich it with the keyword & benefit
  if (clean.length < 12) {
    clean = `${keyword || clean} под ключ с гарантией`;
  }

  // Ensure region is included naturally if not already present
  const hasRegion = new RegExp(region, 'i').test(clean);
  if (!hasRegion && region && region !== 'Россия') {
    if (clean.length < 52) {
      clean = `${clean} в ${region}`;
    }
  }

  return clean;
}

/**
 * Cleans and formats the actual competitor description text from the table row.
 * Keeps the real text, bullet points, equipment, and conditions from the competitor.
 */
export function formatCompetitorBody(
  rawDesc: string,
  title: string,
  price: number,
  region: string,
  keyword: string
): string {
  if (!rawDesc || rawDesc.trim().length < 25) {
    return `${title} в ${region}.\n\n` +
      `Выполняем полный комплекс работ с гарантией по договору.\n` +
      `• Фиксированная цена до начала работ (от ${price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'по согласованию'})\n` +
      `• Квалифицированные специалисты с профильным опытом\n` +
      `• Оплата только после вашей личной проверки и приёмки результата\n` +
      `• Оперативный выезд по всему городу ${region}\n\n` +
      `📞 Напишите в чат Авито — ответим за 3 минуты и рассчитаем точную смету!`;
  }

  // Convert HTML structure to clean markdown / plain text
  let text = rawDesc
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // Clean whitespace and excessive blank lines
  text = text
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If text is extremely long (over 1100 chars), truncate gracefully
  if (text.length > 1100) {
    const cutoff = text.lastIndexOf('\n', 1000);
    if (cutoff > 300) {
      text = text.slice(0, cutoff) + '\n\n...\n📞 Напишите в чат Авито — ответим в течение 3 минут, проконсультируем и рассчитаем точную стоимость!';
    } else {
      text = text.slice(0, 1000) + '...\n\n📞 Напишите в чат Авито — ответим за 3 минуты!';
    }
  }

  return text;
}

/**
 * Synthesizes 3 high-converting sample ads directly based on the top/most effective
 * ads in the parsed search results.
 */
export function buildTopCompetitorSampleAds(
  items: AvitoSearchItem[],
  analysis: SearchMarketAnalysis
): SampleAd[] {
  const getViews = (it: AvitoSearchItem): number => 
    it.viewsTotal > 0 ? it.viewsTotal : (it.viewsToday > 0 ? it.viewsToday * 12 : 0);

  const anchorPriceLow = analysis.minPrice > 0 ? analysis.minPrice : 1500;
  const anchorPriceAvg = analysis.avgPrice > 0 ? analysis.avgPrice : 6500;
  const anchorPriceHigh = analysis.maxPrice > 0 ? Math.min(analysis.maxPrice, anchorPriceAvg * 3) : 15000;

  // 1. Score ads by effectiveness (views, paid services, rating, reviews)
  const scored = items.map((it) => {
    const views = getViews(it);
    const hasPaid = Boolean(it.paidPromo && !/^(нет|-|0|false|без услуг)$/i.test(it.paidPromo.trim()));
    const isXl = hasPaid && /xl/i.test(it.paidPromo);
    const isPromoPack = hasPaid && /продвинуто/i.test(it.paidPromo);
    const hasGoodRating = it.rating >= 4.8;
    const hasReviews = it.reviews > 10;
    const descLen = (it.description || '').length;

    let score = views;
    if (hasPaid) score *= (isXl ? 1.7 : 1.4);
    if (isPromoPack) score *= 1.25;
    if (hasGoodRating) score *= 1.2;
    if (hasReviews) score *= 1.15;
    if (descLen > 250) score *= 1.2;

    return { it, views, score, hasPaid };
  });

  scored.sort((a, b) => b.score - a.score);

  // 2. Select distinct top candidates from the parsed table
  const topViewsCandidate = scored[0];
  const topPaidCandidate = scored.find(s => s.hasPaid && s.it !== topViewsCandidate?.it) || scored[1];
  const topExpressCandidate = scored.find(s => s.it !== topViewsCandidate?.it && s.it !== topPaidCandidate?.it) || scored[2];

  const top1 = topViewsCandidate?.it;
  const top1Views = topViewsCandidate?.views || 0;

  const top2 = topPaidCandidate?.it || top1;
  const top2Views = topPaidCandidate?.views || top1Views;

  const top3 = topExpressCandidate?.it || top2 || top1;
  const top3Views = topExpressCandidate?.views || 0;

  // --- AD 1: Modeled directly after #1 most viewed ad from table ---
  const title1 = top1 
    ? formatCompetitorHeadline(top1.title, analysis.region, analysis.keyword)
    : `${analysis.keyword} под ключ в ${analysis.region}`;
  
  const price1Val = top1 && top1.price > 0 ? top1.price : anchorPriceLow;
  const price1Str = price1Val > 0 
    ? `${price1Val.toLocaleString('ru-RU')} ₽` 
    : 'Цена по договорённости';

  const body1 = top1 
    ? formatCompetitorBody(top1.description, title1, price1Val, analysis.region, analysis.keyword)
    : `Услуги по направлению «${analysis.keyword}» в ${analysis.region}.\nКачественно, с гарантией и фиксированной сметой.`;

  const why1 = top1 && top1Views > 0
    ? `Реальный текст карточки-лидера выдачи: объявление «${top1.title}» продавца «${top1.sellerName}» набрало ${top1Views.toLocaleString('ru-RU')} просмотров${top1.rating ? ` (рейтинг ${top1.rating}⭐)` : ''}. Вся подача, структура работ и условия взяты непосредственно из этого объявления.`
    : `Объявление смоделировано по органическому лидеру выдачи по запросу «${analysis.keyword}» в регионе ${analysis.region}.`;

  // --- AD 2: Modeled directly after top competitor with paid promo from table ---
  const rawTitle2 = top2 ? top2.title : `${analysis.keyword} комплекс под ключ`;
  const title2 = formatCompetitorHeadline(rawTitle2, analysis.region, analysis.keyword);
  const price2Val = top2 && top2.price > 0 ? top2.price : anchorPriceAvg;
  const price2Str = price2Val > 0 
    ? `${price2Val.toLocaleString('ru-RU')} ₽` 
    : 'Цена по договорённости';

  const body2 = top2 
    ? formatCompetitorBody(top2.description, title2, price2Val, analysis.region, analysis.keyword)
    : `Комплексные услуги: ${analysis.keyword} в ${analysis.region}.\nОфициальный договор, поэтапная оплата и гарантия.`;

  const why2 = top2 && (top2.paidPromo || top2Views > 0)
    ? `Реальный текст топового объявления с платным продвижением: «${top2.title}» продавца «${top2.sellerName}» (${top2Views.toLocaleString('ru-RU')} просмотров${top2.paidPromo ? `, пакет: ${top2.paidPromo}` : ''}). Текст и условия соответствуют карточке конкурента из вашей таблицы.`
    : `Шаблон смоделирован по карточке конкурента с платным продвижением в регионе ${analysis.region}.`;

  // --- AD 3: Modeled directly after 3rd distinct competitor from table ---
  const rawTitle3 = top3 ? top3.title : `Срочный заказ: ${analysis.keyword}`;
  const title3 = formatCompetitorHeadline(rawTitle3, analysis.region, analysis.keyword);
  const price3Val = top3 && top3.price > 0 ? top3.price : anchorPriceLow;
  const price3Str = price3Val > 0 
    ? `${price3Val.toLocaleString('ru-RU')} ₽` 
    : 'Цена по договорённости';

  const body3 = top3 
    ? formatCompetitorBody(top3.description, title3, price3Val, analysis.region, analysis.keyword)
    : `Быстрый выезд по направлению «${analysis.keyword}» в ${analysis.region}.\nТочный расчёт в чате за 3 минуты.`;

  const why3 = top3 && top3Views > 0
    ? `Реальный текст карточки конкурента: «${top3.title}» продавца «${top3.sellerName}» (${top3Views.toLocaleString('ru-RU')} просмотров). Демонстрирует подход конкурента к быстрому захвату контакта в выдаче.`
    : `Ориентировано на быстрый контакт и выезд в день обращения в ${analysis.region}.`;

  return [
    {
      id: 'sample_ad_top_views',
      tag: `🔥 Шаблон лидера просмотров (${top1Views > 0 ? `${top1Views.toLocaleString('ru-RU')} просм.` : 'ТОП-1 по охвату'} · ${top1?.sellerName || 'Органика'})`,
      title: title1,
      price: price1Str,
      body: body1,
      why: why1
    },
    {
      id: 'sample_ad_top_promo',
      tag: `⭐ Шаблон платного продвижения (${top2?.paidPromo || 'Пакет XL / Продвинуто'} · ${top2Views > 0 ? `${top2Views.toLocaleString('ru-RU')} просм.` : 'Высокий чек'})`,
      title: title2,
      price: price2Str,
      body: body2,
      why: why2
    },
    {
      id: 'sample_ad_express',
      tag: `⚡ Шаблон быстрого отклика (конверсия в звонок за 3 мин)`,
      title: title3,
      price: price3Str,
      body: body3,
      why: why3
    }
  ];
}

/**
 * Builds pricing tiers according to user specification:
 * - If client has existing account (hasExistingAccount = true): 3 blocks (Аудит 2000 ₽, Пакет 8000 ₽, Ведение 19000 ₽/мес)
 * - If no account (hasExistingAccount = false): 2 blocks (Пакет «Запуск» 8000 ₽, Ведение 19000 ₽/мес)
 */
export function buildPricingTiers(hasExistingAccount: boolean = true): PriceTier[] {
  if (hasExistingAccount) {
    return [
      {
        id: 't1',
        tag: 'Отдельно',
        title: 'Аудит текущего профиля с отчётом и таблицей конверсий',
        sum: '2 000 ₽',
        details: 'дополнительно : Корректировка одного объявления (текст + подбор и порядок фото, ретушь до 5 фото): 600 ₽\nНастройка продвижения на 2 месяца : 1 500 ₽'
      },
      {
        id: 't2',
        tag: 'Рекомендую',
        title: 'Пакет: аудит текущего профиля, правка до 10 объявлений по всем направлениям, План продвижения на 2 месяца, план и скрипты ответа, план работы с отзывами для получения отзывов',
        sum: '8 000 ₽',
        details: 'Срок 4 дней.',
        isMain: true
      },
      {
        id: 't3',
        tag: 'Сопровождение',
        title: 'Ведение аккаунта в месяц',
        sum: '19 000 ₽ / мес',
        details: 'Еженедельный разбор статистики, правка слабых объявлений, тест заголовков и главного фото, создание новых объявлений по стратегии, управление бюджетом продвижения, отчёт раз в неделю.\n\nРекламный бюджет Авито оплачиваете вы в своём кабинете. Доступ: через функцию сотрудников в кабинете Авито или правки по нашим готовым текстам вносите сами.'
      }
    ];
  } else {
    // Если галки нет то делаем два блока (второй и третий) и пишем Создание
    return [
      {
        id: 't2',
        tag: 'Рекомендую',
        title: 'Пакет: запуск профиля с нуля, создание до 10 объявлений по всем направлениям, План продвижения на 2 месяца, план и скрипты ответа, план работы с отзывами для получения отзывов',
        sum: '8 000 ₽',
        details: 'Срок 4 дней.',
        isMain: true
      },
      {
        id: 't3',
        tag: 'Сопровождение',
        title: 'Ведение аккаунта в месяц',
        sum: '19 000 ₽ / мес',
        details: 'Еженедельный разбор статистики, правка слабых объявлений, тест заголовков и главного фото, создание новых объявлений по стратегии, управление бюджетом продвижения, отчёт раз в неделю.\n\nРекламный бюджет Авито оплачиваете вы в своём кабинете. Доступ: через функцию сотрудников в кабинете Авито или правки по нашим готовым текстам вносите сами.'
      }
    ];
  }
}

/**
 * Synthesize a full ReportData in the exact reference format from the parsed Google Sheet items
 */
export function synthesizeReportFromAvitoSheet(
  items: AvitoSearchItem[],
  analysis: SearchMarketAnalysis,
  selectedSellerName?: string,
  hasExistingAccount: boolean = true
): ReportData {
  const isPersonal = Boolean(selectedSellerName && selectedSellerName !== 'Все конкуренты (Сводный аудит)');
  const targetSeller = isPersonal ? selectedSellerName! : (analysis.topSellers[0]?.name || 'Лидер ниши');

  // 1. CALCULATE SEARCH VIEWS SUMMARY DIRECTLY FROM REAL TABLE DATA
  // CRITICAL REQUIREMENT: Views in viewsSummary must be aggregated ONLY from "Просмотров сегодня" (it.viewsToday)!
  const getTodayViews = (it: AvitoSearchItem): number => Number(it.viewsToday) || 0;

  const allViews = items.map(getTodayViews);
  const withPaid = items.filter(it => {
    const p = (it.paidPromo || '').trim().toLowerCase();
    return p !== '' && p !== '-' && p !== '0' && p !== 'нет' && p !== 'false' && p !== 'без услуг';
  });
  const withoutPaid = items.filter(it => !withPaid.includes(it));
  const totalCount = items.length;

  const paidViews = withPaid.map(getTodayViews);
  const freeViews = withoutPaid.map(getTodayViews);

  const avgV = totalCount > 0 ? Number((allViews.reduce((a, b) => a + b, 0) / totalCount).toFixed(2)) : 0;
  const avgPaidV = withPaid.length > 0 ? Number((paidViews.reduce((a, b) => a + b, 0) / withPaid.length).toFixed(2)) : 0;
  const avgFreeV = withoutPaid.length > 0 ? Number((freeViews.reduce((a, b) => a + b, 0) / withoutPaid.length).toFixed(2)) : 0;
  const minV = allViews.length > 0 ? Math.min(...allViews) : 0;
  const maxV = allViews.length > 0 ? Math.max(...allViews) : 0;

  // Breakdown of paid services directly from table
  const paidMap: Record<string, number> = {};
  withPaid.forEach(it => {
    const rawParts = it.paidPromo.split(/[,;\n\+]/).map(s => s.trim()).filter(Boolean);
    const services = rawParts.length > 0 ? rawParts : [it.paidPromo.trim()];
    services.forEach(rawName => {
      let name = rawName;
      if (/^xl$/i.test(name)) name = 'XL';
      else if (/выделен/i.test(name)) name = 'Выделено';
      else if (/значк/i.test(name)) name = 'Значки на XL-объявлении';
      else if (/^продвинуто\s*(\d+)$/i.test(name)) {
        const m = name.match(/\d+/);
        name = `Продвинуто (пакет ${m ? m[0] : ''})`;
      } else if (/^продвинуто$/i.test(name)) {
        name = 'Продвинуто';
      }
      paidMap[name] = (paidMap[name] || 0) + 1;
    });
  });

  const paidList: PaidServiceItem[] = Object.entries(paidMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], idx) => ({
      id: `ps_${idx}`,
      name,
      count,
      badge: name.toLowerCase().includes('xl') 
        ? 'Формат выдачи' 
        : name.toLowerCase().includes('выдел') 
        ? 'Цветовой акцент' 
        : name.toLowerCase().includes('знач') 
        ? 'Плашки преимуществ' 
        : 'Увеличение показов'
    }));

  const viewsSummary: SearchViewsSummary = {
    sectionTitle: 'Сводные данные выдачи: Просмотры сегодня и платные сервисы',
    subtitle: `Сводная статистика поисковой выдачи Авито: сравнение просмотров за сегодня и эффективности платных пакетов по выборке ${totalCount} объявлений в регионе ${analysis.region}`,
    avgViews: avgV,
    avgViewsWithPaid: avgPaidV,
    avgViewsWithoutPaid: avgFreeV,
    minViews: minV,
    maxViews: maxV,
    totalAds: totalCount,
    adsWithPaid: withPaid.length,
    adsWithoutPaid: withoutPaid.length,
    paidServices: paidList.length > 0 ? paidList : [
      { id: 'ps_def_1', name: 'Органическая выдача (без платных опций)', count: withoutPaid.length, badge: 'Органика' }
    ],
    conclusionNote: avgFreeV > avgPaidV
      ? `У карточек без платных сервисов среднее за сегодня (${avgFreeV}) выше, чем с платными (${avgPaidV}), так как бесплатные объявления долго находятся в выдаче и аккумулируют просмотры (сегодня до ${maxV}). Платные сервисы (${paidList.map(p => p.name).slice(0, 3).join(', ') || 'XL / Продвинуто'}) конкуренты подключают на свежие карточки для быстрого старта и снятия горячих звонков.`
      : `Карточки с подключенными платными услугами генерируют в среднем ${avgPaidV} просмотров за сегодня против ${avgFreeV} у органических, обеспечивая решающее преимущество в выдаче ${analysis.region}.`
  };

  // 2. POPULATE ADS FOR SECTION 1 (Где теряются звонки) FROM REAL GOOGLE SHEET ITEMS
  const sellerItems = isPersonal 
    ? items.filter(it => it.sellerName.toLowerCase().includes(selectedSellerName!.toLowerCase())) 
    : [];
  const getCalcViews = (it: AvitoSearchItem): number => {
    return it.viewsToday > 0 ? it.viewsToday : (it.viewsTotal > 0 ? Math.round(it.viewsTotal / 30) : 0);
  };
  const adsForCalc: CalcRow[] = [];
  const candidateItems = isPersonal && sellerItems.length > 0 ? sellerItems : items;
  const sortedCandidateItems = [...candidateItems].sort((a, b) => getCalcViews(b) - getCalcViews(a));
  const seenTitles = new Set<string>();

  for (let i = 0; i < sortedCandidateItems.length && adsForCalc.length < 6; i++) {
    const it = sortedCandidateItems[i];
    const rawTitle = it.title.trim();
    if (!rawTitle || seenTitles.has(rawTitle.toLowerCase())) continue;
    seenTitles.add(rawTitle.toLowerCase());

    const views = Math.max(10, getCalcViews(it));
    const cr = it.paidPromo ? 0.022 : 0.015;
    const contacts = Math.max(1, Math.round(views * cr));

    adsForCalc.push({
      id: `row_${it.avitoId || i}`,
      name: rawTitle,
      views,
      contacts
    });
  }

  if (adsForCalc.length === 0) {
    adsForCalc.push(
      { id: 'row_1', name: `${analysis.keyword} — Основное направление`, views: 1200, contacts: 24 },
      { id: 'row_2', name: `${analysis.keyword} — Комплекс под ключ`, views: 850, contacts: 18 },
      { id: 'row_3', name: `${analysis.keyword} — Срочный заказ`, views: 420, contacts: 9 }
    );
  }

  const taskId = Math.floor(10000 + Math.random() * 90000).toString();
  const dateStr = new Date().toLocaleDateString('ru-RU');

  // Slugify for nicheKey
  const nicheSlug = analysis.keyword
    .toLowerCase()
    .replace(/[^a-zа-я0-9]/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 20);

  // 3. DYNAMIC WORDSTAT SEASONALITY
  const parsedSeasonality = parseWordstatText(DEFAULT_WORDSTAT_SAMPLE, 180000, analysis.keyword, analysis.region);
  const seasonality = parsedSeasonality ? {
    sectionTitle: `4. Продвижение с учётом сезона (${analysis.keyword} · ${analysis.region})`,
    intro: `Раскладка годового бюджета продвижения с учётом спроса в ${analysis.region} по данным поисковых запросов Яндекс Вордстат.`,
    annualBudgetRub: 180000,
    months: parsedSeasonality.months,
    periods: parsedSeasonality.periods,
    note: parsedSeasonality.note,
    wordstatAnalysis: parsedSeasonality.analysis,
    wordstatKeyword: analysis.keyword,
    wordstatRegion: analysis.region
  } : {
    sectionTitle: `4. Продвижение с учётом сезона (${analysis.keyword} · ${analysis.region})`,
    intro: `Раскладка годового бюджета продвижения с учётом спроса в ${analysis.region}.`,
    annualBudgetRub: 180000,
    months: [
      { month: 'Сен', percent: 11 },
      { month: 'Окт', percent: 8 },
      { month: 'Ноя', percent: 6 },
      { month: 'Дек', percent: 5 },
      { month: 'Янв', percent: 7 },
      { month: 'Фев', percent: 6 },
      { month: 'Мар', percent: 7 },
      { month: 'Апр', percent: 9 },
      { month: 'Май', percent: 8 },
      { month: 'Июн', percent: 8 },
      { month: 'Июл', percent: 8 },
      { month: 'Авг', percent: 8 },
      { month: 'Сен', percent: 9 },
    ],
    periods: [
      { title: 'Период спада', desc: 'Эконом-режим, удержание органических позиций.' },
      { title: 'Стабильный спрос', desc: 'Умеренные бусты, сбор базы клиентов.' },
      { title: 'Пик спроса', desc: 'Максимальный рекламный бюджет и платные опции.' }
    ],
    note: 'Бюджет откалиброван под реальный спрос.'
  };

  // Pricing anchors from sheet
  const anchorPriceLow = analysis.minPrice > 0 ? analysis.minPrice : 1500;
  const anchorPriceAvg = analysis.avgPrice > 0 ? analysis.avgPrice : 6500;
  const anchorPriceHigh = analysis.maxPrice > 0 ? Math.min(analysis.maxPrice, anchorPriceAvg * 3) : 15000;

  return {
    id: `sheet-${taskId}`,
    nicheKey: nicheSlug || 'service-audit',
    nicheName: `${analysis.keyword} (${analysis.region})`,
    city: analysis.region,
    platform: 'Авито',
    date: dateStr,
    kicker: `Парсинг выдачи Авито · ${analysis.keyword} · ${analysis.region} · ${analysis.totalAds} объявлений · ${dateStr}`,
    title: isPersonal 
      ? `«Причёска» профиля ${targetSeller}: аудит выдачи Авито в ${analysis.region}, 3 объявления-образца и стратегия продвижения`
      : `Аудит поисковой выдачи Авито по запросу «${analysis.keyword}» (${analysis.region}): чек-лист, 3 объявления-образца и медиаплан`,
    lead: hasExistingAccount 
      ? `Проанализировано ${analysis.totalAds} карточек в поисковой выдаче Авито по ${analysis.region}. Средний рейтинг конкурентов — ${analysis.avgRating}⭐, ${analysis.paidPromoPercent}% используют платные пакеты продвижения (${paidList.map(p => p.name).slice(0, 2).join(', ') || 'XL, Продвинуто'}). Суммарный объём просмотров — ${analysis.totalViews.toLocaleString('ru-RU')} (в среднем ${avgV} на карточку). Основная потеря заявок в нише — нечёткие заголовки, размытые сметы и затянутый ответ в чате.`
      : `Запуск с нуля: проанализировано ${analysis.totalAds} карточек конкурентов в поисковой выдаче Авито по ${analysis.region}. Средний рейтинг конкурентов — ${analysis.avgRating}⭐, ${analysis.paidPromoPercent}% используют платные пакеты (${paidList.map(p => p.name).slice(0, 2).join(', ') || 'XL, Продвинуто'}). Чтобы не слить рекламный бюджет на старте, отстраиваемся от лидеров рынка, выверенно заходим в нишу и перехватываем горячий поисковый спрос.`,
    heroImage: /ремонт|отделк/i.test(analysis.keyword)
      ? '/src/assets/images/renovation_master_1793133732916.jpg'
      : (/детейл|полировк/i.test(analysis.keyword)
          ? '/src/assets/images/detailing_master_1793158867378.jpg'
          : '/src/assets/images/ac_master_photo_1793133720502.jpg'),
    heroCaption: `Образец главного фото в выдаче ${analysis.region} по направлению «${analysis.keyword}»: реальный объект мастера за работой с правильным светом. Без стоковых картинок из интернета — только свои живые фото.`,
    hasExistingAccount,
    viewsSummary,
    sprint: {
      title: 'Что делаем за 7 дней',
      items: hasExistingAccount ? [
        `Аудит позиций и карточек по чек-листу на основе анализа ТОП-${analysis.totalAds} конкурентов в регионе ${analysis.region}.`,
        `Таблица конверсий по ключевым позициям ниши «${analysis.keyword}».`,
        `Три новых продающих текста объявлений с понятной сметой и привязкой к ценам по ${analysis.region}.`,
        `План продвижения по сезонам с учетом графика поискового спроса Яндекс Вордстат.`,
        'Скрипт квалификации в чате Авито: ответ за 3 минуты и перевод на заказ/замер/осмотр.'
      ] : [
        `Подготовка и оформление профиля Авито с нуля по чек-листу на основе анализа ТОП-${analysis.totalAds} конкурентов в регионе ${analysis.region}.`,
        `Анализ цен и структуры карточек конкурентов из поисковой выдачи для гарантированной отстройки.`,
        `Три новых продающих текста объявлений с понятной сметой и привязкой к ценам по ${analysis.region}.`,
        `План продвижения по сезонам с учетом графика поискового спроса Яндекс Вордстат.`,
        'Скрипт квалификации в чате Авито: ответ за 3 минуты и перевод на заказ/замер/осмотр.'
      ],
      note: hasExistingAccount
        ? `Звонки и сообщения принимаете вы. Мы обеспечиваем упаковку, отстройку от ${analysis.totalAds} конкурентов и регламенты быстрого закрытия в сделку.`
        : `Запуск с нуля: готовим продающий аккаунт, отстраиваемся от ${analysis.totalAds} конкурентов и выводим карточки в ТОП выдачи ${analysis.region}.`
    },
    calculator: {
      sectionTitle: '1. Где теряются звонки: считаем по вашей статистике',
      intro: `По данным парсинга выдачи в ${analysis.region}, средняя цена контакта сильно зависит от точности оффера в первые 3 секунды. Впишите ваши цифры за 30 дней: таблица рассчитает конверсию и покажет, какие карточки съедают бюджет без заявок.`,
      note: `Цифры основаны на реальной плотности просмотров в ${analysis.region}. Порог: конверсия ниже 60 % от средней по аккаунту.`,
      thresholdRatio: 0.6,
      rows: adsForCalc
    },
    auditChecklist: {
      sectionTitle: '2. Чек-лист аудита (с учётом факторов выдачи Авито)',
      groups: [
        {
          id: 'cg1',
          title: 'Доверие и статус продавца',
          items: [
            { id: 'ci1_1', text: `Значок «Документы проверены» (в ТОП-выдаче ${analysis.region} у ${analysis.verifiedPercent}% продавцов)`, checked: analysis.verifiedPercent > 50 },
            { id: 'ci1_2', text: `Понятное позиционирование мастера / компании (адрес в ${analysis.region}, живые фото)`, checked: true },
            { id: 'ci1_3', text: `Рейтинг от 4.8 и регулярные ответы на положительные и негативные отзывы (ср. по нише: ${analysis.avgRating}⭐)`, checked: true },
            { id: 'ci1_4', text: 'Указание гарантии по договору и опыта работы в описании', checked: false },
            { id: 'ci1_5', text: 'Автоответ в чате с быстрой вилкой цен под запрос клиента', checked: false }
          ]
        },
        {
          id: 'cg2',
          title: 'Структура карточки услуги',
          items: [
            { id: 'ci2_1', text: 'Одна услуга = одно объявление (не смешивать разные задачи в один текст)', checked: false },
            { id: 'ci2_2', text: `Заголовок: точный поисковый запрос + триггер (например: «${analysis.keyword} за 1 день с гарантией»)` , checked: true },
            { id: 'ci2_3', text: `Прозрачный прайс-лист: от ${anchorPriceLow.toLocaleString('ru-RU')} ₽ за базовый этап без скрытых доплат`, checked: false },
            { id: 'ci2_4', text: 'Пошаговый состав работ: что входит в стоимость до мелочей', checked: true },
            { id: 'ci2_5', text: 'Указание профессионального оборудования и сертифицированных материалов', checked: true }
          ]
        },
        {
          id: 'cg3',
          title: 'Визуальный ряд',
          items: [
            { id: 'ci3_1', text: `Главное фото: реальный объект или мастер в процессе работы в ${analysis.region}`, checked: false },
            { id: 'ci3_2', text: 'Фото 2-5: макро-съемка узлов «до/после», процесс работы, аккуратность', checked: true },
            { id: 'ci3_3', text: 'Отсутствие стоковых картинок из интернета, которые режут доверие заказчиков', checked: true },
            { id: 'ci3_4', text: 'Инфографика преимуществ: без перегруза текстом, строго по делу', checked: false }
          ]
        },
        {
          id: 'cg4',
          title: 'Продвижение и обработка лидов',
          items: [
            { id: 'ci4_1', text: `Использование платных пакетов (в выдаче продвигается ${analysis.paidPromoPercent}% карточек)`, checked: analysis.paidPromoPercent > 20 },
            { id: 'ci4_2', text: 'Подключение усиления показов (x5/x10) в пиковые дни спроса', checked: false },
            { id: 'ci4_3', text: 'Скорость первого ответа в чате до 4 минут в рабочее время', checked: false },
            { id: 'ci4_4', text: 'Повторные касания и сбор отзывов после завершения заказа', checked: false }
          ]
        }
      ]
    },
    sampleAds: {
      sectionTitle: `3. Три объявления-образца под выдачу ${analysis.region}`,
      subtitle: `Смоделированы по шаблонам самых эффективных объявлений из парсинга (${analysis.totalAds} карточек в регионе ${analysis.region}). Заголовки, ценовые офферы и структура выгод взяты у лидеров по просмотрам и платным сервисам.`,
      ads: buildTopCompetitorSampleAds(candidateItems, analysis)
    },
    seasonality,
    roadmap: {
      sectionTitle: `5. План вывода карточек в ТОП-3 выдачи ${analysis.region}`,
      steps: [
        {
          step: 'День 1-2',
          action: `Анализ позиций относительно текущих ${analysis.totalAds} конкурентов, отбор качественных фото объектов`,
          proof: 'Готовая карта конкурентов и фотобанк'
        },
        {
          step: 'День 3-4',
          action: `Переупаковка флагманских объявлений по направлению «${analysis.keyword}» с прозрачными сметами`,
          proof: 'Объявления прошли модерацию Авито'
        },
        {
          step: 'День 5-7',
          action: 'Запуск рекламных услуг в целевых районах города, подключение быстрого автоответа',
          proof: 'Снижение стоимости целевого контакта'
        },
        {
          step: 'Недели 2-4',
          action: 'А/Б тестирование главных фото и заголовков с учетом динамики поискового спроса',
          proof: 'Конверсия из просмотра в контакт выше средней по нише'
        }
      ],
      disclaimer: `Аудит и показатели сформированы на основе реального среза поисковой выдачи Авито в регионе ${analysis.region}.`
    },
    pricing: {
      sectionTitle: hasExistingAccount 
        ? '6. Тарифы на маркетинг и продвижение на Авито' 
        : '4. Тарифы на маркетинг и продвижение на Авито',
      tiers: buildPricingTiers(hasExistingAccount),
      termsNote: 'Рекламный бюджет Авито оплачиваете вы в своём кабинете. Доступ: через функцию сотрудников в кабинете Авито или правки по нашим готовым текстам вносите сами.'
    },
    kickoff: {
      sectionTitle: 'Что прислать для старта',
      items: [
        'Ссылку на ваш профиль или объявление на Авито',
        `Адрес базы / локации в ${analysis.region} и график работы`,
        'Реальные фотографии выполненных работ, оборудования или объектов',
        'Ваш базовый прайс-лист на основные услуги',
        'Комфортный бюджет на продвижение на первый месяц'
      ]
    },
    footer: `Материал подготовлен на основе парсинга поисковой выдачи Авито (${analysis.totalAds} объявлений) в регионе ${analysis.region} · ${dateStr}.`,
    parsedSourceMeta: {
      keyword: analysis.keyword,
      region: analysis.region,
      totalAds: analysis.totalAds,
      avgPrice: analysis.avgPrice,
      paidPromoPercent: analysis.paidPromoPercent,
      avgRating: analysis.avgRating,
      totalViews: analysis.totalViews,
      sourceName: targetSeller
    }
  };
}

/**
 * Fetch Google Sheet CSV data by converting public view/edit links to export links
 */
export async function fetchGoogleSheetCsv(sheetUrl: string): Promise<string> {
  let exportUrl = sheetUrl.trim();

  // Pattern for Google Sheet URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...
  const match = exportUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const spreadsheetId = match[1];
    // Check if gid is present
    const gidMatch = exportUrl.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить данные из таблицы (HTTP ${response.status}). Убедитесь, что доступ по ссылке открыт («Всем, у кого есть ссылка»).`);
  }
  return await response.text();
}

/**
 * Load the pre-loaded real sample attached by user (Defaults to Orenburg Conditioners 50-ad dataset)
 */
export async function loadAttachedSample(
  overrideKeyword?: string,
  overrideRegion?: string
): Promise<{ raw: string; items: AvitoSearchItem[]; analysis: SearchMarketAnalysis }> {
  // Use authentic 50-row AC sample data for Orenburg
  const raw = SAMPLE_AC_ORENBURG_CSV;
  const items = parseAvitoCsv(raw);
  const analysis = analyzeAvitoSearch(items, overrideKeyword || 'Монтаж кондиционеров', overrideRegion || 'Оренбург');
  return { raw, items, analysis };
}
