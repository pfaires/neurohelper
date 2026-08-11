/* Outros documentos — HULW/UFPB.

   Folha livre para o que não tem formulário próprio: atestado, declaração,
   relatório, encaminhamento. Um título opcional, um campo de teor (com
   markdown) e o espaço de assinatura.

   Modelo em branco gerado por ferramentas/gerar-modelos.py (A5 retrato, 420 x 595). */

(function () {
  'use strict';

  var C = {
    nome:       { x: 92.1, y: 523.0, w: 307.9 },
    data:       { x: 44.1, y: 496.0, w: 166.9 },
    prontuario: { x: 263.1, y: 496.0, w: 136.9 }
  };

  var TITULO = { x: 210.0, y: 462.0, w: 364.0 };
  var TEOR = [24.0, 176.0, 396.0, 470.0];
  var TEOR_COM_TITULO = [24.0, 176.0, 396.0, 450.0];

  var ASSINATURA = {
    nome:     { cx: 210.0, y: 139.0, w: 240.0 },
    registro: { cx: 210.0, y: 129.0, w: 260.0 }
  };

  var SUGESTOES = [
    'Atestado', 'Declaração de comparecimento', 'Relatório médico',
    'Encaminhamento', 'Solicitação', 'Justificativa', 'Orientações'
  ];

  /* "Neurologista · CRM-PB 12345 · RQE 678" — só o que existir. */
  function registroDe(d) {
    var partes = [];
    if (d.tituloProfissional) partes.push(d.tituloProfissional);
    if (d.crm) partes.push('CRM-' + (d.crmUf || 'PB') + ' ' + d.crm);
    if (d.rqe) partes.push('RQE ' + d.rqe);
    return partes.join('  ·  ');
  }

  window.Laudos.registrar({
    id: 'outros-documentos',
    titulo: 'Outros documentos',
    descricao: 'Folha livre para atestado, declaração, relatório ou orientações. ' +
               'Meia página (A5 retrato).',
    modelo: 'assets/pdf/outros-documentos.pdf',
    folha: 'a5-retrato',
    tituloPadrao: function (d) {
      if (d.assunto) return String(d.assunto).trim();
      var primeira = String(d.teor || '').split('\n')[0].replace(/^#+\s*/, '').trim();
      return primeira || 'Outros documentos';
    },

    campos: [
      { id: 'assunto', rotulo: 'Título impresso', tipo: 'lista', larg: 8, max: 60,
        opcoes: SUGESTOES,
        dica: 'Aparece em maiúsculas no alto da folha. Em branco, o teor começa mais acima.' },

      { id: 'mostrarPrescritor', rotulo: 'Imprimir nome e registro do prescritor',
        tipo: 'caixa', larg: 4, valor: true,
        dica: 'Desmarcado, sai só a linha de assinatura — para quem prefere carimbar.' },

      { id: 'teor', rotulo: 'Teor', tipo: 'area', larg: 12,
        max: 4000, linhas: 12, obrigatorio: true,
        dica: 'Aceita markdown: **negrito**, *itálico*, ## títulos, listas com "-" e ' +
              'numeradas. As quebras de linha são mantidas.' }
    ],

    preencher: function (p, d) {
      p.emPonto(d.nome, C.nome);
      p.emPonto(d.dataSolicitacao, C.data);
      p.emPonto(d.prontuario, C.prontuario);

      var assunto = String(d.assunto || '').trim();
      if (assunto) p.txtC(assunto.toUpperCase(), TITULO.x, TITULO.y, 12, true, TITULO.w);

      var cortou = p.bloco(d.teor, assunto ? TEOR_COM_TITULO : TEOR,
                           { negrito: false, tam: 11 });

      if (d.mostrarPrescritor) {
        p.txtC(d.profissional, ASSINATURA.nome.cx, ASSINATURA.nome.y, 9.5, true,
               ASSINATURA.nome.w);
        p.txtC(registroDe(d), ASSINATURA.registro.cx, ASSINATURA.registro.y, 8, false,
               ASSINATURA.registro.w);
      } else {
        p.txtC('Assinatura e carimbo do prescritor', ASSINATURA.nome.cx,
               ASSINATURA.nome.y, 7.5, false, ASSINATURA.nome.w);
      }

      return cortou;
    }
  });
})();
