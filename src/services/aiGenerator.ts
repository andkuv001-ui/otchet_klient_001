import { ReportData } from '../types/report';

interface GenerateOptions {
  nicheName: string;
  city: string;
  platform: string;
  notes?: string;
  taskId?: string;
}

/**
 * Generates an Avito/local business commercial report by calling the server-side
 * Gemini API endpoint (/api/gemini/generate-report).
 * If the server endpoint encounters an issue, gracefully falls back to the deterministic
 * high-fidelity template generator without disrupting the user flow.
 */
export async function generateReportWithAi(options: GenerateOptions): Promise<ReportData> {
  const taskId = options.taskId || Math.floor(10000 + Math.random() * 90000).toString();
  const dateStr = new Date().toLocaleDateString('ru-RU');

  try {
    const response = await fetch('/api/gemini/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nicheName: options.nicheName,
        city: options.city,
        platform: options.platform,
        notes: options.notes,
        taskId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.report) {
        return data.report as ReportData;
      }
    } else {
      const errorJson = await response.json().catch(() => null);
      console.warn('Server-side Gemini generation responded with error:', errorJson || response.statusText);
    }
  } catch (err) {
    console.warn('Failed to call server-side Gemini API endpoint, falling back to smart dynamic generator:', err);
  }

  // Fallback: Smart Instant Niche Generator (Deterministic high-quality fallback)
  return createSmartFallbackReport(options, taskId, dateStr);
}

/**
 * Client helper to stream text from server-side Gemini SSE endpoint (/api/gemini/stream)
 */
export async function* streamGeminiContent(prompt: string, model: string = 'gemini-3.8-flash', systemInstruction?: string) {
  const response = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model, systemInstruction }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming failed with status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.text) yield parsed.text;
        } catch (_) {}
      }
    }
  }
}

/**
 * Client helper to connect to server-side Gemini Live API WebSocket (/live)
 */
export function connectGeminiLive(options: {
  onAudio?: (base64Audio: string) => void;
  onInterrupted?: () => void;
  onError?: (err: any) => void;
  onClose?: () => void;
}) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/live`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.audio && options.onAudio) {
        options.onAudio(msg.audio);
      }
      if (msg.interrupted && options.onInterrupted) {
        options.onInterrupted();
      }
      if (msg.error && options.onError) {
        options.onError(new Error(msg.error));
      }
    } catch (e) {
      options.onError?.(e);
    }
  };

  ws.onerror = (e) => options.onError?.(e);
  ws.onclose = () => options.onClose?.();

  return {
    sendAudioChunk: (base64Pcm16k: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ audio: base64Pcm16k }));
      }
    },
    close: () => ws.close(),
  };
}

function createSmartFallbackReport(options: GenerateOptions, taskId: string, dateStr: string): ReportData {
  const { nicheName, city, platform } = options;
  
  return {
    id: taskId,
    nicheKey: `custom-${Date.now()}`,
    nicheName: nicheName,
    city: city,
    platform: platform,
    date: dateStr,
    kicker: `Задание ${taskId} · ${platform} · ${city} · ${dateStr}`,
    title: `«Причёска» аккаунта в нише «${nicheName}»: чек-лист аудита, 3 объявления-образца и стратегия продвижения`,
    lead: `Просмотры есть, но целевых звонков мало. Пользователи в ${city} открывают карточку и уходят к конкурентам. Устраняем слабые места воронки: первые строки оффера, доверие к профилю, продающие фото и скорость первого ответа.`,
    heroImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    heroCaption: `Образец главного фото в сфере «${nicheName}»: реальный специалист за работой, виден инструмент, чистота и результат. В объявления ставим ваши живые фото.`,
    sprint: {
      title: 'Что делаем за 7 дней',
      items: [
        `Аудит профиля и ключевых услуг по нише «${nicheName}» (28 критериев).`,
        'Таблица конверсий по объявлениям: определяем карточки с утечкой звонков.',
        'Три новых текста с сильными заголовками и понятным составом услуги.',
        'Сезонный медиаплан продвижения с разбивкой бюджета на 12 месяцев.',
        'Скрипт квалификации и быстрого ответа в первые 3 минуты.'
      ],
      note: 'Звонки и встречи ведете вы. Мы готовим продающую упаковку и регламенты быстрого ответа.'
    },
    calculator: {
      sectionTitle: '1. Где теряются звонки: считаем по вашей статистике',
      intro: `В нише «${nicheName}» цена клика растет каждый месяц. Внесите цифры просмотров и контактов за последние 30 дней. Система автоматически рассчитает конверсию и выделит объявления, требующие срочной доработки.`,
      note: 'Порог: конверсия ниже 60 % от средней по вашему аккаунту.',
      thresholdRatio: 0.6,
      rows: [
        { id: 'f1', name: `Основная услуга: ${nicheName} под ключ`, views: 1420, contacts: 24 },
        { id: 'f2', name: `Срочный выезд / Экспресс-заказ в ${city}`, views: 890, contacts: 19 },
        { id: 'f3', name: 'Диагностика и консультация специалиста', views: 610, contacts: 5 },
        { id: 'f4', name: 'Комплексное обслуживание / B2B', views: 320, contacts: 2 }
      ]
    },
    auditChecklist: {
      sectionTitle: '2. Чек-лист аудита',
      groups: [
        {
          id: 'fg1',
          title: 'Профиль и доверие',
          items: [
            { id: 'fi1', text: `Название и позиционирование: ${nicheName}, ${city}`, checked: true },
            { id: 'fi2', text: 'Описание профиля: опыт, гарантия по договору, районы выезда', checked: false },
            { id: 'fi3', text: 'Отзывы: свежесть, рейтинг от 4.8, ответы на каждый отзыв', checked: true },
            { id: 'fi4', text: 'Подтвержденные документы мастера / самозанятого / юрлица', checked: true }
          ]
        },
        {
          id: 'fg2',
          title: 'Объявления',
          items: [
            { id: 'fi5', text: 'Одно объявление = одна конкретная услуга', checked: false },
            { id: 'fi6', text: 'Заголовок: услуга + выгода без спама и лишнего капса', checked: false },
            { id: 'fi7', text: 'Цена «от» честная и прозрачно расшифрована в тексте', checked: true },
            { id: 'fi8', text: 'Отсутствие дублей, сжигающих показы алгоритма', checked: false }
          ]
        },
        {
          id: 'fg3',
          title: 'Фотографии',
          items: [
            { id: 'fi9', text: 'Только живые фото с объектов, никаких стоковых картинок', checked: false },
            { id: 'fi10', text: 'Фото 2-5: детали, инструмент, процесс и готовый результат', checked: true },
            { id: 'fi11', text: 'Фото «до/после» для наглядного эффекта', checked: false }
          ]
        },
        {
          id: 'fg4',
          title: 'Обработка заявок',
          items: [
            { id: 'fi12', text: 'Скорость ответа в чате до 5 минут в рабочее время', checked: false },
            { id: 'fi13', text: 'Скрипт перевода диалога на выезд или точный расчет сметы', checked: true },
            { id: 'fi14', text: 'Уведомления о новых сообщениях на смартфоне мастера', checked: true }
          ]
        }
      ]
    },
    sampleAds: {
      sectionTitle: '3. Три объявления-образца',
      subtitle: 'Пример подачи для сферы «' + nicheName + '». В чистовые объявления ставим ваши реальные цены и фото.',
      ads: [
        {
          id: 'fad1',
          tag: 'Флагманская услуга',
          title: `${nicheName} в ${city} под ключ с гарантией по договору`,
          price: 'от [ваша цена] ₽ за стандартный комплекс',
          body: `Нужна качественная услуга в сфере «${nicheName}» без скрытых платежей и переделок?

Что входит в стандартный выезд:
- Оперативный выезд мастера в любой район ${city}
- Диагностика и подбор оптимального решения под ваш бюджет
- Выполнение работы с профессиональным инструментом
- Проверка и демонстрация результата при вас
- Официальная гарантия на работу [срок]

Цену согласовываем до начала работ — на месте сюрпризов не будет.

Напишите в чат вашу задачу — ответим за 3 минуты и назовем ориентировочную стоимость.`,
          why: 'Почему так: первые строки снимают главный страх «накрутки цены на объекте», подробно расписан состав услуги и дан понятный призыв написать в чат.'
        },
        {
          id: 'fad2',
          tag: 'Срочный заказ',
          title: `Срочный выезд мастера по «${nicheName}» за 45 минут в ${city}`,
          price: 'от [ваша цена] ₽ · работаем без выходных',
          body: `Случилась нештатная ситуация или нужно сделать прямо сегодня?
Выезжаем по всему ${city} в течение 45-60 минут со всем необходимым оборудованием.

- Опыт мастеров от 7 лет
- Запчасти и расходники с собой
- Оплата после проверки наличными или картой

Звоните прямо сейчас или пишите адрес в чат!`,
          why: 'Почему так: в срочных услугах решающее значение имеет скорость отклика и наличие инструмента/запчастей с собой.'
        },
        {
          id: 'fad3',
          tag: 'Комплекс / Профилактика',
          title: `Плановое обслуживание и диагностика в нише «${nicheName}»`,
          price: 'от [ваша цена] ₽ с детальным чек-листом',
          body: `Предотвратите дорогостоящие поломки заранее. Проведем полную диагностику и настройку оборудования.

По итогам визита:
- Чек-лист проверки по 15 параметрам
- Рекомендации по дальнейшей эксплуатации
- Скидка 15% на повторные обращения

Записывайтесь в удобное время!`,
          why: 'Почему так: профилактические и диагностические объявления генерируют лояльную клиентскую базу и допродажи на объекте.'
        }
      ]
    },
    seasonality: {
      sectionTitle: '4. Продвижение с учётом сезона (февраль-декабрь)',
      intro: `Раскладка рекламного бюджета для сферы «${nicheName}» в ${city}. В пиковые месяцы наращиваем охваты, в межсезонье удерживаем постоянных клиентов.`,
      annualBudgetRub: 180000,
      months: [
        { month: 'Фев', percent: 6 }, { month: 'Мар', percent: 8 }, { month: 'Апр', percent: 10 },
        { month: 'Май', percent: 13 }, { month: 'Июн', percent: 14 }, { month: 'Июл', percent: 14 },
        { month: 'Авг', percent: 12 }, { month: 'Сен', percent: 9 }, { month: 'Окт', percent: 6 },
        { month: 'Ноя', percent: 5 }, { month: 'Дек', percent: 3 }
      ],
      periods: [
        { title: 'Весенний разгон', desc: 'Рост активности клиентов, тестирование заголовков и наборов фото.' },
        { title: 'Летний пик', desc: 'Максимальный спрос. Приоритет на высокомаржинальные заявки с высоким чеком.' },
        { title: 'Осень-зима', desc: 'Упор на сервис, ремонт, спецпредложения и корпоративных заказчиков.' }
      ],
      note: 'Платные услуги продвижения включаем только после вычитки текста и замены фотографий.'
    },
    roadmap: {
      sectionTitle: '5. План: что меняем, в каком порядке, как меряем',
      steps: [
        { step: '1. День 1-2', action: 'Аудит карточек, оцифровка конверсий, список ошибок', proof: 'Чек-лист с красными зонами' },
        { step: '2. День 3-5', action: 'Новые продающие заголовки, тексты и порядок фото', proof: 'Карточки прошли модерацию' },
        { step: '3. День 6-7', action: 'Запуск рекламных услуг на лучшие офферы', proof: 'Снижение стоимости контакта' },
        { step: '4. Недели 2-4', action: 'Сравнение динамики звонков «до/после»', proof: 'Рост конверсии из просмотра в контакт' }
      ],
      disclaimer: 'Гарантируем системную работу и регулярную отчетность по вашей статистике.'
    },
    pricing: {
      sectionTitle: '6. Стоимость',
      tiers: [
        {
          id: 'cf1',
          tag: 'Аудит',
          title: 'Аудит аккаунта с разбором ошибок',
          sum: '2 500 ₽',
          details: 'Аудит всех объявлений, выявление причин низкой конверсии, персональные рекомендации.'
        },
        {
          id: 'cf2',
          tag: 'Рекомендую',
          title: `Пакет «Упаковка ${nicheName}»`,
          sum: '6 500 ₽',
          details: 'Аудит, 3-5 продающих объявлений под ключ, сезонный план бюджета, скрипт быстрого ответа.',
          isMain: true
        },
        {
          id: 'cf3',
          tag: 'Ведение',
          title: 'Ежемесячный маркетинг под ключ',
          sum: '15 000 ₽ / мес',
          details: 'Еженедельный мониторинг конкурентов, корректировка рекламных пакетов, отчетность каждые 14 дней.'
        }
      ],
      termsNote: 'Работа через Безопасную сделку Freelance.ru или договор самозанятого с чеком. Пароли от личного кабинета передавать не требуется.'
    },
    kickoff: {
      sectionTitle: 'Что прислать для старта',
      items: [
        `Ссылка на профиль или магазин ${platform}`,
        'Статистика показов и звонков за 30 дней',
        'Прайс-лист на услуги с указанием минимального чека',
        'Фотографии оборудования и выполненных работ',
        'Желаемый бюджет на платную рекламу в месяц'
      ]
    },
    footer: `Материал подготовлен под задание ${taskId} на Freelance.ru · ${dateStr}. Все персональные данные защищены.`
  };
}
