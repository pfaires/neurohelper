# Residência Médica em Neurologia — HULW/UFPB

Site estático (HTML + CSS + JavaScript puro, sem build) para emissão de formulários
em PDF da Residência Médica em Neurologia do Hospital Universitário Lauro Wanderley / UFPB.

A identificação do paciente é preenchida uma única vez; cada documento é uma seção
recolhível com caixa de seleção e seus campos próprios. Vários documentos podem ser
emitidos de uma vez para o mesmo paciente, em um PDF único ou em arquivos separados.

## Publicação no GitHub Pages

1. Suba esta pasta para um repositório no GitHub.
2. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O site fica disponível em `https://<usuario>.github.io/<repositorio>/`.

Todos os caminhos são relativos, então funciona tanto na raiz do domínio quanto em subpasta.
O arquivo `.nojekyll` evita que o Jekyll interfira nos assets.

### Visibilidade

O site é de uso interno e não deve aparecer em buscadores. Por isso há um `robots.txt`
bloqueando o rastreamento e uma meta tag `robots` com `noindex` em cada página. As duas
coisas juntas cobrem tanto o robô que respeita o `robots.txt` quanto o que só olha a meta tag.

Isso mantém o site fora das buscas, mas **não é autenticação**: no GitHub Pages os arquivos
são públicos para quem tiver o endereço. Como todo o processamento acontece no navegador e
nenhum dado de paciente é gravado ou enviado, não há informação exposta — apenas os
formulários em branco e o código. Se um dia for preciso login de verdade, o caminho é
Cloudflare Pages com Cloudflare Access (gratuito até 50 usuários), sem mudar o código.

## Estrutura

```
index.html                          página inicial
formularios.html                    página única de emissão
assets/css/style.css                estilos
assets/js/pdf-comum.js              máscaras, desenho no PDF, montagem dos arquivos
assets/js/doc-*.js                  um arquivo por documento
assets/js/emitir.js                 monta a página e orquestra a geração
assets/js/vendor/                   (opcional) pdf-lib local
assets/pdf/                         modelos em branco
assets/img/                         logotipos HULW e HU Brasil
ferramentas/gerar-modelos.py        redesenha os modelos próprios do HULW
ferramentas/coordenadas.json        pontos de preenchimento gerados pelo script
servir.bat / servir.sh              servidor local para desenvolvimento
```

## Modelos em branco

Os dois formulários do SUS (mudança de procedimento e APAC) usam os PDFs oficiais.

Os três formulários próprios do HULW só existiam digitalizados, então foram redesenhados
em vetor por `ferramentas/gerar-modelos.py`, com os logotipos atuais — HU Brasil no lugar
de EBSERH. Para alterar o desenho, edite o script e rode a partir da raiz do site:

```
python3 ferramentas/gerar-modelos.py
```

Ele regrava os PDFs em `assets/pdf/` e o `ferramentas/coordenadas.json`, que é a fonte das
constantes usadas nos módulos `doc-requisicao-exames.js`, `doc-receituario-simples.js` e
`doc-receituario-controle-especial.js`. Se mudar o layout, atualize as constantes desses
módulos a partir do JSON. Requer `reportlab`.

## Como o PDF é gerado

O modelo oficial em branco é carregado com `fetch` e os dados são escritos por cima com a
biblioteca [pdf-lib](https://pdf-lib.js.org/), em Helvetica Bold, para destacar do texto
impresso do formulário. Nada é enviado para servidor algum — todo o processamento acontece
no navegador.

O resultado abre em nova aba; se o navegador bloquear o pop-up, aparecem links de download
na própria página.

### Documentos e campos preenchidos

**Mudança de procedimento** (Anexo II, folha 1/2)

| Bloco | Campos |
|---|---|
| Estabelecimento | 1 a 4 — fixos: HOSPITAL UNIVERSITÁRIO LAURO WANDERLEY, CNES 2400243 |
| Paciente | 5 a 13, 15 e 16 |
| Procedimento solicitado | 26 e 38, mais o "X" na barra de procedimentos especiais |
| Profissional solicitante | 39 a 42 |

**APAC** (fls. 1/2)

| Bloco | Campos |
|---|---|
| Estabelecimento solicitante | 1 e 2 — fixos |
| Paciente | 3 a 11, 13 e 14 |
| Procedimento solicitado | 16 e 17 |
| Justificativa | 33, 34, 35 e 37 (o campo 36, causas associadas, fica em branco) |
| Solicitação | 38 a 41 |

**Requisição de exames** (LAC-001) — A5 paisagem, 595 × 420 pt

Nome, prontuário, idade (calculada da data de nascimento), sexo, cartão social, enfermaria,
leito, dados clínicos, urgência, justificativa, material a examinar, exames e data.

**Receituário simples** — A5 retrato, 420 × 595 pt

Nome, data, prontuário e prescrição.

**Receituário de controle especial** — A4 paisagem, 842 × 595 pt

Duas vias idênticas lado a lado, com linha de corte no meio: paciente, endereço,
prescrição e data em cada uma. Se o CPF do paciente for informado, ele sai entre
parênteses depois do nome — é o único documento que usa esse campo. Os quadros de
identificação do comprador e do fornecedor ficam em branco, para preenchimento na farmácia.

Os demais campos ficam em branco para preenchimento manual.

### Importação do AGHU

O botão **Importar do AGHU**, na identificação do paciente, lê os dados copiados da aba
**POL → Dados Pessoais**. Basta selecionar tudo na tela do AGHU (`Ctrl+A`), copiar (`Ctrl+C`)
e clicar no botão.

O leitor (`assets/js/aghu.js`) interpreta o formato do AGHU — pares rótulo/valor em linhas
alternadas — e é tolerante a variações: linhas em branco a mais ou a menos, campos vazios,
acentuação perdida, caixa alta ou baixa, `Rótulo: valor` e `Rótulo<TAB>valor` na mesma
linha, e lixo em volta (cabeçalho e rodapé da página). A ordem dos campos não importa.

Preenche nome, prontuário, CNS, CPF, nascimento, sexo, nome da mãe, telefone, endereço
(logradouro, número, complemento e bairro reunidos), município, UF e CEP. Só altera os
campos encontrados no texto colado; o resto permanece como estava.

Quando o navegador permite ler a área de transferência, a importação é direta. Quando não
permite — Firefox, ou permissão negada no Chrome —, abre uma caixa para colar o texto com
`Ctrl+V`. Para acrescentar rótulos novos, edite os mapas `ALVOS` e `IGNORAR` em `aghu.js`.

### Dados guardados no navegador

Apenas nome, tipo e número do documento do **profissional solicitante** ficam salvos
(`localStorage`, chave `hulw.neuro.profissional`), para não redigitar a cada uso.
Nenhum dado de paciente é gravado.

### pdf-lib offline (opcional)

Por padrão a biblioteca vem do CDN jsDelivr. Para deixar o site independente de rede
externa, baixe `pdf-lib.min.js` e salve em `assets/js/vendor/pdf-lib.min.js` — o site
tenta o arquivo local primeiro e só recorre ao CDN se ele não existir.

```
curl -o assets/js/vendor/pdf-lib.min.js https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js
```

## Desenvolvimento local

As páginas usam `fetch` para ler os modelos PDF, o que não funciona abrindo o HTML
direto com `file://`. É preciso um servidor local.

**Windows:** dê dois cliques em `servir.bat`. Ele sobe o servidor e já abre o
navegador em `http://localhost:8000/`. Para usar outra porta: `servir.bat 8080`.

**macOS / Linux:** `./servir.sh` (ou `./servir.sh 8080`).

Nos dois casos, deixe a janela do terminal aberta enquanto estiver usando o site e
pressione `Ctrl+C` para parar.

Se preferir sem script: `python -m http.server 8000` dentro desta pasta.

## Adicionando um novo documento

Cada documento é um arquivo `assets/js/doc-<id>.js` que se registra sozinho. Não é preciso
mexer no HTML nem no `emitir.js`.

1. Coloque o modelo em branco em `assets/pdf/`.
2. Crie `assets/js/doc-<id>.js` no molde dos existentes, com:
   - `CX` (caixas de texto), `CEL` (grades de caractere), `DATA` (datas) e `MARCA`
     (marcações "X") — tudo em pontos PDF, origem no canto inferior esquerdo;
   - `campos`: os campos específicos do documento, que a página renderiza sozinha
     (`tipo` `texto` ou `area`, `larg` de 1 a 12 colunas, `mascara`, `obrigatorio`, `valor`);
   - `preencher(pincel, dados, api)`: recebe os dados já combinados (paciente +
     profissional + campos próprios) e desenha na página.
3. Acrescente a tag `<script>` do arquivo em `formularios.html`, antes de `emitir.js`.

Para descobrir as coordenadas de um modelo novo, vale lembrar que os PDFs oficiais do SUS
usados aqui têm o eixo Y espelhado na estrutura vetorial: a coordenada real é
`842 − y` do que as bibliotecas de extração reportam.

## Próximo passo previsto

Kits de documentos: agrupar documentos que costumam sair juntos (por exemplo, uma mudança
de procedimento para cada exame de imagem na investigação de doença desmielinizante),
com a possibilidade de marcar dentro do kit quais serão emitidos. A seleção por caixas
já existente é a base dessa funcionalidade.
