# Plano de migração — NeuroHelper para Cloudflare

Objetivo: compartilhar **kits e conteúdo** entre os residentes e ter **login com cadastro
de prescritores por pessoa**, sem deploy a cada ajuste. Dado de paciente continua só no
navegador — nada disso muda essa propriedade.

Este é um plano para análise, não um passo a passo pronto para executar. Os detalhes de
tela do painel da Cloudflare mudam com frequência; o que está aqui é a sequência, as
decisões e os riscos.

---

## 1. O que você precisa ter antes de começar

| Item | Custo | Observação |
|---|---|---|
| Conta Cloudflare | grátis | E-mail e senha. O plano gratuito não pede cartão. |
| Domínio ativo **na** Cloudflare | você já tem `pfaires.xyz` | **Este é o requisito não óbvio.** |
| Node.js na sua máquina | grátis | Para o `wrangler`, a ferramenta de linha de comando. |
| Lista de e-mails dos residentes | — | Quem poderá entrar. Pode começar só com o seu. |

### O requisito do domínio

A documentação do Cloudflare Access é explícita: aplicações self-hosted exigem *"an active
domain on Cloudflare"*. O endereço gratuito `<projeto>.pages.dev` **não** pode ser protegido
por Access. Então o site precisa de um subdomínio seu — algo como `neuro.pfaires.xyz` — e
esse domínio precisa estar na sua conta Cloudflare.

Há dois modos de colocá-lo lá:

- **Setup completo**: você troca os *nameservers* de `pfaires.xyz` no registrador atual para
  os da Cloudflare. É o caminho normal e o que dá menos dor depois.
- **Setup parcial (CNAME)**: o DNS continua onde está e você cria um CNAME apontando para a
  Cloudflare. Evita mexer no resto do domínio, mas tem passos manuais extras.

> **Risco a avaliar antes de decidir.** Trocar os nameservers move **todo** o DNS de
> `pfaires.xyz` para a Cloudflare, incluindo o que aponta para o seu OMV. Antes de virar a
> chave, exporte a zona atual e confira que todos os registros existentes foram recriados na
> Cloudflare. A propagação leva de minutos a algumas horas; nesse intervalo, um registro
> esquecido fica fora do ar. Se isso incomodar, o setup parcial existe justamente para esse
> caso.

---

## 2. Sequência em quatro fases

A ordem importa: cada fase entrega algo utilizável e as duas primeiras não introduzem login
nenhum. A fricção de autenticação só chega na fase 3, quando já houver benefício acumulado
para justificá-la.

### Fase 1 — Trocar a hospedagem

O site fica idêntico. Só muda de onde ele é servido.

**Você faz:**
1. Cria a conta Cloudflare.
2. Adiciona `pfaires.xyz` à conta e decide entre setup completo ou parcial.
3. Cria um projeto no Cloudflare Pages conectado ao repositório `pfaires/neurohelper` —
   isso pede autorizar o aplicativo da Cloudflare na sua conta do GitHub.
4. Configura o build: nenhum comando, diretório de saída a raiz. O site não tem build.
5. Aponta o domínio personalizado `neuro.pfaires.xyz` para o projeto.

**Eu faço:** nada. O site já funciona como está.

**Resultado:** o mesmo site em dois endereços. O GitHub Pages continua no ar como rede de
segurança. `git push` passa a publicar nos dois.

**Como voltar atrás:** apagar o projeto no Pages. O GitHub Pages nunca parou.

---

### Fase 2 — Kits compartilhados, ainda sem login

O ganho maior com a menor fricção. Kit não é dado sensível, então **leitura fica pública** —
ninguém precisa se identificar para usar o site. Só a **escrita** é protegida.

**Você faz:**
1. Instala o `wrangler` e autentica na sua conta.
2. Cria o banco D1 e roda o esquema (eu entrego o arquivo `.sql`).
3. Publica o Worker (eu entrego o código).
4. No Zero Trust, cria a organização e protege **apenas** `neuro.pfaires.xyz/kit-editor.html`
   e as rotas de escrita da API, com o seu e-mail na lista.
5. Carrega o `kits.json` atual para dentro do D1 — um comando.

**Eu faço:**
- Worker com as rotas de leitura e escrita de kits.
- Esquema do D1.
- Modo remoto no `armazenamento.js` e no `kits.js`, mantendo o `assets/dados/kits.json`
  estático como reserva quando a rede falhar.
- No editor de kits, "salvar" passa a gravar no servidor; exportar e importar continuam
  existindo para backup.

**Resultado:** você edita um kit e todos os residentes veem na hora. Nenhum deles precisa
fazer login para nada. Você faz login só para editar.

**Como voltar atrás:** apontar `kits.js` de volta para o arquivo estático. Uma linha.

---

### Fase 3 — Login e prescritores por pessoa

Aqui entra a fricção. Vale medir a fase 2 em uso real antes de seguir.

**Você faz:**
1. Estende a proteção do Access para o site inteiro, não só o editor.
2. Escolhe o método de autenticação. O mais simples é **código de uso único por e-mail**:
   não exige conta em lugar nenhum, o residente digita o e-mail e recebe um número.
   Login com Google também é possível e é mais rápido no dia a dia.
3. Cadastra os e-mails dos residentes na política de acesso.
4. Define a duração da sessão. Este número é a decisão de segurança do computador
   compartilhado — sessão longa é cômoda e perigosa; curta é o contrário.

**Eu faço:**
- Worker passa a ler a identidade do cabeçalho que o Access injeta e valida o token.
- Tabela de prescritores chaveada por e-mail; o cadastro segue o residente entre máquinas.
- O seletor de prescritor na barra do topo dá lugar ao nome de quem está logado, com botão
  de sair bem visível.

**Resultado:** o residente entra, os dados dele já estão lá, em qualquer computador.

**Como voltar atrás:** remover a política do Access do site inteiro e manter só no editor.
O seletor manual precisaria ser reativado no código.

---

### Fase 4 — Ajustes de convivência

Coisas que só aparecem com uso real: duração de sessão, botão de sair no lugar certo,
comportamento quando a rede cai no meio do atendimento, mensagem para quem não está na lista.

---

## 3. Custos

| Item | Plano gratuito | Suficiente? |
|---|---|---|
| Cloudflare Pages | ilimitado para site estático | sim |
| Workers | 100 mil requisições/dia | muito além do necessário |
| D1 | 5 milhões de linhas lidas/dia, 100 mil escritas/dia, 5 GB | o `kits.json` inteiro tem 3 KB |
| Cloudflare Access | até 50 usuários | sim |
| Domínio `.xyz` | você já paga | — |

Custo adicional previsto: **zero**. O risco financeiro é entrar em plano pago sem perceber;
o painel avisa antes, e os limites acima são inatingíveis neste uso.

---

## 4. O que fica melhor e o que fica pior

**Melhor:**
- Kits e conteúdo atualizados sem deploy.
- Dados do prescritor seguem a pessoa, não a máquina.
- O site deixa de ser publicamente acessível — o `robots.txt` e o `noindex` de hoje viram
  desnecessários, porque passa a haver autenticação de verdade.
- Deploy contínuo a partir do mesmo `git push`.

**Pior:**
- Abrir o site custa um login (a partir da fase 3). Em ambulatório com revezamento rápido no
  mesmo computador, isso pesa.
- A sessão do Access persiste no navegador: sem clicar em sair, o próximo residente herda a
  identidade do anterior. É o mesmo problema que hoje resolvemos com o seletor por aba, só
  que agora com consequência maior, porque o nome vai impresso no documento.
- Uma dependência a mais: se a Cloudflare estiver fora do ar, o site sai junto. Hoje o
  GitHub Pages tem o mesmo problema, então a mudança é lateral.
- Mais uma ferramenta para manter (`wrangler`, esquema do banco, migrações futuras).

---

## 5. Decisões que dependem de você

1. **Setup completo ou parcial do DNS** — quanto você quer mexer no `pfaires.xyz` existente.
2. **Subdomínio** — `neuro.pfaires.xyz` ou outro.
3. **Método de login** — código por e-mail (sem contas) ou Google (mais rápido).
4. **Duração da sessão** — o número que equilibra comodidade e segurança no computador
   compartilhado.
5. **Parar na fase 2?** — kits compartilhados sem login talvez já resolvam o que incomoda,
   e evitam toda a fricção da fase 3.

---

## 6. Sugestão

Fazer as fases 1 e 2, usar por algumas semanas e só então decidir sobre a 3. A fase 2 entrega
o benefício que você buscou primeiro — conteúdo compartilhado — sem cobrar nada de quem só
quer imprimir uma receita. Se depois disso o cadastro de prescritor por máquina ainda
incomodar, a fase 3 se justifica sozinha.
