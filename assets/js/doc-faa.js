/* FAA — Ficha de Atendimento Ambulatorial (retorno), HULW/UFPB.
   Modelo em branco gerado por ferramentas/gerar-modelos.py (A5 paisagem, 595 x 420).

   A grade de dia/mês/hora/grade e o carimbo saem em branco: quem preenche é o
   balcão da marcação, com a ficha na mão. */

(function () {
  'use strict';

  var C = {
    nome:          { x: 104.1, y: 336.0, w: 319.9 },
    data:          { x: 460.6, y: 336.0, w: 114.4 },
    prontuario:    { x: 106.3, y: 312.0, w: 317.7 },
    especialidade: { x: 124.1, y: 234.0, w: 299.9 }
  };

  var PATOLOGIA = [21, 254, 423, 287];

  window.Laudos.registrar({
    id: 'faa',
    titulo: 'FAA — ficha de atendimento ambulatorial',
    descricao: 'Retorno ao ambulatório. A marcação da consulta é preenchida no balcão. ' +
               'Meia página (A5 paisagem).',
    modelo: 'assets/pdf/faa.pdf',
    folha: 'a5-paisagem',
    tituloPadrao: function (d) {
      var e = String(d.especialidade || '').trim();
      return e ? 'FAA — ' + e : 'FAA';
    },

    campos: [
      { id: 'especialidade', rotulo: 'Especialidade médica', larg: 6, max: 60,
        valor: 'Neurologia', obrigatorio: true },

      { id: 'patologia', rotulo: 'Descrição da patologia', tipo: 'area', larg: 12,
        max: 600, linhas: 4, obrigatorio: true,
        dica: 'Espaço curto no papel — duas ou três linhas.' }
    ],

    preencher: function (p, d) {
      p.emPonto(d.nome, C.nome);
      p.emPonto(d.dataSolicitacao, C.data);
      p.emPonto(d.prontuario, C.prontuario);
      p.emPonto(d.especialidade, C.especialidade);
      return p.bloco(d.patologia, PATOLOGIA, { negrito: false, tam: 10 });
    }
  });
})();
