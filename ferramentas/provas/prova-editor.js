/* Prova do editor dos campos longos.

   O que precisa ser verdade: passar pelo modo visual não pode alterar o texto.
   Markdown → DOM → markdown tem de devolver exatamente o que entrou, senão o
   simples ato de olhar o campo no modo visual estragaria o documento.

   Node não tem DOM, e instalar um aqui seria peso demais para o que se testa.
   O mínimo que `paraMarkdown` usa está imitado abaixo — inclusive as sujeiras
   que os navegadores produzem sozinhos ao editar (b, i, span com estilo, div
   solta), que é justamente o caso difícil. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = path.resolve(__dirname, '..', '..', 'assets', 'js');

// ----------------------------------------------------------------- DOM de bolso

const VAZIAS = { BR: 1, HR: 1, IMG: 1 };

function texto(v) {
  return { nodeType: 3, nodeName: '#text', nodeValue: v, childNodes: [] };
}

function elemento(nome, estilo) {
  const el = {
    nodeType: 1,
    nodeName: nome.toUpperCase(),
    childNodes: [],
    style: estilo || {},
    querySelectorAll(sel) {
      if (sel !== ':scope > li') throw new Error('seletor não imitado: ' + sel);
      return el.childNodes.filter(n => n.nodeName === 'LI');
    }
  };
  return el;
}

function estiloDe(attrs) {
  const m = /style\s*=\s*"([^"]*)"/i.exec(attrs || '');
  if (!m) return {};
  const e = {};
  m[1].split(';').forEach(par => {
    const [k, v] = par.split(':');
    if (!k || !v) return;
    const chave = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    e[chave] = v.trim();
  });
  return e;
}

function analisar(html) {
  const raiz = elemento('div');
  const pilha = [raiz];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  let m;

  while ((m = re.exec(html))) {
    if (m[3] !== undefined) {
      pilha[pilha.length - 1].childNodes.push(texto(m[3]));
      continue;
    }
    const nome = m[1].toUpperCase();
    const fecha = m[0].charAt(1) === '/';

    if (fecha) {
      if (pilha.length > 1) pilha.pop();
      continue;
    }
    const el = elemento(nome, estiloDe(m[2]));
    pilha[pilha.length - 1].childNodes.push(el);
    if (!VAZIAS[nome] && !/\/>$/.test(m[0])) pilha.push(el);
  }
  return raiz;
}

// ------------------------------------------------------------------- montagem

const janela = {};
const ctx = vm.createContext(janela);
ctx.window = janela;
ctx.document = { execCommand: () => false, querySelectorAll: () => [] };
ctx.console = console;
ctx.Event = function (t) { this.type = t; };

for (const f of ['markdown.js', 'editor-markdown.js']) {
  vm.runInContext(fs.readFileSync(path.join(SITE, f), 'utf8'), ctx, { filename: f });
}

const E = janela.EditorMarkdown;

// ------------------------------------------------------------------- provas

let falhou = 0;

function confere(titulo, obtido, esperado) {
  const ok = obtido === esperado;
  if (!ok) falhou++;
  console.log((ok ? '  ok   ' : '  FALHA') + '  ' + titulo);
  if (!ok) {
    console.log('         esperado: ' + JSON.stringify(esperado));
    console.log('         obtido:   ' + JSON.stringify(obtido));
  }
}

const IDA_E_VOLTA = [
  ['texto simples', 'Paciente estável, sem queixas.'],
  ['negrito', 'O paciente **João da Silva** compareceu.'],
  ['itálico', 'Diagnóstico de *esclerose múltipla*.'],
  ['negrito e itálico juntos', 'Achado **importante** e *duvidoso* na mesma linha.'],
  ['título', '# Relatório médico'],
  ['subtítulo', '## Conduta'],
  ['título menor', '### Observações'],
  ['lista', '- Manter fingolimode\n- Retorno em 3 meses'],
  ['lista numerada', '1. Evitar calor\n2. Vacinação em dia'],
  ['citação', '> Paciente orientado quanto aos riscos.'],
  ['régua', 'Antes\n\n---\n\nDepois'],
  ['linhas em branco no meio', 'Primeiro parágrafo.\n\nSegundo parágrafo.'],
  ['tudo junto', [
    '# Relatório',
    '',
    'Paciente **João** em uso de *fingolimode*.',
    '',
    '## Conduta',
    '- Manter dose',
    '- Ressonância em 6 meses',
    '',
    '1. Evitar calor',
    '2. Vacinar',
    '',
    '---',
    '',
    '> Orientado quanto aos riscos.'
  ].join('\n')],
  ['receita sem marcação', 'Dipirona 500 mg ------ 20 comp.\nTomar 1 de 6/6 h.']
];

console.log('ida e volta pelo modo visual (markdown → DOM → markdown):');
IDA_E_VOLTA.forEach(([titulo, md]) => {
  const volta = E.paraMarkdown(analisar(E.paraDom(md)));
  confere(titulo, volta, md.replace(/\s+$/, ''));
});

console.log('\nsujeira que o navegador produz ao editar:');
[
  ['<b> e <i> em vez de <strong>/<em>', '<p>Texto <b>forte</b> e <i>torto</i>.</p>',
   'Texto **forte** e *torto*.'],
  ['negrito por estilo (styleWithCSS)', '<p>Valor <span style="font-weight: bold;">alto</span>.</p>',
   'Valor **alto**.'],
  ['itálico por estilo', '<p>Termo <span style="font-style: italic;">latino</span>.</p>',
   'Termo *latino*.'],
  ['div solta no lugar de p', '<div>Uma linha</div><div>Outra linha</div>',
   'Uma linha\nOutra linha'],
  ['br dentro do bloco', '<p>Linha um<br>Linha dois</p>', 'Linha um\nLinha dois'],
  ['parágrafo vazio', '<p>Antes</p><p><br></p><p>Depois</p>', 'Antes\n\nDepois'],
  ['espaço fora da marca', '<p>Fim <strong>negrito </strong>seguido.</p>',
   'Fim **negrito** seguido.'],
  ['aninhado', '<p><strong>Muito <em>enfático</em></strong></p>', '**Muito *enfático***'],
  ['lista com formatação dentro', '<ul><li>Dose <strong>alta</strong></li><li>Retorno</li></ul>',
   '- Dose **alta**\n- Retorno'],
  ['numerada renumera sozinha', '<ol><li>Um</li><li>Dois</li><li>Três</li></ol>',
   '1. Um\n2. Dois\n3. Três'],
  ['citação de duas linhas', '<blockquote>Uma<br>Outra</blockquote>', '> Uma\n> Outra'],
  ['espaço rígido do contenteditable', '<p>Dois espaços</p>', 'Dois espaços']
].forEach(([titulo, html, esperado]) => {
  confere(titulo, E.paraMarkdown(analisar(html)), esperado);
});

// ----------------------------------------------------- botões no modo markdown

function campo(v, i, f) {
  return {
    value: v,
    selectionStart: i === undefined ? v.length : i,
    selectionEnd: f === undefined ? (i === undefined ? v.length : i) : f,
    focus() {},
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
    dispatchEvent() {}
  };
}

console.log('\nbotões no modo markdown:');
[
  ['negrito na seleção', campo('bom dia', 0, 3), 'negrito', '**bom** dia'],
  ['negrito tira quando já tem', campo('**bom** dia', 2, 5), 'negrito', 'bom dia'],
  ['itálico na seleção', campo('bom dia', 4, 7), 'italico', 'bom *dia*'],
  ['lista em duas linhas', campo('um\ndois', 0, 6), 'lista', '- um\n- dois'],
  ['lista tira quando já tem', campo('- um\n- dois', 0, 10), 'lista', 'um\ndois'],
  ['numerada conta certo', campo('um\ndois\ntrês', 0, 12), 'numerada', '1. um\n2. dois\n3. três'],
  ['troca lista por numerada sem empilhar', campo('- um\n- dois', 0, 10), 'numerada', '1. um\n2. dois'],
  ['título', campo('Conduta', 0, 7), 'titulo', '## Conduta'],
  ['citação', campo('cuidado', 0, 7), 'citacao', '> cuidado'],
  ['régua em linha própria', campo('fim', 3, 3), 'regua', 'fim\n---\n']
].forEach(([titulo, ta, acao, esperado]) => {
  E.aplicar(ta, acao);
  confere(titulo, ta.value, esperado);
});

console.log(falhou ? '\n' + falhou + ' prova(s) falharam' : '\ntodas as provas passaram');
process.exit(falhou ? 1 : 0);
