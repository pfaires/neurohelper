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

  /* Grade de retorno: três consultas. Tudo texto livre — "15", "quinze",
     "3ª feira", "manhã" — porque é assim que é preenchido à mão no balcão. */
  var RETORNO = [
    { dia: { x: 43.6, y: 192.0, w: 70.9 }, mes: { x: 147.6, y: 192.0, w: 67.4 },
      hora: { x: 253.2, y: 192.0, w: 62.3 }, grade: { x: 358.3, y: 192.0, w: 57.7 } },
    { dia: { x: 43.6, y: 166.0, w: 70.9 }, mes: { x: 147.6, y: 166.0, w: 67.4 },
      hora: { x: 253.2, y: 166.0, w: 62.3 }, grade: { x: 358.3, y: 166.0, w: 57.7 } },
    { dia: { x: 43.6, y: 140.0, w: 50.8 }, mes: { x: 127.5, y: 140.0, w: 47.3 },
      hora: { x: 213.0, y: 140.0, w: 42.2 }, grade: { x: 298.0, y: 140.0, w: 37.6 },
      alta: { x: 371.1, y: 140.0, w: 44.9 } }
  ];

  var COLUNAS = ['dia', 'mes', 'hora', 'grade'];

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
        dica: 'Espaço curto no papel — duas ou três linhas.' },

      { id: 'retornos', rotulo: 'Tipo de encaminhamento — retornos',
        tipo: 'linhas', larg: 12, max: 3,
        rotuloAcrescentar: 'Acrescentar retorno',
        dica: 'Deixe em branco para o balcão preencher à mão. Texto livre nos ' +
              'quatro campos. "Alta" só existe na terceira linha, como no papel.',
        colunas: [
          { id: 'dia', rotulo: 'Dia', max: 12 },
          { id: 'mes', rotulo: 'Mês', max: 12 },
          { id: 'hora', rotulo: 'Hora', max: 12 },
          { id: 'grade', rotulo: 'Grade', max: 12 },
          { id: 'alta', rotulo: 'Alta (3ª linha)', max: 10 }
        ] }
    ],

    preencher: function (p, d) {
      p.emPonto(d.nome, C.nome);
      p.emPonto(d.dataSolicitacao, C.data);
      p.emPonto(d.prontuario, C.prontuario);
      p.emPonto(d.especialidade, C.especialidade);

      (d.retornos || []).slice(0, RETORNO.length).forEach(function (linha, i) {
        var pontos = RETORNO[i];
        COLUNAS.forEach(function (col) {
          p.emPonto(linha[col], pontos[col], { tam: 9 });
        });
        // o papel só tem "ALTA" na última linha
        if (pontos.alta) p.emPonto(linha.alta, pontos.alta, { tam: 9 });
      });

      return p.bloco(d.patologia, PATOLOGIA, { negrito: false, tam: 10 });
    }
  });
})();
