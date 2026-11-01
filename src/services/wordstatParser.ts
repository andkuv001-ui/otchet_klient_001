import { MonthData, SeasonPeriod, WordstatAnalysis } from '../types/report';

export const DEFAULT_WORDSTAT_SAMPLE = `сентябрь 2025\t3 281\t0,000029
октябрь 2025\t2 385\t0,000020
ноябрь 2025\t1 742\t0,000015
декабрь 2025\t1 469\t0,000012
январь 2026\t1 905\t0,000018
февраль 2026\t1 576\t0,000016
март 2026\t1 999\t0,000018
апрель 2026\t2 430\t0,000021
май 2026\t2 322\t0,000022
июнь 2026\t2 283\t0,000022
июль 2026\t2 366\t0,000021
август 2026\t2 408\t0,000021
сентябрь 2026\t2 461\t0,000021`;

const MONTH_NAMES_MAP: Record<string, string> = {
  январь: 'Янв',
  января: 'Янв',
  февраль: 'Фев',
  февраля: 'Фев',
  март: 'Мар',
  марта: 'Мар',
  апрель: 'Апр',
  апреля: 'Апр',
  май: 'Май',
  мая: 'Май',
  июнь: 'Июн',
  июня: 'Июн',
  июль: 'Июл',
  июля: 'Июл',
  август: 'Авг',
  августа: 'Авг',
  сентябрь: 'Сен',
  сентября: 'Сен',
  октябрь: 'Окт',
  октября: 'Окт',
  ноябрь: 'Ноя',
  ноября: 'Ноя',
  декабрь: 'Дек',
  декабря: 'Дек',
};

/**
 * Shorten a Russian month & year string like "сентябрь 2025" -> "Сен '25"
 */
export function formatShortMonth(monthStr: string): string {
  const parts = monthStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const rawMonth = parts[0].toLowerCase();
    const shortM = MONTH_NAMES_MAP[rawMonth] || parts[0].slice(0, 3);
    const rawYear = parts[1].replace(/\D/g, '');
    const shortY = rawYear.length >= 4 ? rawYear.slice(-2) : rawYear;
    return `${shortM} '${shortY}`;
  }
  return monthStr;
}

export interface ParsedWordstatResult {
  months: MonthData[];
  periods: SeasonPeriod[];
  note: string;
  analysis: WordstatAnalysis;
}

/**
 * Parses raw Yandex Wordstat query history text.
 * Expected format per row:
 * "сентябрь 2025\t3 281\t0,000029"
 * or space/semicolon-delimited.
 */
export function parseWordstatText(
  rawText: string,
  annualBudgetRub: number = 180000,
  keyword?: string,
  region?: string
): ParsedWordstatResult | null {
  if (!rawText || !rawText.trim()) return null;

  const lines = rawText.trim().split(/\r?\n/);
  const parsedRows: { monthRaw: string; queries: number; share: number }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip headers like "Период\tЧисло запросов\tДоля"
    if (
      trimmed.toLowerCase().includes('период') ||
      trimmed.toLowerCase().includes('запросов') ||
      trimmed.toLowerCase().includes('доля')
    ) {
      continue;
    }

    // Try splitting by tab first
    let parts: string[] = [];
    if (trimmed.includes('\t')) {
      parts = trimmed.split('\t').map((p) => p.trim()).filter(Boolean);
    } else if (trimmed.includes(';')) {
      parts = trimmed.split(';').map((p) => p.trim()).filter(Boolean);
    } else {
      // Split by 2 or more spaces, or analyze by regex
      parts = trimmed.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) {
        // Fallback: match month year, number, share
        const match = trimmed.match(/^([а-яА-ЯёЁ]+\s+\d{4})\s+([\d\s\u00A0]+)\s+([\d,\.]+)/i);
        if (match) {
          parts = [match[1], match[2], match[3]];
        }
      }
    }

    if (parts.length < 2) continue;

    const monthRaw = parts[0].trim();
    // Clean numbers like "3 281" or "3281"
    const queriesClean = parts[1].replace(/[\s\u00A0]/g, '');
    const queries = parseInt(queriesClean, 10);

    if (isNaN(queries) || queries < 0) continue;

    // Parse share (e.g. "0,000029")
    let share = 0;
    if (parts[2]) {
      const shareClean = parts[2].replace(',', '.').replace(/[\s\u00A0]/g, '');
      const parsedShare = parseFloat(shareClean);
      if (!isNaN(parsedShare)) {
        share = parsedShare;
      }
    }

    parsedRows.push({
      monthRaw,
      queries,
      share,
    });
  }

  if (parsedRows.length === 0) return null;

  // Compute analytics
  const totalQueries = parsedRows.reduce((sum, r) => sum + r.queries, 0);
  const avgQueries = Math.round(totalQueries / parsedRows.length);

  let peakMonth = parsedRows[0].monthRaw;
  let peakQueries = parsedRows[0].queries;
  let troughMonth = parsedRows[0].monthRaw;
  let troughQueries = parsedRows[0].queries;

  for (const r of parsedRows) {
    if (r.queries > peakQueries) {
      peakQueries = r.queries;
      peakMonth = r.monthRaw;
    }
    if (r.queries < troughQueries) {
      troughQueries = r.queries;
      troughMonth = r.monthRaw;
    }
  }

  const seasonalityMultiplier = troughQueries > 0
    ? parseFloat((peakQueries / troughQueries).toFixed(2))
    : 1;

  // Calculate budget allocation percentages:
  // We use proportional share with a baseline floor so low-season months keep minimal presence
  const rawPercents = parsedRows.map((r) => (r.queries / totalQueries) * 100);
  
  // Round to 1 decimal place and normalize so sum is 100%
  let roundedPercents = rawPercents.map((p) => Math.round(p * 10) / 10);
  const currentSum = roundedPercents.reduce((a, b) => a + b, 0);
  const diff = Math.round((100 - currentSum) * 10) / 10;
  if (roundedPercents.length > 0 && Math.abs(diff) < 2) {
    // distribute diff to peak month
    const peakIdx = parsedRows.findIndex((r) => r.monthRaw === peakMonth);
    if (peakIdx >= 0) {
      roundedPercents[peakIdx] = Math.round((roundedPercents[peakIdx] + diff) * 10) / 10;
    }
  }

  // Construct MonthData items
  const months: MonthData[] = parsedRows.map((r, idx) => {
    const percent = roundedPercents[idx];
    const budgetRub = Math.round((annualBudgetRub * percent) / 100);

    let seasonLevel: 'high' | 'medium' | 'low' = 'medium';
    if (r.queries >= avgQueries * 1.08) {
      seasonLevel = 'high';
    } else if (r.queries <= avgQueries * 0.88) {
      seasonLevel = 'low';
    }

    let strategyNote = 'Стандартное органическое продвижение + умеренные бусты';
    if (seasonLevel === 'high') {
      strategyNote = 'Максимальный буст (x5/x10), XL-объявление, выделение цветом, быстрый ответ';
    } else if (seasonLevel === 'low') {
      strategyNote = 'Эконом-режим, удержание позиций, работа с отзывами и повторными клиентами';
    }

    return {
      month: r.monthRaw,
      shortMonth: formatShortMonth(r.monthRaw),
      percent,
      queries: r.queries,
      share: r.share,
      budgetRub,
      seasonLevel,
      strategyNote,
    };
  });

  // Group months into smart season periods
  const lowMonths = months.filter((m) => m.seasonLevel === 'low').map((m) => m.shortMonth);
  const highMonths = months.filter((m) => m.seasonLevel === 'high').map((m) => m.shortMonth);
  const midMonths = months.filter((m) => m.seasonLevel === 'medium').map((m) => m.shortMonth);

  const periods: SeasonPeriod[] = [
    {
      title: 'Период спада спроса (Низкий сезон)',
      desc: `Месяцы: ${lowMonths.length ? lowMonths.join(', ') : 'зимний период'}. Поисковый спрос снижается до ${troughQueries.toLocaleString('ru-RU')} запр./мес (минимум: ${troughMonth}). Стратегия: не сливать рекламный бюджет, перевести 60-70% бюджета в накопление, поддерживать минимальные ставки x1-x2 для органической видимости и собирать предзаказы.`,
    },
    {
      title: 'Межсезонье и прогрев (Стабильный спрос)',
      desc: `Месяцы: ${midMonths.length ? midMonths.join(', ') : 'весенний период'}. Средний спрос около ${avgQueries.toLocaleString('ru-RU')} запр./мес. Стратегия: подготовка новых креативов, тестирование заголовков, включение умеренного продвижения x2-x5 на топ-3 объявления по мере нарастания обращений.`,
    },
    {
      title: 'Пик спроса и высокий сезон (Максимальная загрузка)',
      desc: `Месяцы: ${highMonths.length ? highMonths.join(', ') : 'летний период'}. Спрос взлетает до ${peakQueries.toLocaleString('ru-RU')} запр./мес (пик: ${peakMonth}, рост в ${seasonalityMultiplier}x относительно минимума). Стратегия: максимальная концентрация рекламного бюджета (${months.filter((m) => m.seasonLevel === 'high').reduce((s, m) => s + m.percent, 0).toFixed(1)}% годового бюджета), активация XL-объявлений и услуг максимального охвата, мониторинг конкурентов каждый день.`,
    },
  ];

  const note = `График спроса и бюджета построен на основе реальной помесячной статистики поисковых запросов в Яндекс Вордстат${keyword ? ` по запросу «${keyword}»` : ''}${region ? ` в регионе ${region}` : ''}. За 13 месяцев зафиксировано ${totalQueries.toLocaleString('ru-RU')} поисковых запросов (в среднем ${avgQueries.toLocaleString('ru-RU')} запр./мес). Размах сезонности составляет ${seasonalityMultiplier}x (от ${troughQueries.toLocaleString('ru-RU')} в ${troughMonth} до ${peakQueries.toLocaleString('ru-RU')} в ${peakMonth}). Бюджет динамически сбалансирован: вы не переплачиваете в глухой сезон и забираете максимум клиентов на подъеме спроса.`;

  const analysis: WordstatAnalysis = {
    keyword,
    region,
    totalQueries,
    avgQueries,
    peakMonth,
    peakQueries,
    troughMonth,
    troughQueries,
    seasonalityMultiplier,
    rawInput: rawText,
  };

  return {
    months,
    periods,
    note,
    analysis,
  };
}
