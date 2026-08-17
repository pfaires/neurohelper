/* FAA — Ficha de Atendimento Ambulatorial (retorno), HULW/UFPB.
   Modelo em branco gerado por ferramentas/gerar-modelos.py (A5 paisagem, 595 x 420).

   O desenho foi medido sobre uma digitalização do impresso, não estimado — quem
   recebe a ficha no balcão reconhece o papel pelo formato. Ver faa() em
   ferramentas/gerar-modelos.py.

   A grade de retorno é texto livre e pode sair em branco, para o balcão
   preencher à mão. O carimbo é sempre manual. */

(function () {
  'use strict';

  var C = {
    nome:          { x: 20.0, y: 316.3, w: 346.0 },
    data:          { x: 472.8, y: 317.5, w: 96.6 },
    prontuario:    { x: 110.6, y: 293.3, w: 215.4 },
    especialidade: { x: 23.3, y: 175.0, w: 306.9 }
  };

  var PATOLOGIA = [22.5, 217.8, 332.4, 255.1];

  /* Grade de retorno: três consultas, texto livre — "15", "quinze", "manhã" —
     porque é assim que o balcão preenche à mão. As colunas têm larguras
     diferentes, como no impresso, e ALTA só existe na terceira linha. */
  var RETORNO = [
    { dia: { x: 130.6, y: 132.3, w: 28.0 }, mes: { x: 201.0, y: 132.3, w: 27.4 },
      hora: { x: 281.9, y: 132.3, w: 64.9 }, grade: { x: 400.9, y: 132.3, w: 71.7 } },
    { dia: { x: 130.6, y: 104.4, w: 28.0 }, mes: { x: 201.0, y: 104.4, w: 27.4 },
      hora: { x: 281.9, y: 104.4, w: 64.9 }, grade: { x: 400.9, y: 104.4, w: 71.7 } },
    { dia: { x: 130.6, y: 75.3, w: 28.0 }, mes: { x: 201.0, y: 75.3, w: 27.4 },
      hora: { x: 281.9, y: 75.3, w: 64.9 }, grade: { x: 400.9, y: 75.3, w: 71.7 },
      alta: { x: 526.3, y: 75.3, w: 47.0 } }
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
