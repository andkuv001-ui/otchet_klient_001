import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client on the server with User-Agent
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 15000,
      },
    })
  : null;

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', hasKey: !!apiKey });
});

// Endpoint: Generate full commercial audit report
app.post('/api/gemini/generate-report', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.',
      });
    }

    const { nicheName, city, platform, notes, taskId } = req.body || {};
    if (!nicheName) {
      return res.status(400).json({ error: 'nicheName is required' });
    }

    const resolvedCity = city || 'Москва';
    const resolvedPlatform = platform || 'Авито';
    const resolvedTaskId = taskId || Math.floor(10000 + Math.random() * 90000).toString();
    const dateStr = new Date().toLocaleDateString('ru-RU');

    const prompt = `Ты — ведущий эксперт-маркетолог и авитолог. Составь подробный коммерческий аудит и коммерческое предложение для клиента в сфере "${nicheName}" в городе "${resolvedCity}" для платформы "${resolvedPlatform}".
Дополнительные вводные клиента: "${notes || 'Низкая конверсия в звонки, просмотры есть, нужны продающие тексты и сезонный медиаплан'}".

Ответь ИСКЛЮЧИТЕЛЬНО в формате строгого JSON без markdown-обёртки со следующей структурой:
{
  "kicker": "Задание ${resolvedTaskId} · ${resolvedPlatform} · ${resolvedCity} · ${dateStr}",
  "title": "Хлёсткий заголовок отчёта и плана продвижения",
  "lead": "Вводный абзац на 2-3 предложения с диагнозом проблемы и решением",
  "heroCaption": "Описание идеального первого фото для объявлений в этой нише",
  "sprint": {
    "title": "Что делаем за 7 дней",
    "items": ["5 четких шагов спринта"],
    "note": "Пояснение о разделении обязанностей (переписку ведет клиент, мы упаковываем)"
  },
  "calculator": {
    "sectionTitle": "1. Где теряются звонки: считаем по вашей статистике",
    "intro": "Пояснение как считать конверсию",
    "note": "Порог: конверсия ниже 60 % от средней по аккаунту",
    "thresholdRatio": 0.6,
    "rows": [
      {"name": "Название услуги 1", "views": 1100, "contacts": 18},
      {"name": "Название услуги 2", "views": 620, "contacts": 14},
      {"name": "Название услуги 3", "views": 450, "contacts": 4},
      {"name": "Название услуги 4", "views": 290, "contacts": 5}
    ]
  },
  "auditChecklist": {
    "sectionTitle": "2. Чек-лист аудита",
    "groups": [
      {"title": "Профиль и доверие", "items": ["пункт 1", "пункт 2", "пункт 3", "пункт 4"]},
      {"title": "Объявления", "items": ["пункт 1", "пункт 2", "пункт 3", "пункт 4"]},
      {"title": "Фото", "items": ["пункт 1", "пункт 2", "пункт 3"]},
      {"title": "Продвижение и обработка", "items": ["пункт 1", "пункт 2", "пункт 3"]}
    ]
  },
  "sampleAds": {
    "sectionTitle": "3. Три объявления-образца",
    "subtitle": "Компания и цены вымышленные, показываю подачу. В ваши объявления ставим ваши цены и фото.",
    "ads": [
      {
        "tag": "Направление 1",
        "title": "Продающий заголовок 1",
        "price": "от [ваша цена] ₽",
        "body": "Полный текст объявления с буллетами и призывом",
        "why": "Маркетинговая логика почему так"
      },
      {
        "tag": "Направление 2",
        "title": "Продающий заголовок 2",
        "price": "от [ваша цена] ₽",
        "body": "Полный текст объявления 2",
        "why": "Маркетинговая логика 2"
      },
      {
        "tag": "Направление 3",
        "title": "Продающий заголовок 3",
        "price": "от [ваша цена] ₽",
        "body": "Полный текст объявления 3",
        "why": "Маркетинговая логика 3"
      }
    ]
  },
  "seasonality": {
    "sectionTitle": "4. Продвижение с учётом сезона",
    "intro": "Стартовая раскладка бюджета продвижения по месяцам в процентах",
    "annualBudgetRub": 200000,
    "months": [
      {"month": "Янв", "percent": 5}, {"month": "Фев", "percent": 6}, {"month": "Мар", "percent": 8},
      {"month": "Апр", "percent": 11}, {"month": "Май", "percent": 12}, {"month": "Июн", "percent": 12},
      {"month": "Июл", "percent": 11}, {"month": "Авг", "percent": 10}, {"month": "Сен", "percent": 9},
      {"month": "Окт", "percent": 7}, {"month": "Ноя", "percent": 5}, {"month": "Дек", "percent": 4}
    ],
    "periods": [
      {"title": "Период 1", "desc": "Стратегия"},
      {"title": "Период 2", "desc": "Стратегия"},
      {"title": "Период 3", "desc": "Стратегия"}
    ],
    "note": "Рекомендации по платным услугам продвижения"
  },
  "roadmap": {
    "sectionTitle": "5. План: что меняем, в каком порядке, как меряем",
    "steps": [
      {"step": "1. День 1-2", "action": "Аудит по чек-листу", "proof": "Список слабых мест"},
      {"step": "2. День 3-5", "action": "Новые тексты и фото", "proof": "Объявления на модерации"},
      {"step": "3. День 6-7", "action": "Запуск продвижения", "proof": "Трафик на ТОП-объявления"},
      {"step": "4. Недели 2-4", "action": "Анализ конверсии до/после", "proof": "Снижение цены заявки"}
    ],
    "disclaimer": "Число звонков зависит от цены и сезона, гарантируем честную измеримую работу."
  },
  "pricing": {
    "sectionTitle": "6. Стоимость",
    "tiers": [
      {"tag": "Базовый", "title": "Аудит аккаунта с отчётом", "sum": "3 000 ₽", "details": "Разбор ошибок и чек-лист"},
      {"tag": "Рекомендую", "title": "Пакет «Упаковка под ключ»", "sum": "8 500 ₽", "details": "Аудит + 5 объявлений + сезонный план", "isMain": true},
      {"tag": "Сопровождение", "title": "Ведение кабинета в месяц", "sum": "18 000 ₽ / мес", "details": "Ежедневная оптимизация и отчеты"}
    ],
    "termsNote": "Оплата через Безопасную сделку, чек самозанятого. Пароли от кабинета не требуются."
  },
  "kickoff": {
    "sectionTitle": "Что прислать для старта",
    "items": [
      "Ссылку на рабочий профиль",
      "Скриншот статистики за 30 дней",
      "Актуальный прайс-лист",
      "Фотографии с объектов / примеры работ",
      "Комфортный бюджет на продвижение"
    ]
  },
  "footer": "Материал подготовлен под задание ${resolvedTaskId} на Freelance.ru · ${dateStr}."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    const report = {
      id: resolvedTaskId,
      nicheKey: nicheName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      nicheName: nicheName,
      city: resolvedCity,
      platform: resolvedPlatform,
      date: dateStr,
      kicker: parsed.kicker || `Задание ${resolvedTaskId} · ${resolvedPlatform} · ${resolvedCity} · ${dateStr}`,
      title: parsed.title,
      lead: parsed.lead,
      heroImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
      heroCaption: parsed.heroCaption || 'Образец композиции главного фото для вашей ниши.',
      sprint: parsed.sprint,
      calculator: {
        ...parsed.calculator,
        rows: (parsed.calculator?.rows || []).map((r: any, idx: number) => ({
          id: `gen_row_${idx}`,
          name: r.name,
          views: Number(r.views) || 500,
          contacts: Number(r.contacts) || 10,
        })),
      },
      auditChecklist: {
        ...parsed.auditChecklist,
        groups: (parsed.auditChecklist?.groups || []).map((g: any, gIdx: number) => ({
          id: `gen_g_${gIdx}`,
          title: g.title,
          items: (g.items || []).map((it: string, itIdx: number) => ({
            id: `gen_it_${gIdx}_${itIdx}`,
            text: it,
            checked: itIdx % 2 === 0,
          })),
        })),
      },
      sampleAds: {
        ...parsed.sampleAds,
        ads: (parsed.sampleAds?.ads || []).map((ad: any, aIdx: number) => ({
          id: `gen_ad_${aIdx}`,
          tag: ad.tag,
          title: ad.title,
          price: ad.price,
          body: ad.body,
          why: ad.why,
        })),
      },
      seasonality: parsed.seasonality,
      roadmap: parsed.roadmap,
      pricing: parsed.pricing,
      kickoff: parsed.kickoff,
      footer: parsed.footer,
    };

    return res.json({ success: true, report });
  } catch (error: any) {
    console.error('Error generating report with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate report with Gemini',
    });
  }
});

// Endpoint: General content generation
app.post('/api/gemini/generate', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }
    const { prompt, model, systemInstruction, temperature } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: model || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature: typeof temperature === 'number' ? temperature : undefined,
      },
    });

    return res.json({ text: response.text });
  } catch (err: any) {
    console.error('Error in /api/gemini/generate:', err);
    return res.status(500).json({ error: err?.message || 'Gemini generation failed' });
  }
});

// Endpoint: SSE Streaming content generation
app.post('/api/gemini/stream', async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }
    const { prompt, model, systemInstruction, temperature } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const stream = await ai.models.generateContentStream({
      model: model || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature: typeof temperature === 'number' ? temperature : undefined,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Error in /api/gemini/stream:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err?.message || 'Gemini stream failed' });
    }
    res.write(`data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`);
    res.end();
  }
});

// WebSocket Server for Gemini Live API
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  if (!ai) {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on server' }));
    clientWs.close();
    return;
  }

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'You are an expert marketing consultant for Avito and local business lead generation.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
            }
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        },
      },
    });

    clientWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('Live WebSocket message parse error:', err);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch (_) {}
    });
  } catch (err: any) {
    console.error('Error connecting to Gemini Live API:', err);
    clientWs.send(JSON.stringify({ error: err?.message || 'Failed to connect to Live API' }));
    clientWs.close();
  }
});

// Handle WebSocket upgrade for Live API
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/live' || url.pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (err) {
    console.error('Error in server upgrade:', err);
  }
});

// Start Express and Vite middleware in dev, or serve static dist in prod
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (mode: ${isDev ? 'dev' : 'production'})`);
  });
}

startServer();
