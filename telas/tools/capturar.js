// Captura cada tela/estado do protótipo exportado do Claude Design em PNG.
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const EXPORT = path.resolve(__dirname, '../../design/export');
const OUT = path.resolve(__dirname, '../png');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
// Horário fixo nas capturas: 14/10/2026, 16:47
const FIXED = new Date(2026, 9, 14, 16, 47, 12).getTime();

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(EXPORT, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(p, (err, buf) => {
        if (err) { rsp.writeHead(404); return rsp.end(); }
        rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
        rsp.end(buf);
      });
    }).listen(0, () => res(srv));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/Ponto%20Facial.dc.html`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(fixed => {
    const Real = Date; const off = fixed - Real.now();
    class FakeDate extends Real {
      constructor(...a) { a.length ? super(...a) : super(Real.now() + off); }
      static now() { return Real.now() + off; }
    }
    window.Date = FakeDate;
  }, FIXED);

  async function open() {
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await sleep(800);
    // esconde o botão de demonstração nas capturas
    await page.addStyleTag({ content: 'button[title="Controle de demonstração"]{display:none!important}' });
  }
  // last=true pega o último botão com o texto (os atalhos de estado vêm depois das opções no painel de demonstração)
  async function click(text, last = false) {
    const ok = await page.evaluate((text, last) => {
      const els = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === text);
      const el = last ? els[els.length - 1] : els[0];
      if (el) { el.click(); return true; } return false;
    }, text, last);
    if (!ok) throw new Error('botão não encontrado: ' + text);
    await sleep(350);
  }
  async function demo(fn) {
    await page.evaluate(() => document.querySelector('button[title="Controle de demonstração"]').click());
    await sleep(250);
    await fn();
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Fechar' && x.closest('[style*="position:fixed"], [style*="position: fixed"]'));
      if (b) b.click();
    });
    await sleep(300);
  }
  async function shot(name) {
    await sleep(400);
    // o selo de status da câmera fala da câmera do robô de captura, não da tela; some nas imagens
    await page.evaluate(() => document.querySelectorAll('div').forEach(d => {
      if (d.children.length === 1 && /^Câmera (indisponível|ativa)|^Aguardando permissão/.test(d.textContent.trim())) d.style.visibility = 'hidden';
    }));
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('ok', name);
  }
  async function type(placeholder, value) {
    const h = await page.$(`input[placeholder="${placeholder}"]`);
    await h.click({ clickCount: 3 });
    await h.type(value);
  }

  // ---------- Registrar ponto ----------
  await open();
  await shot('01-ponto-aguardando');
  await demo(() => click('Processando'));
  await shot('02-ponto-processando');
  await demo(async () => { await click('Reconhecido como Camila Santos'); await click('Reconhecido', true); });
  await shot('03-ponto-reconhecido');
  await demo(() => click('Não reconhecido', true));
  await shot('04-ponto-nao-reconhecido');
  await demo(() => click('Nenhum rosto', true));
  await shot('05-ponto-nenhum-rosto');
  await demo(() => click('Mais de um rosto', true));
  await shot('06-ponto-mais-de-um-rosto');
  await demo(() => click('Aguardando'));
  await click('Abrir modo quiosque');
  await shot('07-ponto-modo-quiosque');

  // ---------- Cadastro ----------
  await open();
  await click('Cadastro');
  await shot('08-cadastro-inicial');
  await type('000000', '000123');
  await click('Cadastrar funcionário');
  await shot('09-cadastro-validacao');
  await open();
  await click('Cadastro');
  await type('Ex.: Ana Paula Moreira', 'Lucas Henrique Martins');
  await type('000000', '000164');
  await type('Ex.: Vendedora', 'Vendedor');
  await click('Capturar foto');
  await shot('10-cadastro-foto-capturada');
  await click('Cadastrar funcionário');
  await shot('11-cadastro-sucesso');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Excluir'); b[3].click(); });
  await sleep(350);
  await shot('12-cadastro-confirmar-exclusao');

  // ---------- Histórico ----------
  await open();
  await click('Histórico');
  await shot('13-historico-hoje');
  await type('Buscar por nome ou matrícula', 'Fernanda');
  await shot('14-historico-sem-resultado');

  await browser.close();
  srv.close();
})().catch(e => { console.error(e); process.exit(1); });
