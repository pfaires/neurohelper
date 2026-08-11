/* Prova de mesa: roda os módulos do site em Node com um pdf-lib de mentira.
   Não gera PDF — registra o que teria sido desenhado, que é o que interessa
   para conferir a quebra de linhas, o recuo e a troca de fonte do markdown. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = '/sessions/gallant-relaxed-planck/mnt/site';
const LARG = JSON.parse(fs.readFileSync(path.join(__dirname, 'helv.json'), 'utf8'));

function larguraDe(nome, texto, tam) {
  const t = LARG[nome];
  let s = 0;
  for (const ch of texto) {
    const c = ch.codePointAt(0);
    s += (c >= 32 && c < 256) ? t[c - 32] : t[',' .charCodeAt(0) - 32];
  }
  return s * tam / 1000;
}

function fonteFalsa(nome) {
  return { nome, widthOfTextAtSize: (t, s) => larguraDe(nome, t, s) };
}

const ops = [];
function paginaFalsa(l, a) {
  return {
    getSize: () => ({ width: l, height: a }),
    getWidth: () => l, getHeight: () => a,
    drawText: (t, o) => ops.push({ tipo: 'txt', t, x: o.x, y: o.y, tam: o.size, fonte: o.font.nome }),
    drawLine: () => {}, drawRectangle: () => {}, drawPage: () => {}
  };
}

const StandardFonts = {
  Helvetica: 'Helvetica', HelveticaBold: 'Helvetica-Bold',
  HelveticaOblique: 'Helvetica-Oblique', HelveticaBoldOblique: 'Helvetica-BoldOblique'
};

function docFalso(l, a, n) {
  const pgs = [];
  for (let i = 0; i < (n || 1); i++) pgs.push(paginaFalsa(l, a));
  return {
    embedFont: async (n) => fonteFalsa(n),
    getPages: () => pgs,
    save: async () => new Uint8Array([37, 80, 68, 70])
  };
}

// tamanho da página de cada modelo, para o doc de mentira
const TAM_MODELO = {
  'requisicao-exames': [595, 420], 'receituario-simples': [420, 595],
  'receituario-controle-especial': [842, 595], 'outros-documentos': [420, 595],
  'lme': [595, 842], 'apac': [595, 842], 'mudanca-procedimento': [595, 842]
};
let modeloAtual = 'outros-documentos';

const janela = {
  PDFLib: {
    PDFDocument: {
      load: async () => { const t = TAM_MODELO[modeloAtual] || [595, 842]; return docFalso(t[0], t[1]); },
      create: async () => docFalso(595, 842)
    },
    StandardFonts,
    rgb: (r, g, b) => ({ r, g, b }),
    degrees: (d) => ({ d })
  },
  fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
};

const ctx = vm.createContext(janela);
ctx.window = janela;
ctx.document = { addEventListener: () => {}, querySelector: () => null };
ctx.console = console;
ctx.Promise = Promise;
ctx.fetch = janela.fetch;

for (const f of ['markdown.js', 'pdf-comum.js', 'doc-outros.js', 'doc-receituario-simples.js']) {
  vm.runInContext(fs.readFileSync(path.join(SITE, 'assets/js', f), 'utf8'), ctx, { filename: f });
}

function mod(id) { return janela.Laudos.documentos.filter(d => d.id === id)[0]; }

function desenho(area) {
  const dentro = ops.filter(o => !area ||
    (o.x >= area[0] - 1 && o.x <= area[2] + 40 && o.y >= area[1] - 2 && o.y <= area[3] + 2));
  return dentro.map(o =>
    `y=${o.y.toFixed(1).padStart(6)} x=${o.x.toFixed(1).padStart(6)} ` +
    `${o.tam.toFixed(1).padStart(5)} ${o.fonte.replace('Helvetica', 'H').padEnd(9)} ${JSON.stringify(o.t)}`
  ).join('\n');
}

const TEOR = [
  '# Relatório médico',
  '',
  'O paciente **João da Silva** encontra-se em acompanhamento no ambulatório de',
  'neurologia desde 2023, com diagnóstico de *esclerose múltipla* remitente-recorrente.',
  '',
  '## Conduta',
  '',
  '- Manter fingolimode 0,5 mg/dia',
  '- Ressonância de crânio em 6 meses',
  '- Retorno em 3 meses',
  '',
  '1. Evitar exposição a calor extremo',
  '2. Manter vacinação em dia',
  '',
  '---',
  '',
  '> Paciente orientado quanto aos riscos e benefícios do tratamento.',
  '',
  'Sem mais para o momento. Um texto sem marcação nenhuma tem de continuar saindo',
  'exatamente como antes, quebrando por largura quando a linha for longa demais para',
  'caber na área reservada do formulário.'
].join('\n');

const dados = {
  nome: 'JOÃO DA SILVA', prontuario: '1234567', dataSolicitacao: '10/08/2026',
  assunto: 'Relatório médico', teor: TEOR, mostrarPrescritor: true,
  profissional: 'Paulo Aires', tituloProfissional: 'Neurologista',
  crm: '12345', crmUf: 'PB', rqe: '6789'
};

(async () => {
  let r = await janela.Laudos.preencher(mod('outros-documentos'), dados);
  console.log('=== outros documentos, com dados do prescritor ===');
  console.log('cortou:', r.cortou);
  console.log(desenho(null));

  ops.length = 0;
  const d2 = Object.assign({}, dados, { mostrarPrescritor: false, assunto: '' });
  r = await janela.Laudos.preencher(mod('outros-documentos'), d2);
  console.log('\n=== sem título e sem dados do prescritor (só as 6 primeiras e as 3 últimas) ===');
  console.log('cortou:', r.cortou);
  const l = desenho(null).split('\n');
  console.log(l.slice(0, 6).concat(['   ...'], l.slice(-3)).join('\n'));

  ops.length = 0;
  modeloAtual = 'receituario-simples';
  r = await janela.Laudos.preencher(mod('receituario-simples'), {
    nome: 'MARIA', prontuario: '99', dataSolicitacao: '10/08/2026',
    prescricao: 'Ácido valproico 500 mg ------------------ 60 comp.\nTomar 1 comprimido de 12/12 h.\n\nCarbamazepina 200 mg --------------- 30 comp.\nTomar 1 comprimido à noite.'
  });
  console.log('\n=== receituário simples, texto sem marcação (regressão) ===');
  console.log('cortou:', r.cortou);
  console.log(desenho(null));
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
