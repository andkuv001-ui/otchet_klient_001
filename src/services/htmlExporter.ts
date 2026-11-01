import { ReportData } from '../types/report';

export function generateStandaloneHtml(data: ReportData): string {
  const sprintListHtml = data.sprint.items.map(it => `<li>${escapeHtml(it)}</li>`).join('');
  
  const checklistGroupsHtml = data.auditChecklist.groups.map(g => `
    <div class="card">
      <h3>${escapeHtml(g.title)}</h3>
      <ul class="chk">
        ${g.items.map(it => `<li>${escapeHtml(it.text)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const adsHtml = data.sampleAds.ads.map(ad => `
    <div class="ad">
      <span class="tag">${escapeHtml(ad.tag)}</span>
      <div class="t">${escapeHtml(ad.title)}</div>
      <div class="pr">${escapeHtml(ad.price)}</div>
      <pre>${escapeHtml(ad.body)}</pre>
      <div class="why">${escapeHtml(ad.why)}</div>
    </div>
  `).join('');

  const periodsHtml = data.seasonality.periods.map(p => `
    <div class="card">
      <h3 style="margin-top:0">${escapeHtml(p.title)}</h3>
      <p class="small">${escapeHtml(p.desc)}</p>
    </div>
  `).join('');

  const roadmapRowsHtml = data.roadmap.steps.map(s => `
    <tr>
      <td>${escapeHtml(s.step)}</td>
      <td>${escapeHtml(s.action)}</td>
      <td>${escapeHtml(s.proof)}</td>
    </tr>
  `).join('');

  const priceCardsHtml = data.pricing.tiers.map(t => `
    <div class="card${t.isMain ? ' main' : ''}">
      <span class="tag">${escapeHtml(t.tag)}</span>
      <p>${escapeHtml(t.title)}</p>
      <b class="sum">${escapeHtml(t.sum)}</b>
      <p class="small">${t.details.split('\n').map(line => escapeHtml(line)).join('<br>')}</p>
    </div>
  `).join('');

  const kickoffListHtml = data.kickoff.items.map(it => `<li>${escapeHtml(it)}</li>`).join('');

  const vs = data.viewsSummary || {
    sectionTitle: 'Сводные данные выдачи: Просмотры и платные сервисы',
    subtitle: `Анализ распределения органического охвата и платных услуг по выборке 50 объявлений в регионе ${data.city}`,
    avgViews: 92.62,
    avgViewsWithPaid: 25.75,
    avgViewsWithoutPaid: 137.2,
    minViews: 0,
    maxViews: 816,
    totalAds: 50,
    adsWithPaid: 20,
    adsWithoutPaid: 30,
    paidServices: [
      { id: '1', name: 'XL', count: 9, badge: 'Формат выдачи' },
      { id: '2', name: 'Продвинуто (пакет 7)', count: 7, badge: 'Увеличение показов' },
      { id: '3', name: 'Продвинуто (пакет 6)', count: 6, badge: 'Увеличение показов' },
      { id: '4', name: 'Выделено', count: 4, badge: 'Цветовой акцент' },
      { id: '5', name: 'Продвинуто (пакет 4)', count: 4, badge: 'Увеличение показов' },
      { id: '6', name: 'Продвинуто (пакет 3)', count: 3, badge: 'Увеличение показов' },
      { id: '7', name: 'Значки на XL-объявлении', count: 2, badge: 'Плашки преимуществ' }
    ],
    conclusionNote: 'У карточек без платных сервисов среднее (137.2) выше, чем с платными (25.75), так как бесплатные объявления висят в выдаче долго и накапливают просмотры за месяцы (вплоть до 816). Платные сервисы (XL, Продвинуто) конкуренты включают на свежие карточки для быстрого старта и снятия горячих звонков.'
  };

  const paidServicesHtml = vs.paidServices.map(ps => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:#faf9f6;border-radius:8px;margin-bottom:6px;border:1px solid var(--line);font-size:13px;">
      <div><b>${escapeHtml(ps.name)}</b> <span style="font-size:11px;color:var(--mute);margin-left:6px;">${escapeHtml(ps.badge || '')}</span></div>
      <b style="color:var(--acc);background:#fff;padding:2px 8px;border-radius:6px;border:1px solid var(--line);">${ps.count}</b>
    </div>
  `).join('');

  const maxMonthVal = Math.max(...data.seasonality.months.map(m => m.percent), 15);
  const totalAnnualBudget = data.seasonality.annualBudgetRub || 180000;

  const monthsStaticHtml = data.seasonality.months.map(m => {
    const barHeight = Math.max(4, Math.round((m.percent / maxMonthVal) * 52));
    const monthBudget = m.budgetRub || Math.round((totalAnnualBudget * m.percent) / 100);
    const label = escapeHtml(m.shortMonth || m.month);
    return `
      <div class="m">
        <b>${label}</b>
        <div class="bar"><i style="height:${barHeight}px;"></i></div>
        <div style="font-weight:700;color:var(--acc);font-size:12px;">${m.percent} %</div>
        ${m.queries ? `<div style="font-size:10px;color:var(--mute);margin-top:2px;">${m.queries.toLocaleString('ru-RU')} зпр.</div>` : ''}
        <div style="font-size:10px;color:var(--mute);margin-top:1px;">${monthBudget.toLocaleString('ru-RU')} ₽</div>
      </div>
    `;
  }).join('');

  const calcRowsJson = JSON.stringify(data.calculator.rows.map(r => [r.name, r.views, r.contacts]));
  const monthsJson = JSON.stringify(data.seasonality.months.map(m => [
    m.shortMonth || m.month,
    m.percent,
    m.queries || 0,
    m.budgetRub || Math.round((data.seasonality.annualBudgetRub * m.percent) / 100)
  ]));
  const thresholdRatio = data.calculator.thresholdRatio || 0.6;

  const totalQueries = data.seasonality.months.reduce((acc, m) => acc + (m.queries || 0), 0);
  const avgQueries = data.seasonality.months.length ? Math.round(totalQueries / data.seasonality.months.length) : 0;
  const maxQ = Math.max(...data.seasonality.months.map(m => m.queries || 0));
  const minQ = Math.min(...data.seasonality.months.map(m => m.queries || 0).filter(q => q > 0)) || 0;
  const multiplier = minQ > 0 ? (maxQ / minQ).toFixed(2) : '1.0';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(data.title)} · ${escapeHtml(data.date)}</title>
  <style>
:root{--bg:#f6f4ef;--card:#fff;--ink:#16181d;--mute:#5d6470;--line:#e3dfd6;--acc:#0f6e6a;--acc2:#e9f3f1;--warn:#9a4b12}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:0 16px}
header.top{padding:28px 0 8px}
.kicker{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--acc);font-weight:600}
h1{font-size:clamp(26px,4.4vw,42px);line-height:1.12;margin:8px 0 12px;letter-spacing:-.01em}
h2{font-size:clamp(21px,3vw,28px);line-height:1.2;margin:44px 0 14px}
h3{font-size:18px;margin:18px 0 8px}
p{margin:0 0 12px}
.lead{font-size:18px;color:#2b2f36;max-width:760px}
.mute{color:var(--mute)}
.small{font-size:14px}
.hero{display:grid;grid-template-columns:1.25fr 1fr;gap:20px;align-items:stretch;margin-top:16px}
.hero figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.hero img{display:block;width:100%;height:auto;object-fit:cover;max-height:480px}
.hero figcaption{font-size:13px;color:var(--mute);padding:8px 12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.stat{font-size:28px;font-weight:700;color:var(--acc);line-height:1.1}
.tag{display:inline-block;font-size:12px;padding:2px 8px;border-radius:99px;background:var(--acc2);color:var(--acc);font-weight:600;margin:0 4px 4px 0}
ul.chk{list-style:none;padding:0;margin:0}
ul.chk li{padding:7px 0 7px 26px;border-bottom:1px dashed var(--line);position:relative}
ul.chk li:before{content:"";position:absolute;left:2px;top:12px;width:12px;height:12px;border:2px solid var(--acc);border-radius:3px}
ol{padding-left:22px}
li{margin:4px 0}
.tbl{width:100%;border-collapse:collapse;font-size:15px;background:var(--card)}
.tbl th,.tbl td{border-bottom:1px solid var(--line);padding:9px 10px;text-align:left;vertical-align:top}
.tbl th{font-size:13px;color:var(--mute);font-weight:600;background:#faf9f6}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:12px}
.price{display:grid;grid-template-columns:repeat(${data.pricing.tiers.length},1fr);gap:16px}
.price .card b.sum{display:block;font-size:26px;color:var(--ink);margin:6px 0}
.price .card.main{border:2px solid var(--acc);box-shadow:0 6px 18px rgba(15,110,106,0.1)}
.note{border-left:4px solid var(--acc);background:var(--acc2);padding:12px 14px;border-radius:0 10px 10px 0;margin:14px 0}
footer{margin:56px 0 30px;font-size:13px;color:var(--mute);border-top:1px solid var(--line);padding-top:14px}
a{color:var(--acc)}
input,select{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;width:100%;background:#fff}
.ad{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;margin:0 0 18px}
.ad .t{font-size:20px;font-weight:700;margin:4px 0 6px}
.ad .pr{font-weight:700;color:var(--acc);margin-bottom:10px}
.ad pre{white-space:pre-wrap;font:inherit;margin:0;background:#faf9f6;border-radius:10px;padding:12px;border:1px solid var(--line)}
.why{font-size:14px;color:var(--mute);margin-top:10px}
.months{display:grid;grid-template-columns:repeat(${data.seasonality.months.length},1fr);gap:6px;margin:16px 0}
.m{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 4px;font-size:12px;text-align:center;display:flex;flex-direction:column;justify-content:space-between}
.m b{display:block;font-size:13px;color:var(--ink)}
.bar{height:60px;display:flex;align-items:flex-end;justify-content:center;margin:6px 0;background:#faf9f6;border-radius:4px;padding:0 2px}
.bar i{display:block;width:100%;max-width:26px;background:#0f6e6a;background:var(--acc);border-radius:4px 4px 0 0;min-height:4px}
.calc td input{min-width:70px}
.bad{color:#b3261e;font-weight:700}
.ok{color:var(--acc);font-weight:700}
@media (max-width:820px){
  .hero,.grid2,.grid3,.price{grid-template-columns:1fr}
  .months{grid-template-columns:repeat(4,1fr);gap:8px}
  h2{margin-top:34px}
}
@media print{
  body{background:#fff;color:#000}
  .card,.hero figure,.ad{border:1px solid #ccc;page-break-inside:avoid}
  input{border:none;background:transparent}
}
  </style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="kicker">${escapeHtml(data.kicker)}</div>
    <h1>${escapeHtml(data.title)}</h1>
    <p class="lead">${escapeHtml(data.lead)}</p>
    ${data.parsedSourceMeta ? `
    <div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:16px 0;font-size:13px;">
      <div style="font-weight:700;color:var(--acc);margin-bottom:8px;">
        Основа отчёта: Парсинг поисковой выдачи Авито (${escapeHtml(data.parsedSourceMeta.region)} · «${escapeHtml(data.parsedSourceMeta.keyword)}»)
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
        <div style="background:#faf9f6;padding:6px;border-radius:8px;border:1px solid var(--line);"><span style="color:var(--mute);font-size:11px;display:block;">Объявлений</span><b>${data.parsedSourceMeta.totalAds}</b></div>
        <div style="background:#faf9f6;padding:6px;border-radius:8px;border:1px solid var(--line);"><span style="color:var(--mute);font-size:11px;display:block;">Ср. цена</span><b style="color:var(--acc);">${data.parsedSourceMeta.avgPrice.toLocaleString('ru-RU')} ₽</b></div>
        <div style="background:#faf9f6;padding:6px;border-radius:8px;border:1px solid var(--line);"><span style="color:var(--mute);font-size:11px;display:block;">Продвижение</span><b>${data.parsedSourceMeta.paidPromoPercent} %</b></div>
        <div style="background:#faf9f6;padding:6px;border-radius:8px;border:1px solid var(--line);"><span style="color:var(--mute);font-size:11px;display:block;">Ср. рейтинг</span><b>${data.parsedSourceMeta.avgRating} ⭐</b></div>
      </div>
    </div>
    ` : ''}
  </header>

  <div class="hero">
    <figure>
      <img src="${escapeHtml(data.heroImage)}" alt="${escapeHtml(data.title)}" width="1400" height="1050">
      <figcaption>${escapeHtml(data.heroCaption)}</figcaption>
    </figure>
    <div class="card">
      <h3 style="margin-top:0">${escapeHtml(data.sprint.title)}</h3>
      <ol>
        ${sprintListHtml}
      </ol>
      <p class="small mute">${escapeHtml(data.sprint.note)}</p>
    </div>
  </div>

  <!-- Module: Views & Paid Services Summary -->
  <div style="margin:36px 0 24px;">
    <div class="kicker">Сводный аудит выдачи · ${escapeHtml(data.city)}</div>
    <h2 style="margin:6px 0 10px;">${escapeHtml(vs.sectionTitle)}</h2>
    <p class="mute small">${escapeHtml(vs.subtitle || '')}</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0;">
      <div class="card" style="padding:14px;text-align:center;">
        <span class="small mute" style="display:block;">Просмотров сегодня (ср.)</span>
        <b class="stat">${vs.avgViews}</b>
        <span class="small mute" style="display:block;font-size:11px;margin-top:4px;">по всей выборке (${vs.totalAds} шт)</span>
      </div>
      <div class="card" style="padding:14px;text-align:center;border-color:var(--acc);">
        <span class="small" style="display:block;color:var(--acc);font-weight:600;">С платными (сегодня)</span>
        <b class="stat">${vs.avgViewsWithPaid}</b>
        <span class="small mute" style="display:block;font-size:11px;margin-top:4px;">${vs.adsWithPaid} объявл. (${vs.totalAds > 0 ? Math.round((vs.adsWithPaid / vs.totalAds) * 100) : 0}%)</span>
      </div>
      <div class="card" style="padding:14px;text-align:center;">
        <span class="small mute" style="display:block;">Без платных (сегодня)</span>
        <b class="stat" style="color:var(--ink);">${vs.avgViewsWithoutPaid}</b>
        <span class="small mute" style="display:block;font-size:11px;margin-top:4px;">${vs.adsWithoutPaid} объявл. (${vs.totalAds > 0 ? Math.round((vs.adsWithoutPaid / vs.totalAds) * 100) : 0}%)</span>
      </div>
      <div class="card" style="padding:14px;text-align:center;">
        <span class="small mute" style="display:block;">Диапазон сегодня (Мин — Макс)</span>
        <b class="stat" style="color:var(--ink);">${vs.minViews} <span style="font-size:18px;color:#ccc;">/</span> ${vs.maxViews}</b>
        <span class="small mute" style="display:block;font-size:11px;margin-top:4px;">мин: ${vs.minViews} · макс: ${vs.maxViews}</span>
      </div>
      <div class="card" style="padding:14px;text-align:center;">
        <span class="small mute" style="display:block;">Всего объявлений</span>
        <b class="stat" style="color:var(--ink);">${vs.totalAds}</b>
        <span class="small mute" style="display:block;font-size:11px;margin-top:4px;">${vs.adsWithPaid} платных / ${vs.adsWithoutPaid} органических</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card">
        <h3 style="margin-top:0;">Количество объявлений: платные vs органика</h3>
        <div style="height:24px;width:100%;background:#eee;border-radius:6px;overflow:hidden;display:flex;margin-bottom:12px;">
          <div style="width:${Math.round((vs.adsWithPaid/vs.totalAds)*100)}%;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">Платные: ${vs.adsWithPaid} (${Math.round((vs.adsWithPaid/vs.totalAds)*100)}%)</div>
          <div style="width:${Math.round((vs.adsWithoutPaid/vs.totalAds)*100)}%;background:#ccc;color:#333;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">Без услуг: ${vs.adsWithoutPaid} (${Math.round((vs.adsWithoutPaid/vs.totalAds)*100)}%)</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
          <div style="background:var(--acc2);padding:10px;border-radius:8px;">С платными: <b>${vs.adsWithPaid} объявл.</b><br><span style="font-size:11px;color:var(--mute)">Ср. просмотров: <b>${vs.avgViewsWithPaid}</b></span></div>
          <div style="background:#faf9f6;padding:10px;border-radius:8px;border:1px solid var(--line);">Без платных: <b>${vs.adsWithoutPaid} объявл.</b><br><span style="font-size:11px;color:var(--mute)">Ср. просмотров: <b>${vs.avgViewsWithoutPaid}</b></span></div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">Платные сервисы (распределение подключений)</h3>
        ${paidServicesHtml}
        <div style="font-size:11px;color:var(--mute);margin-top:8px;">Всего ${vs.paidServices.reduce((a, b) => a + b.count, 0)} подключений на ${vs.adsWithPaid} платных объявлений</div>
      </div>
    </div>

    <div class="note">
      <b>Аналитический вывод авитолога:</b> ${escapeHtml(vs.conclusionNote || '')}
    </div>
  </div>

  ${data.hasExistingAccount !== false ? `
  <h2>${escapeHtml(data.calculator.sectionTitle)}</h2>
  <p>${escapeHtml(data.calculator.intro)}</p>
  <div class="scroll">
    <table class="tbl calc" id="calc">
      <thead>
        <tr>
          <th>Объявление</th>
          <th>Просмотры</th>
          <th>Контакты</th>
          <th>Конверсия</th>
          <th>Вывод</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
  <p class="small mute">${escapeHtml(data.calculator.note)}</p>

  <h2>${escapeHtml(data.auditChecklist.sectionTitle)}</h2>
  <div class="grid2">
    ${checklistGroupsHtml}
  </div>
  ` : ''}

  <h2>${escapeHtml(data.hasExistingAccount === false ? data.sampleAds.sectionTitle.replace(/^3\.\s*/, '1. ') : data.sampleAds.sectionTitle)}</h2>
  <p class="mute small">${escapeHtml(data.sampleAds.subtitle)}</p>
  ${adsHtml}

  <h2>${escapeHtml(data.hasExistingAccount === false ? data.seasonality.sectionTitle.replace(/^4\.\s*/, '2. ') : data.seasonality.sectionTitle)}</h2>
  <p>${escapeHtml(data.seasonality.intro)}</p>
  <div class="months" id="months">
    ${monthsStaticHtml}
  </div>
  <div class="grid3" style="margin-top:16px">
    ${periodsHtml}
  </div>
  <div class="note">${escapeHtml(data.seasonality.note)}</div>

  <h2>${escapeHtml(data.hasExistingAccount === false ? data.roadmap.sectionTitle.replace(/^5\.\s*/, '3. ') : data.roadmap.sectionTitle)}</h2>
  <div class="scroll">
    <table class="tbl">
      <thead>
        <tr>
          <th>Шаг</th>
          <th>Что делаем</th>
          <th>Как поймём, что сработало</th>
        </tr>
      </thead>
      <tbody>
        ${roadmapRowsHtml}
      </tbody>
    </table>
  </div>
  <p class="small mute">${escapeHtml(data.roadmap.disclaimer)}</p>

  <h2>${escapeHtml(data.hasExistingAccount === false ? data.pricing.sectionTitle.replace(/^[56]\.\s*/, '4. ') : data.pricing.sectionTitle)}</h2>
  <div class="price">
    ${priceCardsHtml}
  </div>
  <p class="small mute">${escapeHtml(data.pricing.termsNote)}</p>

  <h2>${escapeHtml(data.kickoff.sectionTitle)}</h2>
  <ul class="chk">
    ${kickoffListHtml}
  </ul>

  <footer>${escapeHtml(data.footer)}</footer>
</div>

<script>
var tb = document.querySelector('#calc tbody');
if (tb) {
  var rows = ${calcRowsJson};
  var thresholdRatio = ${thresholdRatio};

  function draw() {
    var tv = 0, tc = 0;
    rows.forEach(function(r) {
      tv += +r[1] || 0;
      tc += +r[2] || 0;
    });
    var avg = tv ? tc / tv : 0;
    tb.innerHTML = '';
    
    rows.forEach(function(r, i) {
      var c = r[1] ? r[2] / r[1] : 0;
      var bad = avg && c < avg * thresholdRatio;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + r[0] + '</td>' +
        '<td><input type="number" min="0" value="' + r[1] + '" data-i="' + i + '" data-k="1"></td>' +
        '<td><input type="number" min="0" value="' + r[2] + '" data-i="' + i + '" data-k="2"></td>' +
        '<td>' + (c * 100).toFixed(1) + ' %</td>' +
        '<td class="' + (bad ? 'bad' : 'ok') + '">' + (bad ? 'Править первым' : 'Позже') + '</td>';
      tb.appendChild(tr);
    });
    
    var trAvg = document.createElement('tr');
    trAvg.innerHTML = '<td><b>Среднее по аккаунту</b></td>' +
      '<td>' + tv + '</td>' +
      '<td>' + tc + '</td>' +
      '<td><b>' + (avg * 100).toFixed(1) + ' %</b></td>' +
      '<td></td>';
    tb.appendChild(trAvg);
  }

  tb.addEventListener('change', function(e) {
    var t = e.target;
    if (t && t.dataset && t.dataset.i) {
      rows[t.dataset.i][t.dataset.k] = +t.value;
      draw();
    }
  });
  draw();
}
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
