/* Outros documentos — HULW/UFPB.

   Folha livre para o que não tem formulário próprio: atestado, declaração,
   relatório, encaminhamento. Um título opcional, um campo de teor (com
   markdown) e o espaço de assinatura.

   Sai em dois tamanhos, à escolha de quem emite. O A5 é meia página e divide
   folha com outro documento — bom para atestado e declaração. O A4 existe
   porque relatório e contrarreferência não cabem em meia página, e deixar o
   corpo da letra encolher até caber produz um documento ruim de ler.

   Trocar o formato não mexe no texto: os dois modelos têm os mesmos campos, só
   muda onde eles caem no papel.

   Modelos em branco gerados por ferramentas/gerar-modelos.py. */

(function () {
  'use strict';

  var C = {
    a5: {
      nome:       { x: 92.1, y: 523.0, w: 307.9 },
      data:       { x: 44.1, y: 496.0, w: 161.9 },
      prontuario: { x: 258.1, y: 496.0, w: 141.9 },
      titulo:     { x: 210.0, y: 462, w: 364 },
      teor:           [24.0, 176.0, 396.0, 470],
      teorComTitulo:  [24.0, 176.0, 396.0, 450],
      assinaturaNome:     { x: 210.0, y: 139, w: 216 },
      assinaturaRegistro: { x: 210.0, y: 129, w: 236 }
    },

    a4: {
      nome:       { x: 116.1, y: 770.0, w: 434.9 },
      data:       { x: 68.1, y: 743.0, w: 225.4 },
      prontuario: { x: 345.6, y: 743.0, w: 205.4 },
      titulo:     { x: 297.5, y: 709, w: 491 },
      teor:           [48.0, 198.0, 547.0, 717],
      teorComTitulo:  [48.0, 198.0, 547.0, 697],
      assinaturaNome:     { x: 297.5, y: 161, w: 236 },
      assinaturaRegistro: { x: 297.5, y: 151, w: 256 }
    }
  };

  var SUGESTOES = [
    'Atestado', 'Declaração de comparecimento', 'Relatório médico',
    'Laudo médico', 'Contrarreferência', 'Encaminhamento', 'Solicitação',
    'Justificativa', 'Orientações'
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
               'Meia página ou página inteira, à escolha.',
    /* Modelo e formato de folha seguem o campo, em vez de serem fixos. */
    modelo: function (d) {
      return d.formato === 'a4'
        ? 'assets/pdf/outros-documentos-a4.pdf'
        : 'assets/pdf/outros-documentos.pdf';
    },
    folha: function (d) {
      return d.formato === 'a4' ? 'a4-retrato' : 'a5-retrato';
    },
    tituloPadrao: function (d) {
      if (d.assunto) return String(d.assunto).trim();
      var primeira = String(d.teor || '').split('\n')[0].replace(/^#+\s*/, '').trim();
      return primeira || 'Outros documentos';
    },

    campos: [
      { id: 'formato', rotulo: 'Tamanho da folha', tipo: 'radio', larg: 4,
        opcoes: [{ valor: 'a5', texto: 'Meia página (A5)', padrao: true },
                 { valor: 'a4', texto: 'Página inteira (A4)' }],
        dica: 'A meia página divide folha com outro documento. A inteira cabe ' +
              'muito mais texto, sem encolher a letra.' },

      { id: 'assunto', rotulo: 'Título impresso', tipo: 'lista', larg: 8, max: 60,
        opcoes: SUGESTOES,
        dica: 'Aparece em maiúsculas no alto da folha. Em branco, o teor começa mais acima.' },

      { id: 'mostrarPrescritor', rotulo: 'Imprimir nome e registro do prescritor',
        tipo: 'caixa', larg: 4, valor: true,
        dica: 'Desmarcado, sai só a linha de assinatura — para quem prefere carimbar.' },

      { id: 'teor', rotulo: 'Teor', tipo: 'area', larg: 12,
        max: 8000, linhas: 12, obrigatorio: true,
        dica: 'Use os botões acima ou escreva markdown direto. ' +
              'As quebras de linha são mantidas no PDF.' }
    ],

    preencher: function (p, d) {
      var c = d.formato === 'a4' ? C.a4 : C.a5;

      p.emPonto(d.nome, c.nome);
      p.emPonto(d.dataSolicitacao, c.data);
      p.emPonto(d.prontuario, c.prontuario);

      var assunto = String(d.assunto || '').trim();
      if (assunto) {
        p.txtC(assunto.toUpperCase(), c.titulo.x, c.titulo.y, 12, true, c.titulo.w);
      }

      var cortou = p.bloco(d.teor, assunto ? c.teorComTitulo : c.teor,
                           { negrito: false, tam: 11 });

      if (d.mostrarPrescritor) {
        p.txtC(d.profissional, c.assinaturaNome.x, c.assinaturaNome.y, 9.5, true,
               c.assinaturaNome.w);
        p.txtC(registroDe(d), c.assinaturaRegistro.x, c.assinaturaRegistro.y, 8, false,
               c.assinaturaRegistro.w);
      } else {
        p.txtC('Assinatura e carimbo do prescritor', c.assinaturaNome.x,
               c.assinaturaNome.y, 7.5, false, c.assinaturaNome.w);
      }

      return cortou;
    }
  });
})();
