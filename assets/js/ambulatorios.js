/* Ambulatórios — HULW/UFPB

   Cada ambulatório é uma lista de seções recolhíveis. Um item de seção pode ser:

     { tipo: 'kit',  id: 'desmielinizante' }        atalho para montar documentos
     { tipo: 'link', texto, url, nota }             referência externa
     { tipo: 'nota', texto }                        texto solto

   Acrescentar conteúdo é editar este arquivo; a página se monta sozinha. */

window.Ambulatorios = (function () {
  'use strict';

  var lista = [];

  return {
    registrar: function (a) { lista.push(a); },
    todos: function () { return lista.slice(); },
    porId: function (id) {
      return lista.filter(function (a) { return a.id === id; })[0] || null;
    }
  };
})();

window.Ambulatorios.registrar({
  id: 'geral',
  titulo: 'Ambulatório Geral',
  descricao: 'Kits de documentos e referências de uso frequente.',
  secoes: [
    {
      titulo: 'Doenças desmielinizantes',
      aberta: true,
      itens: [
        { tipo: 'kit', id: 'desmielinizante' },
        { tipo: 'nota', texto: 'Confira sempre a descrição do procedimento na tabela SIGTAP vigente antes de imprimir.' },
        { tipo: 'link', texto: 'SIGTAP — tabela de procedimentos do SUS',
          url: 'http://sigtap.datasus.gov.br/', nota: 'Consulta de nomes e códigos de procedimento.' }
      ]
    },
    {
      titulo: 'Cefaleias',
      itens: [
        { tipo: 'link', texto: 'ICHD-3 — classificação internacional das cefaleias',
          url: 'https://ichd-3.org/', nota: 'Critérios diagnósticos completos, em inglês.' }
      ]
    },
    {
      titulo: 'Epilepsia',
      itens: [
        { tipo: 'link', texto: 'ILAE — International League Against Epilepsy',
          url: 'https://www.ilae.org/', nota: 'Classificações e diretrizes.' }
      ]
    },
    {
      titulo: 'Referências gerais',
      itens: [
        { tipo: 'link', texto: 'CID-10 — DATASUS',
          url: 'http://www2.datasus.gov.br/cid10/V2008/cid10.htm' },
        { tipo: 'nota', texto: 'Esta seção é um esqueleto: acrescente escalas, protocolos e critérios editando assets/js/ambulatorios.js.' }
      ]
    }
  ]
});
