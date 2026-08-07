/* Receituário de controle especial — HULW/UFPB.
   Modelo em branco gerado por ferramentas/gerar-modelos.py (A4 paisagem, 842 x 595),
   com as duas vias lado a lado: 1.ª retenção da farmácia, 2.ª orientação ao paciente. */

(function () {
  'use strict';

  var VIAS = [
    {
      paciente:   { x: 58.4, y: 441.0, w: 342.6 },
      endereco:   { x: 61.5, y: 419.0, w: 339.5 },
      data:       { x: 44.1, y: 175.0, w: 141.9 },
      prescricao: [18, 196, 403, 402]
    },
    {
      paciente:   { x: 479.4, y: 441.0, w: 342.6 },
      endereco:   { x: 482.5, y: 419.0, w: 339.5 },
      data:       { x: 465.1, y: 175.0, w: 141.9 },
      prescricao: [439, 196, 824, 402]
    }
  ];

  window.Laudos.registrar({
    id: 'receituario-controle-especial',
    titulo: 'Receituário de controle especial',
    descricao: 'Receita em duas vias lado a lado (retenção da farmácia e orientação ao paciente), conforme a Portaria SVS/MS 344/98. Página A4 paisagem.',
    modelo: 'assets/pdf/receituario-controle-especial.pdf',

    campos: [
      { id: 'prescricao', rotulo: 'Prescrição', tipo: 'area', larg: 12,
        max: 1200, linhas: 8, obrigatorio: true,
        dica: 'O mesmo texto é impresso nas duas vias. As quebras de linha são mantidas.' }
    ],

    preencher: function (p, d, api) {
      // o CPF é opcional e sai entre parênteses, depois do nome
      var cpf = api.digitos(d.cpf);
      var paciente = d.nome + (cpf.length === 11
        ? ' (CPF: ' + cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') + ')'
        : '');

      var cortou = false;
      VIAS.forEach(function (v) {
        p.emPonto(paciente, v.paciente);
        p.emPonto(d.endereco, v.endereco);
        p.emPonto(d.dataSolicitacao, v.data);
        cortou = p.bloco(d.prescricao, v.prescricao, { negrito: false, tam: 11.5 }) || cortou;
      });
      return cortou;
    }
  });
})();
