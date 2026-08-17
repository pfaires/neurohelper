/* Prova das escalas.

   Escala mal somada é pior do que escala nenhuma: o número vai para o
   prontuário e ninguém confere a conta. Daí valer a pena provar o motor de
   soma, a troca de régua do item 5 e o texto que sai para colar. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = path.resolve(__dirname, '..', '..', 'assets', 'js');

const janela = {};
const ctx = vm.createContext(janela);
ctx.window = janela;
ctx.console = console;

for (const f of ['escalas.js', 'escala-alsfrs-r.js']) {
  vm.runInContext(fs.readFileSync(path.join(SITE, f), 'utf8'), ctx, { filename: f });
}

const E = janela.Escalas;
const alsfrs = E.achar('alsfrs-r');

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

// -------------------------------------------------------------- estrutura

console.log('estrutura da ALSFRS-R:');

confere('doze itens pontuados', E.pontuaveis(alsfrs).length, 12);
confere('treze itens no total (a pergunta da gastrostomia não pontua)',
  E.itensDe(alsfrs).length, 13);
confere('os itens pontuados são numerados de 1 a 12',
  E.pontuaveis(alsfrs).map(i => i.numero), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

confere('todo item pontuado oferece 0, 1, 2, 3 e 4',
  E.pontuaveis(alsfrs).every(i =>
    JSON.stringify(E.opcoesDe(i, {}).map(o => o.valor)) === '[4,3,2,1,0]'), true);

confere('máximo é 48', E.somar(alsfrs, {}).maximo, 48);

// ------------------------------------------------------------------ soma

const IDS = E.pontuaveis(alsfrs).map(i => i.id);
const cheia = v => IDS.reduce((r, id) => (r[id] = String(v), r), {});

console.log('\nsoma:');
confere('tudo em 4 dá 48', E.somar(alsfrs, cheia(4)).pontos, 48);
confere('tudo em 0 dá 0', E.somar(alsfrs, cheia(0)).pontos, 0);
confere('tudo em 4 conta como completa', E.somar(alsfrs, cheia(4)).completa, true);
confere('em branco não é completa', E.somar(alsfrs, {}).completa, false);
confere('em branco soma zero, mas sem itens respondidos',
  [E.somar(alsfrs, {}).pontos, E.somar(alsfrs, {}).respondidos], [0, 0]);

/* Meio preenchido não pode virar "0 de 48" nem inventar pontos: soma só o que
   foi respondido e avisa quantos faltam. */
const meia = { fala: '3', salivacao: '4', degluticao: '2' };
confere('parcial soma só o respondido', E.somar(alsfrs, meia).pontos, 9);
confere('parcial sabe quantos faltam',
  E.somar(alsfrs, meia).total - E.somar(alsfrs, meia).respondidos, 9);

confere('a pergunta da gastrostomia não entra na soma',
  E.somar(alsfrs, Object.assign(cheia(4), { gastrostomia: '0' })).pontos, 48);

// ------------------------------------------------- régua dupla do item 5

console.log('\nitem 5 troca de régua com a gastrostomia:');

const item5 = E.itensDe(alsfrs).filter(i => i.numero === 5)[0];

confere('sem gastrostomia, fala em cortar alimentos',
  /cortar os alimentos/i.test(E.opcoesDe(item5, { gastrostomia: '1' })[3].texto), true);

confere('com gastrostomia, fala em fechos e fixadores',
  /fechos e fixadores/i.test(E.opcoesDe(item5, { gastrostomia: '0' })[2].texto), true);

confere('sem resposta sobre gastrostomia, assume a régua sem sonda',
  E.opcoesDe(item5, {})[3].texto, E.opcoesDe(item5, { gastrostomia: '1' })[3].texto);

confere('as duas réguas valem de 0 a 4',
  [E.opcoesDe(item5, { gastrostomia: '1' }).map(o => o.valor),
   E.opcoesDe(item5, { gastrostomia: '0' }).map(o => o.valor)],
  [[4, 3, 2, 1, 0], [4, 3, 2, 1, 0]]);

// ------------------------------------------------------------- subescores

console.log('\nsubescores por domínio:');

const r30 = { fala: '3', salivacao: '4', degluticao: '2', escrita: '3', cortar: '2',
  vestir: '3', cama: '2', caminhar: '2', escadas: '1', dispneia: '3', ortopneia: '3',
  respiratoria: '2' };

confere('total do exemplo', E.somar(alsfrs, r30).pontos, 30);
confere('os quatro domínios',
  alsfrs.resumo(r30).map(x => x.valor), ['9/12', '8/12', '5/12', '8/12']);
confere('os domínios somam o total',
  alsfrs.resumo(r30).reduce((s, x) => s + parseInt(x.valor, 10), 0), 30);

// ------------------------------------------------------ texto do prontuário

console.log('\ntexto para colar:');

const saida = alsfrs.texto(r30, { data: '17/08/2026' });
console.log(saida.split('\n').map(l => '         ' + l).join('\n'));

confere('primeira linha traz sigla, data e total',
  saida.split('\n')[0], 'ALSFRS-R (17/08/2026): 30 pontos');
confere('uma linha por item, mais o cabeçalho', saida.split('\n').length, 13);
confere('cada linha é "número. nome: valor"',
  saida.split('\n')[1], '1. Fala: 3');
confere('a régua de gastrostomia não é citada quando não há sonda',
  /gastrostomia/i.test(saida), false);

const comSonda = alsfrs.texto(Object.assign({}, r30, { gastrostomia: '0' }),
                              { data: '17/08/2026' });
confere('com sonda, o texto avisa qual régua foi usada no item 5',
  /item 5 avaliado pela régua para paciente com gastrostomia/.test(comSonda), true);

const vazio = alsfrs.texto({}, { data: '17/08/2026' });
confere('item sem resposta sai como travessão, não como zero',
  vazio.split('\n')[1], '1. Fala: —');
confere('escala em branco não anuncia pontos inventados',
  vazio.split('\n')[0], 'ALSFRS-R (17/08/2026): 0 pontos');

console.log(falhou ? '\n' + falhou + ' prova(s) falharam' : '\ntodas as provas passaram');
process.exit(falhou ? 1 : 0);
