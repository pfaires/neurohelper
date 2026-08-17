/* Prova da reordenação dos documentos do atendimento.

   Duas coisas precisam ser verdade:

     1. reordenar não pode perder, duplicar nem inventar documento;
     2. o número da folha mostrado ao lado de cada linha tem de ser o da folha
        em que o documento realmente cai — e isso não é óbvio, porque uma meia
        página pode entrar numa folha aberta várias posições atrás. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = path.resolve(__dirname, '..', '..', 'assets', 'js');

// ------------------------------------------------------- ambiente de mentira

function armazem() {
  const dados = {};
  return {
    getItem: k => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: k => { delete dados[k]; }
  };
}

const janela = {
  localStorage: armazem(),
  sessionStorage: armazem(),
  Laudos: { documentos: [], semAcento: s => s, limpar: s => s, hoje: () => '01/01/2026' },
  PDFLib: {}
};

const ctx = vm.createContext(janela);
ctx.window = janela;
ctx.localStorage = janela.localStorage;
ctx.sessionStorage = janela.sessionStorage;
ctx.console = console;

for (const f of ['armazenamento.js', 'impressao.js']) {
  vm.runInContext(fs.readFileSync(path.join(SITE, f), 'utf8'), ctx, { filename: f });
}

const D = janela.Dados;
const I = janela.Impressao;

let falhou = 0;

function confere(titulo, obtido, esperado) {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  const ok = a === b;
  if (!ok) falhou++;
  console.log((ok ? '  ok   ' : '  FALHA') + '  ' + titulo);
  if (!ok) {
    console.log('         esperado: ' + b);
    console.log('         obtido:   ' + a);
  }
}

// ------------------------------------------------------------- reordenação

D.iniciarAtendimento({ nome: 'Fulana de Tal', prontuario: '123' });
D.acrescentarDocumentos([
  { tipo: 'a', titulo: 'A', dados: {} },
  { tipo: 'b', titulo: 'B', dados: {} },
  { tipo: 'c', titulo: 'C', dados: {} },
  { tipo: 'd', titulo: 'D', dados: {} }
]);

const titulos = () => D.lerAtendimento().documentos.map(d => d.titulo);
const ids = () => D.lerAtendimento().documentos.map(d => d.id);

console.log('reordenação:');
confere('ordem inicial', titulos(), ['A', 'B', 'C', 'D']);

let [a, b, c, d] = ids();

D.reordenarDocumentos([d, a, c, b]);
confere('ordem nova é respeitada', titulos(), ['D', 'A', 'C', 'B']);

[, , ,] = ids();
D.reordenarDocumentos([c]);
confere('id não citado vai para o fim, na ordem em que estava',
  titulos(), ['C', 'D', 'A', 'B']);

D.reordenarDocumentos(['fantasma', a, 'outro']);
confere('id desconhecido é ignorado', titulos(), ['A', 'C', 'D', 'B']);

D.reordenarDocumentos([]);
confere('lista vazia não mexe em nada', titulos(), ['A', 'C', 'D', 'B']);

D.reordenarDocumentos(null);
confere('lista ausente não quebra', titulos(), ['A', 'C', 'D', 'B']);

confere('nenhum documento se perdeu', D.lerAtendimento().documentos.length, 4);

// -------------------------------------------------------------- duplicação

console.log('\nduplicação:');

D.iniciarAtendimento({ nome: 'Fulana de Tal' });
D.acrescentarDocumentos([
  { tipo: 'receita', titulo: 'Receita', semData: true, dados: { corpo: 'Dipirona' } },
  { tipo: 'exame', titulo: 'Exames', dados: { itens: ['HMG'] } }
]);

const [rec, exa] = ids();
const copia = D.duplicarDocumento(rec);

confere('a cópia entra logo abaixo do original, não no fim',
  titulos(), ['Receita', 'Receita (2)', 'Exames']);
confere('a cópia leva os dados', D.lerDocumento(copia.id).dados, { corpo: 'Dipirona' });
confere('a cópia leva o "sem data"', D.lerDocumento(copia.id).semData, true);
confere('a cópia tem id próprio', copia.id !== rec, true);

/* Editar a cópia não pode respingar no original: se o clone fosse raso, os dois
   apontariam para o mesmo objeto e mexer num mudaria o outro. */
D.salvarDocumento(Object.assign({}, D.lerDocumento(copia.id), { dados: { corpo: 'Losartana' } }));
confere('editar a cópia não mexe no original',
  D.lerDocumento(rec).dados, { corpo: 'Dipirona' });

D.duplicarDocumento(rec);
confere('a numeração pula o que já existe',
  titulos(), ['Receita', 'Receita (3)', 'Receita (2)', 'Exames']);

D.duplicarDocumento(copia.id);
confere('duplicar uma cópia volta à base do nome',
  titulos(), ['Receita', 'Receita (3)', 'Receita (2)', 'Receita (4)', 'Exames']);

confere('duplicar id inexistente não faz nada', D.duplicarDocumento('fantasma'), null);
confere('nada se perdeu', D.lerAtendimento().documentos.length, 5);

// --------------------------------------------------- em que folha cada um cai

const INTEIRA = { folha: 'a4-retrato' };
const DEITADA = { folha: 'a5-paisagem' };
const EM_PE = { folha: 'a5-retrato' };

console.log('\nfolha de cada documento (agrupando meias páginas):');

confere('duas meias dividem a primeira folha',
  I.folhaDeCada([DEITADA, EM_PE], true), [1, 1]);

confere('três meias: a terceira abre folha nova',
  I.folhaDeCada([DEITADA, EM_PE, DEITADA], true), [1, 1, 2]);

confere('página inteira ocupa a folha sozinha',
  I.folhaDeCada([INTEIRA, DEITADA, EM_PE], true), [1, 2, 2]);

/* O caso que motivou a prova: a segunda meia página entra numa folha aberta
   antes da inteira, então a folha 2 aparece depois da 3 na tabela. Se o mapa
   fosse montado só percorrendo as folhas em ordem, os números sairiam trocados. */
confere('meia página volta para a folha aberta lá atrás',
  I.folhaDeCada([DEITADA, INTEIRA, EM_PE], true), [1, 2, 1]);

confere('sem agrupar, cada um na sua folha',
  I.folhaDeCada([DEITADA, EM_PE, DEITADA], false), [1, 2, 3]);

confere('contagem bate com o maior número de folha',
  I.contarFolhas([DEITADA, INTEIRA, EM_PE], true),
  Math.max.apply(null, I.folhaDeCada([DEITADA, INTEIRA, EM_PE], true)));

console.log(falhou ? '\n' + falhou + ' prova(s) falharam' : '\ntodas as provas passaram');
process.exit(falhou ? 1 : 0);
