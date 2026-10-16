// Teste da interface com API real: a webcam é substituída por um canvas que mostra fotos de teste.
// Precisa da API (porta 8000) e do frontend (porta 5173) rodando, e das fotos em frontend/public/_teste.
const path = require('path');
const puppeteer = require('puppeteer-core');

const URL = 'http://localhost:5173';
const OUT = path.resolve(__dirname, '../teste-interface');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message));
  await page.evaluateOnNewDocument(() => {
    const c = document.createElement('canvas'); c.width = 960; c.height = 720;
    const ctx = c.getContext('2d'); const img = new Image();
    window.__foto = src => new Promise(r => { img.onload = r; img.src = src; });
    setInterval(() => {
      ctx.fillStyle = '#ccc'; ctx.fillRect(0, 0, 960, 720);
      if (img.naturalWidth) { const s = Math.min(960 / img.naturalWidth, 720 / img.naturalHeight); const w = img.naturalWidth * s, h = img.naturalHeight * s; ctx.drawImage(img, (960 - w) / 2, (720 - h) / 2, w, h); }
    }, 33);
    const stream = c.captureStream(30);
    // cada chamada recebe uma cópia, como acontece com uma webcam de verdade
    navigator.mediaDevices.getUserMedia = async () => stream.clone();
  });

  const clicar = async texto => {
    await page.evaluate(t => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === t).click(), texto);
    await sleep(300);
  };
  const esperarTexto = (texto, ms = 30000) => page.waitForFunction(t => document.body.innerText.includes(t), { timeout: ms }, texto);
  const tela = async nome => { await page.screenshot({ path: path.join(OUT, nome + '.png') }); console.log('ok', nome); };
  const digitar = async (ph, v) => { const h = await page.$(`input[placeholder="${ph}"]`); await h.click({ clickCount: 3 }); await h.type(v); };

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.__foto('/_teste/img2.jpg'));

  // Cadastro
  await clicar('Cadastro');
  await sleep(800);
  await digitar('Ex.: Ana Paula Moreira', 'Ana Teste');
  await digitar('000000', '000123');
  await digitar('Ex.: Vendedora', 'Vendedora');
  await clicar('Capturar foto');
  await esperarTexto("Foto congelada · rosto detectado");
  await tela('1-cadastro-foto');
  await clicar('Cadastrar funcionário');
  await esperarTexto('já pode registrar o ponto');
  await tela('2-cadastro-sucesso');

  // Ponto: mesma pessoa, outra foto
  await clicar('Registrar ponto');
  await page.evaluate(() => window.__foto('/_teste/img4.jpg'));
  await sleep(1200);
  await page.click('.btn-registrar');
  await esperarTexto('registrada às');
  await tela('3-ponto-reconhecido');

  // Ponto: pessoa não cadastrada
  await page.click('.btn-registrar');
  await page.evaluate(() => window.__foto('/_teste/img20.jpg'));
  await sleep(1200);
  await page.click('.btn-registrar');
  await esperarTexto('Funcionário não reconhecido');
  await tela('4-ponto-nao-reconhecido');

  // Histórico
  await clicar('Histórico');
  await esperarTexto('Ana Teste');
  await tela('5-historico');

  // Limpeza: exclui a funcionária de teste pela interface
  await clicar('Cadastro');
  await esperarTexto('Ana Teste');
  await clicar('Excluir');
  await esperarTexto('Excluir funcionário?');
  await page.evaluate(() => [...document.querySelectorAll('.modal button')].find(b => b.textContent === 'Excluir').click());
  await esperarTexto('Nenhum funcionário cadastrado');
  console.log('ok exclusão');

  await browser.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
