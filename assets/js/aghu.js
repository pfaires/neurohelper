/* Leitura dos dados do paciente copiados do AGHU (aba POL → Dados Pessoais).

   O texto copiado vem como pares rótulo/valor em linhas alternadas, com linhas
   em branco separando os grupos e rótulos sem valor quando o campo está vazio:

       Prontuário
       9033358

       Nome / Nome Social
       BERNADETE FREIRE DA SILVA
       Sexo
       Feminino

   O leitor não depende da ordem nem da quantidade de campos: percorre as linhas,
   reconhece os rótulos conhecidos e toma como valor a próxima linha que não seja
   outro rótulo. Também aceita "Rótulo: valor" e "Rótulo<TAB>valor" na mesma linha. */

(function () {
  'use strict';

  function normalizar(t) {
    return String(t || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[ \s]+/g, ' ')
      .replace(/[:•.\-–]+$/, '')
      .trim()
      .toLowerCase();
  }

  // rótulos que interessam → chave interna
  var ALVOS = {
    'prontuario': 'prontuario',
    'prontuario unico': 'prontuario',
    'n do prontuario': 'prontuario',
    'no do prontuario': 'prontuario',

    'nome / nome social': 'nome',
    'nome/nome social': 'nome',
    'nome social': 'nome',
    'nome do paciente': 'nome',
    'paciente': 'nome',
    'nome': 'nome',

    'sexo': 'sexo',

    'nome da mae': 'mae',
    'nome da mae / responsavel': 'mae',
    'nome da mae ou responsavel': 'mae',
    'mae': 'mae',

    'data de nascimento': 'nascimento',
    'dt nascimento': 'nascimento',
    'dt de nascimento': 'nascimento',
    'nascimento': 'nascimento',

    'cartao sus': 'cns',
    'cartao nacional de saude': 'cns',
    'cartao nacional de saude (cns)': 'cns',
    'cns': 'cns',

    'cpf': 'cpf',

    'logradouro': 'logradouro',
    'endereco': 'logradouro',
    'numero': 'numero',
    'no': 'numero',
    'n': 'numero',
    'complemento': 'complemento',
    'bairro': 'bairro',
    'cep': 'cep',
    'municipio': 'municipio',
    'municipio de residencia': 'municipio',
    'cidade': 'municipio',
    'uf': 'uf',

    'ddd': 'ddd',
    'telefone celular': 'telCelular',
    'celular': 'telCelular',
    'telefone residencial': 'telResidencial',
    'telefone': 'telResidencial',
    'telefone de contato': 'telResidencial',
    'telefone de recados': 'telRecados',
    'telefone comercial': 'telComercial'
  };

  /* Rótulos que o AGHU imprime mas não usamos. Precisam ser reconhecidos assim
     mesmo: é o que impede que sejam lidos como valor do campo anterior. */
  var IGNORAR = ('dados pessoais|cadastro|convenios|cadastroconvenios|enderecos|endereco(s)|' +
    'nome do pai|pai|cor|raca|raca/cor|naturalidade|nacionalidade|estado civil|profissao|' +
    'grau de instrucao|escolaridade|versao|observacoes|observacao|tipo de logradouro|pais|' +
    'religiao|ocupacao|documentos|documento|rg|identidade|orgao emissor|orgao expedidor|' +
    'contatos|contato|pol|dados do paciente|identificacao do paciente|identificacao|' +
    'codigo|situacao|tipo|email|e-mail|nome fantasia|responsavel|referencia|' +
    'data de cadastro|usuario|unidade|leito|especialidade').split('|');

  function ehRotulo(linha) {
    var n = normalizar(linha);
    if (!n) return false;
    return Object.prototype.hasOwnProperty.call(ALVOS, n) || IGNORAR.indexOf(n) >= 0;
  }

  function chaveDe(linha) {
    return ALVOS[normalizar(linha)] || null;
  }

  /* Interpreta o texto e devolve { campos, achados }.
     `campos` usa os mesmos nomes dos campos do formulário. */
  function lerAGHU(texto) {
    var linhas = String(texto || '')
      .replace(/\r\n?/g, '\n')
      .replace(/ /g, ' ')
      .split('\n')
      .map(function (l) { return l.replace(/\s+$/, '').replace(/^\s+/, ''); });

    var cru = {};
    var ultimoDDD = '';
    var dddDe = {};

    function guarda(chave, valor) {
      valor = String(valor || '').replace(/\s+/g, ' ').trim();
      if (chave === 'ddd') { ultimoDDD = valor.replace(/\D/g, ''); return; }
      if (chave.indexOf('tel') === 0 && dddDe[chave] === undefined) dddDe[chave] = ultimoDDD;
      if (cru[chave] === undefined || (!cru[chave] && valor)) cru[chave] = valor;
    }

    for (var i = 0; i < linhas.length; i++) {
      var l = linhas[i];
      if (!l) continue;

      // "Rótulo<TAB>valor" ou "Rótulo: valor" na mesma linha
      var par = null;
      if (l.indexOf('\t') >= 0) {
        var p = l.split('\t');
        if (ehRotulo(p[0])) par = [p[0], p.slice(1).join(' ')];
      }
      if (!par) {
        var m = /^([^:]{1,42}):\s*(.*)$/.exec(l);
        if (m && ehRotulo(m[1])) par = [m[1], m[2]];
      }
      if (par) {
        var kp = chaveDe(par[0]);
        if (kp) guarda(kp, par[1]);
        else if (normalizar(par[0]) === 'ddd') guarda('ddd', par[1]);
        continue;
      }

      if (!ehRotulo(l)) continue;

      // valor = próxima linha não vazia, desde que não seja outro rótulo
      var j = i + 1;
      while (j < linhas.length && !linhas[j]) j++;
      var valor = (j < linhas.length && !ehRotulo(linhas[j])) ? linhas[j] : '';

      var k = chaveDe(l);
      if (k) guarda(k, valor);
      if (valor) i = j;
    }

    // ---- monta os campos do formulário

    var M = window.Laudos.mascaras;
    var so = function (v) { return String(v || '').replace(/\D/g, ''); };
    var campos = {};
    var achados = [];

    function poe(campo, valor, rotulo) {
      if (!valor) return;
      campos[campo] = valor;
      achados.push(rotulo);
    }

    poe('nome', cru.nome, 'nome');
    poe('prontuario', so(cru.prontuario), 'prontuário');

    var cns = so(cru.cns);
    if (cns.length === 15) poe('cns', M.cns(cns), 'CNS');

    var cpf = so(cru.cpf);
    if (cpf.length === 11) poe('cpf', M.cpf(cpf), 'CPF');

    var dn = /(\d{2}\/\d{2}\/\d{4})/.exec(cru.nascimento || '');
    if (dn) poe('nascimento', dn[1], 'nascimento');

    var sexo = normalizar(cru.sexo);
    if (sexo.charAt(0) === 'f') poe('sexo', '3', 'sexo');
    else if (sexo.charAt(0) === 'm') poe('sexo', '1', 'sexo');

    poe('mae', cru.mae, 'nome da mãe');

    // telefone: celular tem prioridade, depois residencial, depois recados
    ['telCelular', 'telResidencial', 'telRecados', 'telComercial'].some(function (k) {
      var n = so(cru[k]);
      if (n.length < 8) return false;
      var completo = so(dddDe[k] || '') + n;
      if (completo.length < 10) return false;
      poe('telefone', M.telefone(completo), 'telefone');
      return true;
    });

    var partes = [];
    if (cru.logradouro) partes.push(cru.logradouro);
    if (cru.numero) partes.push(cru.numero);
    if (cru.complemento) partes.push(cru.complemento);
    var rua = partes.join(', ');
    if (cru.bairro) rua = rua ? rua + ' - ' + cru.bairro : cru.bairro;
    poe('endereco', rua, 'endereço');

    poe('municipio', cru.municipio, 'município');

    var uf = String(cru.uf || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (uf.length === 2) poe('uf', uf, 'UF');

    var cep = so(cru.cep);
    if (cep.length === 8) poe('cep', M.cep(cep), 'CEP');

    return { campos: campos, achados: achados };
  }

  window.Laudos.lerAGHU = lerAGHU;
})();
