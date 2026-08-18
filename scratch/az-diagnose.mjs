// A-Z truncation diagnostic via Chrome DevTools Protocol (Node 24 native WebSocket)
// Usage: node scratch/az-diagnose.mjs [port]
const CDP_PORT = process.argv[2] || 9222;
const URL = 'http://127.0.0.1:8090/gallery.html?sort=az';

async function getTarget() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
      const targets = await res.json();
      const page = targets.find(t => t.type === 'page');
      if (page) return page;
    } catch (e) { /* not ready */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('No CDP page target found');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error('WS error'));
  });
}

let msgId = 0;
function send(ws, method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    const handler = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression) {
  const res = await send(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.result && res.result.exceptionDetails) {
    return { error: JSON.stringify(res.result.exceptionDetails).slice(0, 300) };
  }
  return res.result ? res.result.result.value : undefined;
}

const target = await getTarget();
const ws = await connect(target.webSocketDebuggerUrl);
console.log('connected to', target.url);

await send(ws, 'Runtime.enable');
await send(ws, 'Page.enable');
await send(ws, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send(ws, 'Page.navigate', { url: URL });

// wait for network idle
await new Promise(r => setTimeout(r, 6000));

const summary = await evaluate(ws, `(() => {
  const cards = [...document.querySelectorAll('#gallery-grid .video-card')];
  const groups = [...document.querySelectorAll('.gallery-az-group')];
  const lastGroup = groups[groups.length - 1];
  const lastGroupCards = lastGroup ? lastGroup.querySelectorAll('.video-card').length : 0;
  const lastCard = cards[cards.length - 1];
  const zeroHeight = cards.filter(c => c.getBoundingClientRect().height === 0).length;
  const zeroWidth = cards.filter(c => c.getBoundingClientRect().width === 0).length;
  const missingImg = cards.filter(c => !c.querySelector('img')).length;
  const lastRect = lastCard ? {
    top: lastCard.getBoundingClientRect().top,
    height: lastCard.getBoundingClientRect().height,
    width: lastCard.getBoundingClientRect().width
  } : null;
  return {
    totalCards: cards.length,
    groups: groups.length,
    lastGroupId: lastGroup ? lastGroup.id : null,
    lastGroupCards,
    lastCardId: lastCard ? lastCard.id : null,
    zeroHeightCards: zeroHeight,
    zeroWidthCards: zeroWidth,
    missingImgCards: missingImg,
    lastRect,
    bodyScrollHeight: document.body.scrollHeight,
    docScrollHeight: document.documentElement.scrollHeight,
    gridHeight: document.getElementById('gallery-grid').getBoundingClientRect().height,
    cssLoaded: getComputedStyle(document.body).fontFamily.length > 0
  };
})()`);
console.log('SUMMARY:', JSON.stringify(summary, null, 2));

// Now scroll to the very bottom and check the last group visibility
await evaluate(ws, `window.scrollTo(0, document.documentElement.scrollHeight); true`);
await new Promise(r => setTimeout(r, 2500));

const afterScroll = await evaluate(ws, `(() => {
  const groups = [...document.querySelectorAll('.gallery-az-group')];
  const last = groups[groups.length - 1];
  const r = last ? last.getBoundingClientRect() : null;
  const cardsInLast = last ? last.querySelectorAll('.video-card').length : 0;
  const renderedImgs = last ? last.querySelectorAll('img').length : 0;
  const visibleCards = last ? [...last.querySelectorAll('.video-card')].filter(c => {
    const cr = c.getBoundingClientRect();
    return cr.height > 0 && cr.width > 0;
  }).length : 0;
  return {
    scrollY: window.scrollY,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    lastGroupRect: r ? { top: r.top, bottom: r.bottom, height: r.height } : null,
    cardsInLast, renderedImgs, visibleCards
  };
})()`);
console.log('AFTER SCROLL:', JSON.stringify(afterScroll, null, 2));

// Screenshot bottom region for the record
const shot = await send(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
if (shot.result && shot.result.data) {
  const fs = await import('node:fs');
  fs.writeFileSync(process.env.TEMP + '\\az-bottom.png', Buffer.from(shot.result.data, 'base64'));
  console.log('screenshot saved');
}

ws.close();
process.exit(0);
