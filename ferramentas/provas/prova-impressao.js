/* Regressão da impressão agrupada.

   O pdf-lib de mentira aqui imita o ponto que quebrou de verdade: uma fonte só
   vale depois que o documento de origem é liberado (flush). Se a página for
   embarcada antes disso, a referência fica pendurada — foi o que apagava o
   negrito ao agrupar em meia folha. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = '/sessions/gallant-relaxed-planck/mnt/site';
const LARG = JSON.parse(fs.readFileSync(path.join(__dirname, 'helv.json'), 'utf8'));

function largura(nome, texto, tam) {
  const t = LARG[nome];
  let s = 0;
  for (const ch of texto) {
    const c = ch.codePointAt(0);
    s += (c >= 32 && c < 256) ? t[c - 32] : t[12];
  }
  return s * tam / 1000;
}

const eventos = [];
let seq = 0;

function docFalso(id, l, a) {
  const fontes = [];
  let liberado = false;

  const pagina = {
    getSize: () => ({ width: l, height: a }),
    getWidth: () => l, getHeight: () => a,
    drawText: (t, o) => { o.font.usada = true; },
    drawLine: () => {}, drawRectangle: () => {},
    drawPage: (emb) => eventos.push({ n: seq++, o: 'drawPage', de: emb.origem })
  };

  const doc = {
    id: id,
    fontes: fontes,
    liberado: () => liberado,
    embedFont: async (n) => { const f = { nome: n, usada: false }; fontes.push(f); return f; },
    getPages: () => [pagina],
    getPageIndices: () => [0],
    addPage: () => pagina,
    setTitle: () => {}, setProducer: () => {}, setCreator: () => {},
    flush: async () => { liberado = true; eventos.push({ n: seq++, o: 'flush', de: id }); },
    save: async () => { liberado = true; return new Uint8Array([37, 80, 68, 70]); }
  };
  return doc;
}

let contador = 0;
const TAM = {
  'assets/pdf/outros-documentos.pdf': [420, 595],
  'assets/pdf/receituario-simples.pdf': [420, 595],
  'assets/pdf/requisicao-exames.pdf': [595, 420]
};
let proximoModelo = null;

const finalDoc = docFalso('final', 595, 842);
finalDoc.copyPages = async (origem) => {
  eventos.push({ n: seq++, o: 'copyPages', de: origem.id, origemLiberada: origem.liberado() });
  return [{}];
};
finalDoc.embedPage = async (pg) => {
  // qual documento é dono desta página?
  const dono = criados.filter(d => d.getPages()[0] === pg)[0];
  eventos.push({ n: seq++, o: 'embedPage', de: dono.id, origemLiberada: dono.liberado() });
  const t = dono.tamanho;
  return { width: t[0], height: t[1], origem: dono.id };
};
finalDoc.addPage = () => ({
  getSize: () => ({ width: 595, height: 842 }),
  drawLine: () => {}, drawText: () => {},
  drawPage: (emb) => eventos.push({ n: seq++, o: 'drawPage', de: emb.origem })
});

const criados = [];

const janela = {
  PDFLib: {
    PDFDocument: {
      load: async () => {
        const t = TAM[proximoModelo] || [595, 842];
        const d = docFalso('doc' + (++contador) + ' ' + path.basename(proximoModelo), t[0], t[1]);
        d.tamanho = t;
        criados.push(d);
        return d;
      },
      create: async () => finalDoc
    },
    StandardFonts: {
      Helvetica: 'Helvetica', HelveticaBold: 'Helvetica-Bold',
      HelveticaOblique: 'Helvetica-Oblique', HelveticaBoldOblique: 'Helvetica-BoldOblique'
    },
    rgb: (r, g, b) => ({ r, g, b }),
    degrees: (d) => ({ d })
  },
  fetch: async (u) => { proximoModelo = u; return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; }
};

// as fontes de mentira precisam medir texto para o markdown quebrar linha
const embedOriginal = docFalso;
const ctx = vm.createContext(janela);
ctx.window = janela;
ctx.document = { addEventListener: () => {}, querySelector: () => null };
ctx.console = console;
ctx.fetch = janela.fetch;

for (const f of ['markdown.js', 'pdf-comum.js', 'doc-outros.js',
                 'doc-receituario-simples.js', 'doc-requisicao-exames.js', 'impressao.js']) {
  vm.runInContext(fs.readFileSync(path.join(SITE, 'assets/js', f), 'utf8'), ctx, { filename: f });
}

// mede texto de verdade, senão o markdown não consegue quebrar linha
const embedFontReal = async function (n) { const f = { nome: n, widthOfTextAtSize: (t, s) => largura(n, t, s), usada: false }; return f; };
[finalDoc].concat(criados).forEach(d => { d.embedFont = embedFontReal; });
const loadOriginal = janela.PDFLib.PDFDocument.load;
janela.PDFLib.PDFDocument.load = async function () {
  const d = await loadOriginal.apply(this, arguments);
  d.embedFont = embedFontReal;
  return d;
};

const L = janela.Laudos;
const I = janela.Impressao;
const mod = (id) => L.documentos.filter(d => d.id === id)[0];

const base = {
  nome: 'JOÃO DA SILVA', prontuario: '1234567', dataSolicitacao: '10/08/2026',
  profissional: 'Paulo Aires', tituloProfissional: 'Neurologista',
  crm: '12345', crmUf: 'PB', rqe: '6789'
};

const itens = [
  { documento: mod('outros-documentos'),
    dados: Object.assign({}, base, { assunto: 'Atestado', teor: 'Atesto que **teste** compareceu.', mostrarPrescritor: true }) },
  { documento: mod('receituario-simples'),
    dados: Object.assign({}, base, { prescricao: 'Dipirona 500 mg ------ 20 comp.' }) }
];

(async () => {
  const r = await I.gerar(itens, { agrupar: true, nomePaciente: 'João da Silva' });
  console.log('folhas:', r.folhas, '| arquivo:', r.nome);
  console.log('\nordem das operações:');
  eventos.forEach(e => console.log(' ', e.o.padEnd(10), e.de,
    e.origemLiberada === undefined ? '' : (e.origemLiberada ? '· origem liberada ✔' : '· ORIGEM NÃO LIBERADA ✘')));

  const falhas = eventos.filter(e => (e.o === 'embedPage' || e.o === 'copyPages') && !e.origemLiberada);
  if (falhas.length) { console.error('\nFALHOU: página embarcada antes do flush'); process.exit(1); }
  console.log('\nOK: toda origem foi liberada antes de ser embarcada');
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
