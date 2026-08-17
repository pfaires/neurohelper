/* FAA — Ficha de Atendimento Ambulatorial (retorno), HULW/UFPB.
   Modelo em branco gerado por ferramentas/gerar-modelos.py (A5 paisagem, 595 x 420).

   O desenho copia o impresso do hospital de perto — rótulos fora das caixas,
   caixas soltas, sem moldura em volta —, porque quem recebe a ficha no balcão
   reconhece o papel pelo formato. Ver faa() em ferramentas/gerar-modelos.py.

   A grade de retorno é texto livre e pode sair em branco, para o balcão
   preencher à mão. O carimbo é sempre manual. */

(function () {
  'use strict';

  var C = {
    nome:          { x: 157, y: 326.0, w: 268 },
    data:          { x: 477, y: 326.0, w: 95 },
    prontuario:    { x: 157, y: 294.0, w: 268 },
    especialidade: { x: 157, y: 186.0, w: 268 }
  };

  var PATOLOGIA = [157.0, 216.0, 425.0, 272.0];

  /* Grade de retorno: três consultas. Tudo texto livre — "15", "quinze",
     "3ª feira", "manhã" — porque é assim que é preenchido à mão no balcão. */
  var RETORNO = [
    { dia: { x: 171.6, y: 149.0, w: 35.3 }, mes: { x: 240.0, y: 149.0, w: 35.3 },
      hora: { x: 313.5, y: 149.0, w: 35.3 }, grade: { x: 391.7, y: 149.0, w: 35.3 } },
    { dia: { x: 171.6, y: 119.0, w: 35.3 }, mes: { x: 240.0, y: 119.0, w: 35.3 },
      hora: { x: 313.5, y: 119.0, w: 35.3 }, grade: { x: 391.7, y: 119.0, w: 35.3 } },
    { dia: { x: 171.6, y: 89.0, w: 22.8 }, mes: { x: 227.5, y: 89.0, w: 22.8 },
      hora: { x: 288.4, y: 89.0, w: 22.8 }, grade: { x: 354.0, y: 89.0, w: 22.8 },
      alta: { x: 412.2, y: 89.0, w: 22.8 } }
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
