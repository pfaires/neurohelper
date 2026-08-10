/* Kits de documentos — HULW/UFPB

   Um kit é um conjunto de documentos que costuma sair junto. O usuário marca o
   que quer, preenche os dados comuns e manda tudo para o atendimento atual.

   Os kits vêm de duas origens e são mesclados por id, com o local sobrepondo:

     assets/dados/kits.json   publicados no repositório, iguais para todo mundo
     localStorage             criados ou ajustados neste computador

   Formato (é JSON puro, sem funções):

   { id, titulo, descricao, ambulatorio,
     camposComuns: [ { …campo, aplicaEm: ['justificativa', 'dadosClinicos'] } ],
     itens: [ { id, documento, titulo, marcado, valores: { campo: valor } } ] }

   `aplicaEm` lista os campos que aquele dado comum preenche em cada documento —
   o mesmo resumo clínico vira justificativa numa mudança de procedimento e
   dados clínicos numa requisição de exames. Quando o item já traz texto próprio
   para o campo, o comum é acrescentado depois, separado por linha em branco.

   Carregar é assíncrono: chame Kits.carregar() antes de usar todos() ou porId(). */

window.Kits = (function () {
  'use strict';

  var CAMINHO = 'assets/dados/kits.json';

  var doRepositorio = [];
  var promessa = null;

  function locais() {
    return (window.Dados && window.Dados.lerKitsLocais()) || [];
  }

  function carregar() {
    if (promessa) return promessa;
    promessa = fetch(CAMINHO)
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (lista) {
        doRepositorio = Array.isArray(lista) ? lista : [];
        return todos();
      });
    return promessa;
  }

  /* Mescla mantendo a ordem: os do repositório primeiro, na posição original
     mesmo quando sobrescritos, e os criados aqui no fim. */
  function todos() {
    var mapa = {};
    var ordem = [];
    doRepositorio.forEach(function (k) {
      if (!mapa[k.id]) ordem.push(k.id);
      mapa[k.id] = k;
    });
    locais().forEach(function (k) {
      if (!mapa[k.id]) ordem.push(k.id);
      mapa[k.id] = k;
    });
    return ordem.map(function (id) { return mapa[id]; });
  }

  function porId(id) {
    return todos().filter(function (k) { return k.id === id; })[0] || null;
  }

  function doAmbulatorio(id) {
    return todos().filter(function (k) { return k.ambulatorio === id; });
  }

  // de onde veio cada kit, para o editor mostrar e permitir restaurar
  function origem(id) {
    var local = locais().some(function (k) { return k.id === id; });
    var repo = doRepositorio.some(function (k) { return k.id === id; });
    if (local && repo) return 'alterado';
    if (local) return 'local';
    return repo ? 'repositorio' : 'desconhecido';
  }

  function original(id) {
    return doRepositorio.filter(function (k) { return k.id === id; })[0] || null;
  }

  return {
    carregar: carregar,
    todos: todos,
    porId: porId,
    doAmbulatorio: doAmbulatorio,
    origem: origem,
    original: original
  };
})();
