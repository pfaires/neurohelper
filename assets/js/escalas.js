/* Escalas e calculadoras — HULW/UFPB

   Registro no mesmo espírito de `Laudos`: cada escala é um arquivo que se
   declara aqui, e a página genérica escala.html sabe desenhar qualquer uma.

   Uma escala é:

     { id, sigla, titulo, descricao, referencia,
       observacao,          aviso que aparece no alto da página, se houver
       grupos: [ { titulo, itens: [...] } ],
       itens:  [ ... ],     alternativa a `grupos`, quando não há divisão
       resumo(respostas)  → [{ rotulo, valor }] mostrado ao lado do total
       texto(respostas, contexto) → o que vai para a área de transferência
       interpretacao(pontos) → uma frase, opcional }

   Um item é:

     { id, titulo, dica,
       pontua: false        não entra na soma (é uma pergunta de roteiro)
       opcoes: [{ valor, texto }]  ou função(respostas) → o mesmo array
       rotuloCopia }        como o item aparece no texto copiado

   `opcoes` poder ser função é o que permite um item mudar de régua conforme
   outra resposta — na ALSFRS-R, o item 5 tem uma escala para quem tem
   gastrostomia e outra para quem não tem. */

window.Escalas = (function () {
  'use strict';

  var lista = [];

  function registrar(e) { lista.push(e); }

  function achar(id) {
    var r = lista.filter(function (e) { return e.id === id; });
    return r.length ? r[0] : null;
  }

  /* Todos os itens, na ordem, ignorando a divisão em grupos. */
  function itensDe(escala) {
    if (escala.itens) return escala.itens;
    return (escala.grupos || []).reduce(function (acc, g) {
      return acc.concat(g.itens);
    }, []);
  }

  function opcoesDe(item, respostas) {
    return typeof item.opcoes === 'function' ? item.opcoes(respostas || {}) : (item.opcoes || []);
  }

  function pontuaveis(escala) {
    return itensDe(escala).filter(function (i) { return i.pontua !== false; });
  }

  /* Soma o que já foi respondido e diz quanto falta. Devolver o máximo junto
     evita que cada escala tenha de saber contar os próprios pontos. */
  function somar(escala, respostas) {
    respostas = respostas || {};
    var itens = pontuaveis(escala);
    var pontos = 0, respondidos = 0, maximo = 0;

    itens.forEach(function (item) {
      var opcoes = opcoesDe(item, respostas);
      var maiores = opcoes.map(function (o) { return o.valor; });
      maximo += maiores.length ? Math.max.apply(null, maiores) : 0;

      var v = respostas[item.id];
      if (v === undefined || v === null || v === '') return;
      respondidos++;
      pontos += Number(v);
    });

    return {
      pontos: pontos,
      maximo: maximo,
      respondidos: respondidos,
      total: itens.length,
      completa: respondidos === itens.length
    };
  }

  /* Soma só de alguns itens, para os subescores. */
  function somarItens(respostas, ids) {
    return ids.reduce(function (s, id) {
      var v = (respostas || {})[id];
      return s + (v === undefined || v === null || v === '' ? 0 : Number(v));
    }, 0);
  }

  return {
    lista: lista,
    registrar: registrar,
    achar: achar,
    itensDe: itensDe,
    opcoesDe: opcoesDe,
    pontuaveis: pontuaveis,
    somar: somar,
    somarItens: somarItens
  };
})();
