# NeuroHelper — Residência em Neurologia, HULW/UFPB

Site estático (HTML + CSS + JavaScript puro, sem build) para emissão de documentos
da Residência Médica em Neurologia do Hospital Universitário Lauro Wanderley / UFPB.

O fluxo gira em torno do **atendimento**: identifique o paciente uma vez, grave quantos
documentos precisar, revise a lista e imprima tudo de uma vez. Todo o processamento
acontece no navegador; nada é enviado para servidor algum.

## Fluxo

```
prescritor  →  iniciar atendimento  →  formulário  →  gravar
                      ↑                                  ↓
                      └────────  página do atendimento  ←─┘
                                    ↓
                              imprimir tudo
```

Os kits são um atalho: pelo ambulatório, escolhe-se um conjunto de documentos que
costumam sair juntos, preenche-se o que é comum a eles e tudo entra no atendimento
já preenchido, pronto para revisão.

## Onde cada dado vive

| Dado | Onde | Até quando |
|---|---|---|
| Cadastro de prescritores | `localStorage` | permanente, é o cadastro da máquina |
| Prescritor ativo | `sessionStorage` | só nesta aba |
| Atendimento (paciente + documentos) | `sessionStorage` | some ao fechar a aba |

Dado de paciente nunca vai para o `localStorage`. Em computador compartilhado, o que
fica gravado em disco é apenas a lista de médicos — e o prescritor ativo é escolhido a
cada sessão, para ninguém emitir documento com o nome de quem usou a máquina antes.

Tudo passa por `assets/js/armazenamento.js`. No dia em que houver banco de dados,
troca-se o corpo daquelas funções por chamadas de API e nada mais precisa mudar.

## Páginas

| Arquivo | Papel |
|---|---|
| `index.html` | Início: atendimento em andamento, ambulatórios, configuração |
| `paciente.html` | Iniciar ou editar o paciente, com importação do AGHU |
| `atendimento.html` | Paciente, tabela de documentos e impressão |
| `formulario.html?doc=…&id=…` | Página genérica: renderiza qualquer documento |
| `prescritor.html` | Cadastro local de prescritores |
| `ambulatorio.html?id=…` | Seções recolhíveis com kits e referências |
| `kit.html?id=…` | Escolher itens do kit e incluir no atendimento |
| `kit-editor.html` | Criar e editar kits, exportar e importar o `kits.json` |

## Módulos

```
assets/js/pdf-comum.js       desenho no PDF, máscaras, texto
assets/js/armazenamento.js   prescritores, atendimento, documentos
assets/js/campos.js          campos declarativos: HTML, máscara, leitura, validação
assets/js/cabecalho.js       cabeçalho e barra de contexto de todas as páginas
assets/js/impressao.js       montagem e agrupamento dos PDFs
assets/js/aghu.js            leitura dos dados copiados do AGHU
assets/js/doc-*.js           um arquivo por documento
assets/dados/kits.json       kits publicados no repositório
assets/js/kits.js            carregador dos kits (repositório + locais)
assets/js/ambulatorios.js    conteúdo dos ambulatórios
assets/js/pag-*.js           script de cada página
```

## Ordem dos documentos

A tabela do atendimento é arrastável pela alça `⠿`. A ordem não é enfeite: ela
define a sequência de impressão e, com o agrupamento ligado, quais documentos de
meia página dividem a mesma folha de papel. Por isso a coluna **Folha** mostra
onde cada um cai, e o fundo alternado marca quem sai junto — arrastar sem esse
retorno seria às cegas.

A mesma alça anda com as setas do teclado quando está em foco, já que arrastar
não funciona nem com o dedo nem sem mouse.

## Meia página

Documento de meia página **sempre** sai numa folha A4, na metade de cima, girado
90° se for A5 retrato — mesmo quando é o único do lote. Nunca como página A5
avulsa: o que existe na bandeja é A4, e uma A5 solta sairia centralizada, com
margem de todo lado e sem a linha de corte, impossível de destacar direito.

A opção *agrupar* decide só se **dois** documentos podem dividir a mesma folha.
Desligada, cada um fica com a sua e a metade de baixo vai em branco.

Uma página inteira no meio da fila fecha a folha de meia página que estava
aberta. Custa papel de vez em quando, mas sem isso a meia página seguinte
voltaria para uma folha lá atrás e o papel sairia fora da ordem da tabela — que
é justamente o que quem arrasta as linhas está tentando controlar. Para juntar
duas metades, basta deixá-las lado a lado na lista.

## Documentos

| Documento | Folha | Origem do modelo |
|---|---|---|
| Mudança de procedimento (Anexo II) | A4 retrato | oficial do SUS |
| APAC | A4 retrato | oficial do SUS |
| Requisição de exames (LAC-001) | A5 paisagem | redesenhado |
| Receituário simples | A5 retrato | redesenhado |
| Receituário de controle especial | A4 paisagem, duas vias | redesenhado |
| LME — solicitação de medicamentos | A4 retrato | oficial do SUS, dois modelos |
| Outros documentos | A5 retrato | redesenhado |
| FAA — ficha de atendimento ambulatorial | A5 paisagem | redesenhado, fiel ao impresso |

Campos preenchidos em cada um:

- **Mudança de procedimento** — 1 a 4 (fixos), 5 a 13, 15, 16, 26, 38, 39 a 42, e o "X" na barra de procedimentos especiais.
- **APAC** — 1 e 2 (fixos), 3 a 11, 13, 14, 16, 17, 33 a 35, 37, 38 a 41.
- **Requisição de exames** — nome, prontuário, idade (calculada), sexo, cartão social, enfermaria, leito, dados clínicos, urgência, justificativa, material e exames.
- **Receituário simples** — nome, data, prontuário e prescrição.
- **Receituário de controle especial** — paciente (com CPF entre parênteses, se informado), endereço, prescrição e data, iguais nas duas vias.
- **FAA** — nome, prontuário, data, descrição da patologia, especialidade e as três linhas de retorno (dia, mês, hora, grade, e alta na terceira). Os campos de retorno são texto livre, e ficam em branco se não forem preenchidos — quem completa é o balcão da marcação. O carimbo é sempre à mão.

  O desenho da FAA foi **medido** sobre `ferramentas/origem/faa-digitalizada.pdf`,
  não estimado: as réguas do escaneamento foram detectadas por varredura,
  corrigida a inclinação de 0,8°, e convertidas a 0,20593 pt por pixel. Não é
  capricho — quem recebe a ficha no balcão reconhece o papel pelo formato, e um
  layout "melhorado" corre o risco de não ser aceito.

  O impresso tem particularidades que ficam como estão:

  - o rótulo fica **acima** da caixa, menos em `PRONTUÁRIO HULW`, que fica ao lado;
  - `CARIMBO E ASSINATURA` fica **dentro** da própria caixa, no alto;
  - a base do carimbo alinha com a base de `ESPECIALIDADE MÉDICA`;
  - as caixas da grade têm larguras diferentes entre si — `DIA` e `MÊS` curtas,
    `HORA` e `GRADE` largas — e `ALTA` só existe na terceira linha, à direita,
    embaixo da coluna do carimbo;
  - não há moldura em volta da folha, nem rodapé.
- **Outros documentos** — folha livre para atestado, declaração, relatório, encaminhamento. Título impresso (opcional, sai em maiúsculas), teor e assinatura. A opção *imprimir nome e registro do prescritor* pode ser desmarcada por quem prefere só carimbar: sai apenas a linha, com a legenda embaixo.

- **LME** — 1 e 2 (fixos), 3.1, 3.2, 4 a 6, 7 e 8 (até seis medicamentos com as quantidades dos seis meses), 9 a 16, 18 a 22. As assinaturas (17 e 23) ficam em branco.

### Os dois modelos de LME

Circulam dois formulários oficiais, e o campo *Modelo do formulário* escolhe:

- **Simplificado** (padrão) — sem as grades de caractere: CNES, CNS, CPF e telefone
  são texto corrido. Traz o nome social do paciente (campo 3.2), que o outro não tem.
- **Oficial completo** — o do cabeçalho do SUS, que algumas farmácias exigem.

O completo é aquele cuja geometria de desenho é imprestável (matrizes aninhadas
que não fecham) e que por isso ficou de fora na primeira tentativa. A saída veio
de outro lugar: a **versão eletrônica** publicada pelo Ministério traz 85 campos
AcroForm, com os retângulos exatos de cada campo — a fonte de coordenadas mais
confiável que existe para esse PDF.

`ferramentas/preparar-lme-oficial.py` lê essa versão, guarda os retângulos em
`assets/js/coord-lme-oficial.js` e **arranca** widgets e AcroForm, deixando um PDF
chapado em `assets/pdf/lme-oficial.pdf`. O site desenha por cima, com o mesmo
pincel dos outros documentos.

Entregar o AcroForm preenchido teria sido mais curto, mas errado: a barra de
botões do topo ("Salvar como", "Limpar todos os campos") sairia impressa, os
campos continuariam editáveis na mão de quem recebe, e as fontes declaradas nos
campos não estão embutidas.

A ordem das opções de marcação (raça, quem preencheu, CPF/CNS) veio dos valores
de exportação `/0`../4` de cada quadradinho, conferida contra os rótulos extraídos
ao redor — não da posição no papel, que em raça/cor não segue a ordem de leitura.

> **Ao mapear coordenadas por extração**, lembre que bibliotecas como o pdfplumber
> informam o rodapé da caixa da fonte, não a linha de base: ela fica `0,207 × corpo`
> acima. Ignorar isso faz o texto preenchido sair cerca de 2 pt abaixo do rótulo do
> formulário — sutil na tela, evidente no papel.

## Formatação nos campos longos

Justificativa, anamnese, prescrição, teor — todo campo de texto longo aceita um
subconjunto de markdown, propositalmente estreito para não surpreender quem escreve
texto corrido:

| Escrita | Resultado |
|---|---|
| `**assim**` ou `__assim__` | negrito |
| `*assim*` ou `_assim_` | itálico |
| `#`, `##`, `###` no começo da linha | título (corpo maior, negrito) |
| `-`, `*`, `+` no começo da linha | item com marcador |
| `1.` ou `1)` no começo da linha | item numerado |
| `> ` no começo da linha | citação recuada, em itálico |
| linha só com `---` | fio horizontal |

O itálico só vale quando abre e fecha na **mesma linha**, colado a caractere que não
seja espaço: `12 * 3 * 4` continua saindo com os asteriscos. O fio horizontal só sai
quando a linha inteira é feita de três ou mais traços iguais — uma receita com
`Dipirona 500 mg ------ 20 comp.` não vira fio.

As quebras de linha continuam sendo respeitadas, e o corpo ainda encolhe sozinho
(até 7 pt) quando o texto não cabe na área do formulário.

### Os dois modos de edição

Todo campo longo tem uma barra com negrito, itálico, título, lista, lista
numerada, citação e fio, e uma chave **Visual | Markdown**:

- **Visual** é um `contenteditable`: os marcadores aparecem como marcadores, não
  como asteriscos. É o modo de quem nunca ouviu falar de markdown, e o que abre
  por padrão.
- **Markdown** é o `<textarea>` cru, para quem já escreve assim ou quer conferir
  o que está gravado.

A escolha fica gravada na máquina (`neurohelper.editorModo`).

O `<textarea>` é sempre a fonte da verdade: o modo visual escreve de volta nele a
cada tecla. Nada mais no site sabe que o editor existe — `Campos.ler` continua
lendo o campo e o gerador continua recebendo markdown puro.

O modo visual oferece **exatamente** o subconjunto que o PDF imprime, de
propósito. Uma barra com tabela ou link deixaria a pessoa escrever algo que sai
em branco no papel. Pelo mesmo motivo, colar traz só o texto: fonte, cor e tabela
vindas de outro programa não teriam como ser impressas.

`node ferramentas/provas/prova-editor.js` garante o que mais importa aqui: passar
pelo modo visual não altera o texto. Markdown → DOM → markdown tem de devolver
byte a byte o que entrou, senão o simples ato de olhar o campo estragaria o
documento.

> **Ao embarcar páginas de um PDF em outro**, libere o documento de origem antes
> (`await doc.flush()`). As fontes do pdf-lib só entram no arquivo nesse momento;
> antes disso o dicionário de recursos aponta para objetos que ainda não existem.
> `copyPages()` faz o flush sozinho, `embedPages()` não — e o sintoma é silencioso:
> o texto sai, mas em fonte padrão, sem negrito nem itálico.

### Lista de medicamentos do LME

`assets/dados/medicamentos-lme.json` traz os 344 itens do Componente Especializado,
extraídos do campo de seleção da versão eletrônica oficial do formulário. O campo do
medicamento é um combobox que sugere a lista mas **aceita escrita livre** — nomes fora
da relação podem ser digitados normalmente. A lista é carregada sob demanda, só quando
o LME é aberto.

Para atualizar quando o Ministério revisar a relação, extraia de novo do PDF eletrônico:

```
python3 -c "
from pypdf import PdfReader; import json
r = PdfReader('Formulário LME - Eletrônico.pdf')
opts = r.get_fields()['form_16_0']['/Opt']
nomes = [o[0] if isinstance(o, (list, tuple)) else o for o in opts]
json.dump([str(n).strip() for n in nomes if str(n).strip()],
          open('assets/dados/medicamentos-lme.json', 'w'), ensure_ascii=False, indent=0)"
```

O bloco de identificação do médico (nome, título, CRM, RQE) fica guardado no cadastro
mas ainda **não é impresso**: as áreas de assinatura saem em branco para carimbo físico.
Ligar isso depois é uma tarefa isolada.

## Impressão agrupada

Documentos de meia página dividem uma folha A4 retrato, cortada ao meio na horizontal,
com linha tracejada marcando onde cortar. São duas vagas de 595 × 421 pt:

- **A5 paisagem** (requisição de exames) entra direto na vaga;
- **A5 retrato** (receituário simples) entra girado 90° para a esquerda e ocupa
  exatamente a mesma vaga.

Como a vaga é a mesma para os dois, tipos diferentes dividem a folha — uma requisição
em cima e um receituário embaixo, por exemplo — e o corte é sempre no mesmo lugar.
O agrupamento respeita a ordem da tabela: cada documento entra na próxima vaga livre.
A página mostra quantas folhas vão sair e quanto se economiza; a caixa pode ser
desmarcada para uma folha por documento.

### Emitir sem data

Cada documento tem a opção **emitir sem data**, que deixa o campo de data em branco no
PDF para preenchimento à mão. A escolha fica gravada junto com o documento e aparece
marcada na lista do atendimento.

### Exames em colunas

Na requisição de exames, a lista é distribuída em até quatro colunas de cerca de sete
linhas, preenchidas da esquerda para a direita. Com 15 exames, por exemplo, saem três
colunas de cinco. O corpo da letra se ajusta ao número de linhas por coluna.

## Importação do AGHU

Na aba **POL → Dados Pessoais** do AGHU, selecione tudo (`Ctrl+A`), copie (`Ctrl+C`) e
clique em **Importar do AGHU** na identificação do paciente.

O leitor interpreta pares rótulo/valor e tolera variações: linhas em branco a mais ou a
menos, campos vazios, acentuação perdida, caixa alta ou baixa, `Rótulo: valor` e
`Rótulo<TAB>valor` na mesma linha, e cabeçalho ou rodapé em volta. A ordem não importa.
Preenche nome, prontuário, CNS, CPF, nascimento, sexo, nome da mãe, telefone, endereço,
município, UF e CEP, sem tocar no que não veio na cópia. Rótulos novos entram nos mapas
`ALVOS` e `IGNORAR` em `aghu.js`.

## Modelos em branco

A mudança de procedimento, a APAC e o LME usam os PDFs oficiais direto. Os três
formulários do HULW só existiam digitalizados e foram redesenhados em vetor por
`ferramentas/gerar-modelos.py`, com os logotipos atuais — HU Brasil no lugar de EBSERH.

Para mudar o desenho:

```
python3 ferramentas/gerar-modelos.py
```

O script regrava os PDFs em `assets/pdf/` e o `ferramentas/coordenadas.json`, que é a
fonte das constantes dos módulos correspondentes. Requer `reportlab`.

> Os dados institucionais (CNPJ, endereço, telefone) foram padronizados a partir dos dois
> receituários originais, que traziam informações divergentes. **Confira antes de usar em
> produção**, sobretudo no controle especial, sujeito à Portaria SVS/MS 344/98.

## Acrescentar um documento

Cada documento é um `assets/js/doc-<id>.js` que se registra sozinho. Não é preciso mexer
em nenhuma página.

1. Coloque o modelo em branco em `assets/pdf/`.
2. Crie `assets/js/doc-<id>.js` no molde dos existentes, declarando:
   - `folha`: `a4-retrato`, `a4-paisagem`, `a5-retrato` ou `a5-paisagem`;
   - `campos`: os campos próprios, que a página de formulário renderiza sozinha
     (`texto`, `area`, `caixa`, `radio`, `lista` para combobox com escrita livre e
     `linhas` para tabelas repetidas, como os medicamentos do LME);
   - `tituloPadrao(dados)`: título automático da linha na tabela;
   - `preencher(pincel, dados, api)`: desenha sobre o modelo.
3. Acrescente a tag `<script>` em `atendimento.html`, `formulario.html`, `kit.html` e
   `kit-editor.html`.

Para descobrir coordenadas de um modelo oficial do SUS, lembre que o eixo Y da estrutura
vetorial vem espelhado: a coordenada real é `842 − y` do que as bibliotecas reportam.

## Kits

Um kit é um conjunto de documentos que costuma sair junto. Ele lista os documentos com
valores de partida e pode ter um campo comum — `aplicaEm` diz em quais campos de cada
documento aquele dado entra, de modo que o mesmo resumo clínico vira justificativa numa
mudança de procedimento e dados clínicos numa requisição de exames.

Os kits vêm de duas origens, mescladas por id com o local sobrepondo:

| Origem | Onde | Alcance |
|---|---|---|
| Publicados | `assets/dados/kits.json` | todo mundo, após o deploy |
| Locais | `localStorage` | só aquele computador, na hora |

### Editor

`kit-editor.html` cria e edita kits pela interface: título, ambulatório, campo comum e a
lista de documentos, cada um com os seus campos preenchidos pela mesma renderização
declarativa dos formulários. Dá para reordenar, duplicar e remover itens.

**Salvar** grava no `localStorage` e o kit já aparece no ambulatório daquele computador —
sem deploy. Isso serve para iterar no texto até ficar bom.

**Publicar** é exportar: o botão gera um `kits.json` com todos os kits (publicados mais
locais), que você substitui em `assets/dados/kits.json` no repositório e sobe. A partir
daí o kit passa a valer para todo mundo.

**Importar** lê um `kits.json` de volta para o computador — útil para levar kits de uma
máquina a outra antes de publicar.

Um kit publicado que você editar localmente fica marcado como "alterado aqui", e o botão
**restaurar original** descarta a versão local e volta à publicada.

O carregamento é assíncrono: quem usa `Kits.todos()` ou `Kits.porId()` precisa chamar
`Kits.carregar()` antes.

## Ambulatórios

Editados em `assets/js/ambulatorios.js`. Cada ambulatório é uma lista de seções
recolhíveis; cada item de seção é um kit, um link ou uma nota. O conteúdo atual é um
esqueleto a ser preenchido.

## Publicação no GitHub Pages

Settings → Pages → *Deploy from a branch*, `main`, `/ (root)`. Os caminhos são relativos,
então funciona em subpasta. O `.nojekyll` impede o Jekyll de interferir.

### Visibilidade

`robots.txt` bloqueia rastreamento e cada página traz `noindex`. Isso mantém o site fora
das buscas, mas **não é autenticação** — no GitHub Pages os arquivos são públicos para
quem tiver o endereço. Como nada de paciente é gravado em disco nem enviado, o que fica
exposto são os formulários em branco e o código. Para login de verdade, o caminho é
Cloudflare Pages com Cloudflare Access, sem mudar o código.

### pdf-lib offline (opcional)

Por padrão a biblioteca vem do CDN jsDelivr. Para deixar o site independente de rede,
baixe `pdf-lib.min.js` para `assets/js/vendor/pdf-lib.min.js` — o site tenta o arquivo
local primeiro.

```
curl -o assets/js/vendor/pdf-lib.min.js https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js
```

## Desenvolvimento local

As páginas usam `fetch` para ler os modelos PDF, o que não funciona com `file://`.

**Windows:** dois cliques em `servir.bat` (ou `servir.bat 8080` para outra porta).
**macOS / Linux:** `./servir.sh`.

Sem script: `python -m http.server 8000` dentro desta pasta.
