/* Receituário simples — HULW/UFPB.
   Modelo em branco gerado por ferramentas/gerar-modelos.py (A5 retrato, 420 x 595). */

(function () {
  'use strict';

  var C = {
    nome:       { x: 92.1, y: 522.0, w: 307.9 },
    data:       { x: 44.1, y: 494.0, w: 166.9 },
    prontuario: { x: 263.1, y: 494.0, w: 136.9 }
  };

  var PRESCRICAO = [100, 110, 396, 474];

  window.Laudos.registrar({
    id: 'receituario-simples',
    titulo: 'Receituário simples',
    descricao: 'Receita de uso comum, sem retenção. Meia página (A5 retrato).',
    modelo: 'assets/pdf/receituario-simples.pdf',

    campos: [
      { id: 'prescricao', rotulo: 'Prescrição', tipo: 'area', larg: 12,
        max: 2000, linhas: 10, obrigatorio: true,
        dica: 'As quebras de linha são mantidas no PDF — uma linha em branco separa os itens.' }
    ],

    preencher: function (p, d) {
      p.emPonto(d.nome, C.nome);
      p.emPonto(d.dataSolicitacao, C.data);
      p.emPonto(d.prontuario, C.prontuario);
      return p.bloco(d.prescricao, PRESCRICAO, { negrito: false, tam: 11.5 });
    }
  });
})();
