// Monta a prancha estilo Figma (PNG) e o PDF de entrega a partir das capturas em ../png.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DIR = path.resolve(__dirname, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const SECOES = [
  { titulo: 'Registrar ponto', desc: 'Terminal tipo quiosque na entrada da empresa. O funcionário olha para a câmera e toca em um botão.', telas: [
    ['01-ponto-aguardando', 'Aguardando', 'Câmera ativa e moldura de enquadramento. O tipo "Automático" segue a sequência do dia.'],
    ['02-ponto-processando', 'Processando', 'Imagem enviada para a API em Python; o DeepFace compara o rosto com os cadastrados.'],
    ['03-ponto-reconhecido', 'Reconhecido', 'Funcionário identificado: nome, cargo, tipo e horário gravados no banco, com o nível de confiança.'],
    ['04-ponto-nao-reconhecido', 'Não reconhecido', 'Nenhum cadastro próximo o suficiente do rosto capturado.'],
    ['05-ponto-nenhum-rosto', 'Nenhum rosto detectado', 'Orienta o funcionário a se posicionar de frente para a câmera.'],
    ['06-ponto-mais-de-um-rosto', 'Mais de um rosto', 'O registro é individual; pede para os demais saírem do enquadramento.'],
    ['07-ponto-modo-quiosque', 'Modo quiosque', 'Tela cheia, sem menu, para o tablet fixo na parede.'],
  ]},
  { titulo: 'Cadastro de funcionário', desc: 'Nome, matrícula, cargo e a foto de referência usada pelo reconhecimento facial.', telas: [
    ['08-cadastro-inicial', 'Formulário vazio', 'Câmera ao vivo para capturar a foto de referência e lista dos cadastrados.'],
    ['09-cadastro-validacao', 'Validação', 'Campos obrigatórios, matrícula já cadastrada e foto ausente.'],
    ['10-cadastro-foto-capturada', 'Foto capturada', 'Foto congelada com opção de refazer antes de cadastrar.'],
    ['11-cadastro-sucesso', 'Cadastro concluído', 'Funcionário entra na lista e já pode registrar o ponto.'],
    ['12-cadastro-confirmar-exclusao', 'Confirmar exclusão', 'Remove o funcionário mantendo os registros antigos no histórico.'],
  ]},
  { titulo: 'Histórico de registros', desc: 'Consulta das marcações por data, com busca por nome ou matrícula.', telas: [
    ['13-historico-hoje', 'Registros do dia', 'Resumo de quem entrou, está em intervalo e já saiu, e a lista de marcações.'],
    ['14-historico-sem-resultado', 'Busca sem resultado', 'Estado vazio quando a busca não encontra ninguém.'],
  ]},
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box} body{margin:0;font-family:'IBM Plex Sans',sans-serif;color:#151A21}
`;

function prancha() {
  let n = 0;
  const secoes = SECOES.map(s => `
    <section class="sec">
      <div class="sec-h"><h2>${s.titulo}</h2><p>${s.desc}</p></div>
      <div class="grid">${s.telas.map(([f, nome, desc]) => `
        <figure>
          <figcaption><span class="num">${String(++n).padStart(2, '0')}</span>${nome}</figcaption>
          <img src="png/${f}.png">
          <p>${desc}</p>
        </figure>`).join('')}
      </div>
    </section>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${CSS}
    body{background:#E6E7EA;width:3200px;padding:120px}
    header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:56px;margin-bottom:72px;border-bottom:2px solid #C9CFD6}
    header h1{margin:0;font-size:64px;font-weight:600;letter-spacing:-.02em;max-width:1700px;line-height:1.1}
    header .sub{margin-top:18px;font-size:26px;color:#5B6672}
    header dl{display:grid;grid-template-columns:auto auto;gap:10px 28px;margin:0;font-size:21px}
    header dt{color:#5B6672} header dd{margin:0;font-weight:500}
    .fluxo{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:96px}
    .fluxo span{background:#fff;border:1px solid #C9CFD6;border-radius:999px;padding:12px 22px;font-size:21px}
    .fluxo i{font-style:normal;color:#8C96A1;font-size:21px;align-self:center}
    .sec{margin-bottom:120px}
    .sec-h{margin-bottom:40px} .sec-h h2{margin:0;font-size:40px;font-weight:600} .sec-h p{margin:8px 0 0;font-size:22px;color:#5B6672}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:72px 56px}
    figure{margin:0}
    figcaption{font-size:20px;font-weight:500;color:#3B434D;margin-bottom:14px;display:flex;align-items:center;gap:12px}
    .num{font-family:'IBM Plex Mono',monospace;font-size:17px;background:#151A21;color:#fff;border-radius:6px;padding:3px 9px}
    figure img{width:100%;display:block;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.08),0 12px 32px rgba(21,26,33,.14)}
    figure p{margin:16px 0 0;font-size:18px;line-height:1.45;color:#5B6672}
    </style></head><body>
    <header>
      <div><h1>Sistema de Registro de Ponto com Reconhecimento Facial</h1><div class="sub">Protótipo de telas · ${SECOES.reduce((a, s) => a + s.telas.length, 0)} telas e estados</div></div>
      <dl><dt>Frontend</dt><dd>React</dd><dt>Backend</dt><dd>Python (API)</dd><dt>Reconhecimento</dt><dd>DeepFace</dd><dt>Resolução</dt><dd>1440 × 900</dd></dl>
    </header>
    <div class="fluxo">${['Cadastro do funcionário', 'Captura da foto', 'Armazenamento dos dados', 'Captura facial no ponto', 'DeepFace compara', 'Funcionário identificado', 'Data e horário gravados'].map(t => `<span>${t}</span>`).join('<i>→</i>')}</div>
    ${secoes}
  </body></html>`;
}

function pdf() {
  let n = 0;
  const total = SECOES.reduce((a, s) => a + s.telas.length, 0);
  const capa = `<div class="pg capa"><div>
      <div class="kicker">Protótipo de telas</div>
      <h1>Sistema de Registro de Ponto com Reconhecimento Facial</h1>
      <p>React · Python · DeepFace</p>
      <ol>${SECOES.map(s => `<li><b>${s.titulo}</b> — ${s.telas.length} ${s.telas.length > 1 ? 'telas' : 'tela'}</li>`).join('')}</ol>
    </div></div>`;
  const pgs = SECOES.flatMap(s => s.telas.map(([f, nome, desc]) => `
    <div class="pg"><div class="top"><span class="num">${String(++n).padStart(2, '0')}</span><b>${s.titulo}</b><span class="sep">/</span>${nome}<span class="pag">${n} de ${total}</span></div>
    <img src="png/${f}.png"><p>${desc}</p></div>`)).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${CSS}
    @page{size:A4 landscape;margin:0}
    .pg{width:297mm;height:210mm;padding:12mm 16mm;page-break-after:always;display:flex;flex-direction:column;gap:5mm;overflow:hidden}
    .top{display:flex;align-items:center;gap:10px;font-size:13pt;color:#3B434D}
    .top b{color:#151A21;font-weight:600} .sep{color:#B4BCC5} .pag{margin-left:auto;font-size:10pt;color:#8C96A1}
    .num{font-family:'IBM Plex Mono',monospace;font-size:10pt;background:#151A21;color:#fff;border-radius:4px;padding:2px 7px}
    .pg img{width:100%;border:1px solid #DDE1E6;border-radius:4px}
    .pg p{margin:0;font-size:11.5pt;color:#5B6672}
    .capa{justify-content:center;padding:0 28mm;background:#F3F4F6}
    .kicker{font-size:12pt;letter-spacing:.08em;text-transform:uppercase;color:#1F5AA6;font-weight:500}
    .capa h1{font-size:36pt;line-height:1.1;margin:6mm 0 4mm;font-weight:600;letter-spacing:-.02em;max-width:200mm}
    .capa p{font-size:15pt;color:#5B6672} .capa ol{margin-top:12mm;font-size:13pt;line-height:1.9;padding-left:6mm}
    </style></head><body>${capa}${pgs}</body></html>`;
}

(async () => {
  fs.writeFileSync(path.join(DIR, 'prancha.html'), prancha());
  fs.writeFileSync(path.join(DIR, 'entrega.html'), pdf());
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 3200, height: 1000, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.join(DIR, 'prancha.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(DIR, 'Prancha - Ponto Facial.png'), fullPage: true });
  await page.goto('file:///' + path.join(DIR, 'entrega.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(DIR, 'Protótipo - Ponto Facial.pdf'), preferCSSPageSize: true, printBackground: true });
  await browser.close();
  console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
