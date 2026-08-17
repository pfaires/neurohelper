/* ALSFRS-R — Escala de Avaliação Funcional da Esclerose Lateral Amiotrófica,
   versão revisada. HULW/UFPB.

   Doze itens de 0 a 4, total de 0 a 48; quanto menor, maior o comprometimento.
   Quatro domínios de três itens cada: bulbar, motor fino, motor grosso e
   respiratório — a versão revisada nasceu justamente para acrescentar os três
   itens respiratórios, que a original não tinha.

   O item 5 tem duas réguas: uma para quem não tem gastrostomia (cortar
   alimentos) e outra para quem tem (manusear fechos e utensílios). Só uma das
   duas é pontuada, e por isso a pergunta sobre gastrostomia vem antes — ela não
   soma ponto nenhum, só troca a régua.

   As descrições em português seguem a versão brasileira da escala (Guedes et
   al., Arq Neuropsiquiatr 2010). Confira contra o impresso do serviço antes de
   usar em pesquisa. */

(function () {
  'use strict';

  function op(v, t) { return { valor: v, texto: t }; }

  var GASTROSTOMIA = [
    op(1, 'Não'),
    op(0, 'Sim — mais de 50% da nutrição diária pela sonda')
  ];

  var CORTAR_SEM = [
    op(4, 'Normal'),
    op(3, 'Um pouco lento e desajeitado, mas não necessita de ajuda'),
    op(2, 'Consegue cortar a maioria dos alimentos, embora lento e desajeitado; necessita de alguma ajuda'),
    op(1, 'Alguém precisa cortar os alimentos, mas ainda consegue se alimentar lentamente'),
    op(0, 'Precisa ser alimentado')
  ];

  var CORTAR_COM = [
    op(4, 'Normal'),
    op(3, 'Desajeitado, mas consegue realizar todas as manipulações de forma independente'),
    op(2, 'Necessita de alguma ajuda com fechos e fixadores'),
    op(1, 'Presta ajuda mínima ao cuidador'),
    op(0, 'Incapaz de realizar qualquer parte da tarefa')
  ];

  window.Escalas.registrar({
    id: 'alsfrs-r',
    sigla: 'ALSFRS-R',
    titulo: 'Escala de Avaliação Funcional da ELA — revisada',
    descricao: 'Doze itens de 0 a 4, total de 0 a 48. Quanto menor, maior o ' +
               'comprometimento funcional. Avalia função bulbar, motora e respiratória.',
    referencia: 'Cedarbaum JM et al. The ALSFRS-R: a revised ALS functional rating scale ' +
                'that incorporates assessments of respiratory function. J Neurol Sci 1999. ' +
                'Versão em português: Guedes K et al. Arq Neuropsiquiatr 2010;68(1):44-7.',
    observacao: 'Pontue pelo que o paciente faz hoje, não pelo que conseguiria fazer. ' +
                'Na dúvida entre dois níveis, escolha o menor.',

    grupos: [
      {
        titulo: 'Bulbar',
        itens: [
          { id: 'fala', numero: 1, titulo: 'Fala', opcoes: [
            op(4, 'Normal'),
            op(3, 'Distúrbios da fala detectáveis'),
            op(2, 'Inteligível com repetições'),
            op(1, 'Fala combinada com comunicação não verbal'),
            op(0, 'Perda da fala útil')
          ] },

          { id: 'salivacao', numero: 2, titulo: 'Salivação', opcoes: [
            op(4, 'Normal'),
            op(3, 'Excesso discreto mas evidente de saliva na boca; pode babar à noite'),
            op(2, 'Excesso moderado de saliva; pode babar minimamente'),
            op(1, 'Excesso marcante de saliva, com algum babar'),
            op(0, 'Baba de forma marcante; requer lenço constantemente')
          ] },

          { id: 'degluticao', numero: 3, titulo: 'Deglutição', opcoes: [
            op(4, 'Hábitos alimentares normais'),
            op(3, 'Problemas alimentares precoces; engasgos ocasionais'),
            op(2, 'Mudanças na consistência da dieta'),
            op(1, 'Necessita de sonda para alimentação suplementar'),
            op(0, 'Nada por via oral; alimentação exclusivamente parenteral ou enteral')
          ] }
        ]
      },

      {
        titulo: 'Motor fino',
        itens: [
          { id: 'escrita', numero: 4, titulo: 'Escrita', opcoes: [
            op(4, 'Normal'),
            op(3, 'Lenta ou desleixada; todas as palavras são legíveis'),
            op(2, 'Nem todas as palavras são legíveis'),
            op(1, 'Capaz de segurar a caneta, mas incapaz de escrever'),
            op(0, 'Incapaz de segurar a caneta')
          ] },

          { id: 'gastrostomia', titulo: 'O paciente tem gastrostomia?',
            pontua: false,
            dica: 'Troca a régua do item 5. Não soma ponto.',
            opcoes: GASTROSTOMIA },

          { id: 'cortar', numero: 5,
            titulo: 'Cortar alimentos e manusear utensílios',
            dica: 'Com gastrostomia, avalia-se o manuseio de fechos e utensílios, não o corte.',
            opcoes: function (r) {
              return String(r.gastrostomia) === '0' ? CORTAR_COM : CORTAR_SEM;
            } },

          { id: 'vestir', numero: 6, titulo: 'Vestir-se e higiene', opcoes: [
            op(4, 'Função normal'),
            op(3, 'Cuida de si por completo, com esforço ou menor eficiência'),
            op(2, 'Necessita de assistência intermitente ou de métodos substitutivos'),
            op(1, 'Necessita de acompanhante para os cuidados pessoais'),
            op(0, 'Dependência total')
          ] }
        ]
      },

      {
        titulo: 'Motor grosso',
        itens: [
          { id: 'cama', numero: 7, titulo: 'Virar-se na cama e ajeitar as roupas de cama', opcoes: [
            op(4, 'Normal'),
            op(3, 'Um pouco lento e desajeitado, mas não necessita de ajuda'),
            op(2, 'Consegue virar-se ou ajeitar os lençóis sozinho, mas com grande dificuldade'),
            op(1, 'Consegue iniciar, mas não vira nem ajeita os lençóis sozinho'),
            op(0, 'Dependente')
          ] },

          { id: 'caminhar', numero: 8, titulo: 'Caminhar', opcoes: [
            op(4, 'Normal'),
            op(3, 'Dificuldades precoces para caminhar'),
            op(2, 'Caminha com assistência'),
            op(1, 'Movimento funcional sem deambulação'),
            op(0, 'Sem movimento voluntário das pernas')
          ] },

          { id: 'escadas', numero: 9, titulo: 'Subir escadas', opcoes: [
            op(4, 'Normal'),
            op(3, 'Lento'),
            op(2, 'Discreta instabilidade ou fadiga'),
            op(1, 'Necessita de ajuda'),
            op(0, 'Não consegue')
          ] }
        ]
      },

      {
        titulo: 'Respiratório',
        itens: [
          { id: 'dispneia', numero: 10, titulo: 'Dispneia', opcoes: [
            op(4, 'Ausente'),
            op(3, 'Ocorre ao caminhar'),
            op(2, 'Ocorre ao comer, tomar banho ou vestir-se'),
            op(1, 'Ocorre em repouso; dificuldade para respirar sentado ou deitado'),
            op(0, 'Dificuldade significativa; considera-se suporte ventilatório mecânico')
          ] },

          { id: 'ortopneia', numero: 11, titulo: 'Ortopneia', opcoes: [
            op(4, 'Ausente'),
            op(3, 'Alguma dificuldade para dormir por falta de ar; não usa rotineiramente mais de dois travesseiros'),
            op(2, 'Necessita de mais de dois travesseiros para dormir'),
            op(1, 'Só consegue dormir sentado'),
            op(0, 'Incapaz de dormir')
          ] },

          { id: 'respiratoria', numero: 12, titulo: 'Insuficiência respiratória', opcoes: [
            op(4, 'Ausente'),
            op(3, 'Uso intermitente de BiPAP'),
            op(2, 'Uso contínuo de BiPAP durante a noite'),
            op(1, 'Uso contínuo de BiPAP, noite e dia'),
            op(0, 'Ventilação mecânica invasiva por intubação ou traqueostomia')
          ] }
        ]
      }
    ],

    /* Os subescores por domínio dizem mais do que o total: 30 pontos com o
       respiratório zerado é uma situação muito diferente de 30 pontos com o
       respiratório intacto. */
    resumo: function (r) {
      var s = window.Escalas.somarItens;
      return [
        { rotulo: 'Bulbar', valor: s(r, ['fala', 'salivacao', 'degluticao']) + '/12' },
        { rotulo: 'Motor fino', valor: s(r, ['escrita', 'cortar', 'vestir']) + '/12' },
        { rotulo: 'Motor grosso', valor: s(r, ['cama', 'caminhar', 'escadas']) + '/12' },
        { rotulo: 'Respiratório', valor: s(r, ['dispneia', 'ortopneia', 'respiratoria']) + '/12' }
      ];
    },

    texto: function (r, ctx) {
      var E = window.Escalas;
      var soma = E.somar(this, r);
      var linhas = ['ALSFRS-R (' + ctx.data + '): ' + soma.pontos + ' pontos'];

      E.pontuaveis(this).forEach(function (item) {
        var v = r[item.id];
        linhas.push(item.numero + '. ' + item.titulo + ': ' +
                    (v === undefined || v === '' ? '—' : v));
      });

      if (String(r.gastrostomia) === '0') {
        linhas.push('(item 5 avaliado pela régua para paciente com gastrostomia)');
      }
      return linhas.join('\n');
    }
  });
})();
