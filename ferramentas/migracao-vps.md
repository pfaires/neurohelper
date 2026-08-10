# Plano alternativo — NeuroHelper num VPS Linux de 1 GB

Mesmo objetivo do outro plano: kits e conteúdo compartilhados, login e cadastro de
prescritores por pessoa. Dado de paciente continua só no navegador.

Este documento é para comparar com `migracao-cloudflare.md`, não para executar direto.

---

## 1. Resposta curta às suas perguntas

**Postgres?** Não. **Redis?** Também não.

Não é dogma, é o tamanho do problema. O que precisa ser guardado são algumas dezenas de
kits e algumas dezenas de prescritores — o `kits.json` inteiro tem 3 KB. A carga é
predominantemente de leitura, com escrita rara, num único processo.

**SQLite** resolve isso melhor que Postgres neste caso específico: roda dentro do processo
Node, não consome RAM como serviço separado, não tem daemon para subir nem tuning para
fazer, e o backup é copiar um arquivo. Em modo WAL aguenta leitura concorrente sem
problema. Se um dia houver concorrência de escrita real, migrar SQLite para Postgres é
caminho batido — mas não se paga esse custo antes da hora.

**Redis** existe para resolver problemas que este projeto não tem: cache compartilhado entre
processos, pub/sub, escrita em altíssima frequência. Sessão de login cabe num cookie
assinado ou numa tabela SQLite. Instalar Redis com persistência aqui é sustentar mais um
serviço, mais um arquivo de configuração e mais um vetor de ataque para zero ganho.

Postgres (~150 MB residentes) mais Redis (~50 MB) num VPS de 1 GB não quebram a máquina,
mas ocupam metade da memória útil sem entregar nada.

---

## 2. O que instalar de fato

| Papel | Escolha | Por quê |
|---|---|---|
| Proxy reverso e TLS | **Caddy** | Certificado Let's Encrypt automático, renovação automática, arquivo de configuração de cinco linhas. Com nginx você faz o mesmo com certbot, cron e mais peças. |
| Aplicação | **Node.js** | O código do projeto já é JavaScript. |
| Banco | **SQLite** (`better-sqlite3`) | Arquivo no disco, zero manutenção. |
| Supervisão | **systemd** | Já está instalado. Um arquivo de unidade reinicia o serviço se cair e sobe no boot. Não precisa de pm2. |
| Firewall | **ufw** | Fecha tudo menos 22, 80 e 443. |
| Atualizações | **unattended-upgrades** | Correções de segurança do sistema aplicadas sozinhas. |
| Backup | **cron + restic** (ou rclone) | Ver seção 5. |
| Monitoramento externo | UptimeRobot ou similar, gratuito | Para você saber que caiu antes dos residentes avisarem. |

**Sobre Docker:** eu não usaria neste tamanho. Para uma aplicação Node e um proxy, o ganho
de reprodutibilidade não paga a camada extra nem a memória num VPS de 1 GB. Se um dia
houver três ou quatro serviços, muda a conta.

**Sobre swap:** muitas imagens mínimas vêm sem swap. Configure 1 ou 2 GB — é o que evita
que um pico de memória mate o processo.

### Orçamento de memória, aproximado

```
Sistema (Debian/Ubuntu mínimo)   150–250 MB
Caddy                             ~20 MB
Node (aplicação)                 60–120 MB
SQLite                            dentro do Node
                                 ─────────────
                                 230–390 MB
```

Sobra folga confortável em 1 GB. Com Postgres e Redis, ficaria em torno de 600–700 MB —
funciona, mas sem margem para picos.

---

## 3. Autenticação: o buraco real

Esta é a diferença que importa entre os dois planos, e é maior do que parece.

O Cloudflare Access entrega, sem código: tela de login, envio do código por e-mail,
sessão, expiração, lista de quem pode entrar, e a identidade verificada chegando na
aplicação. Num VPS, tudo isso é seu.

As opções, da mais simples à mais trabalhosa:

**Link mágico por e-mail** — o residente digita o e-mail, recebe um link, entra. Bom
para o usuário, mas exige um serviço de envio de e-mail transacional (Resend, Brevo, SES),
com domínio verificado, SPF e DKIM configurados. Sem isso os e-mails caem em spam, e um
login que não chega é um login que não existe.

**Login com Google** — evita a infraestrutura de e-mail e é rápido no dia a dia. Custa
criar projeto no Google Cloud, configurar tela de consentimento e implementar o fluxo
OAuth. Uma vez pronto, é o que dá menos atrito no ambulatório.

**Senha por usuário** — zero dependências externas, mas você passa a guardar hash de
senha, tratar recuperação, e explicar a política de senha para dez residentes. É o pior
dos três para um projeto tocado nas horas vagas.

Estime alguns dias de trabalho para qualquer uma delas, mais a manutenção depois. É o
principal custo escondido do caminho VPS.

---

## 4. Onde o VPS realmente ganha

Vale listar o que você compra com essa complexidade, para a decisão ser justa:

- **Processo demorado.** Gerar cem PDFs em lote no servidor, coisa que um Worker não faz
  bem por causa dos limites de tempo de execução.
- **Tarefa agendada.** Cron de verdade, para relatórios, limpeza, exportação.
- **Arquivos.** Guardar modelos, anexos, imagens sem contratar armazenamento à parte.
- **Controle de onde o dado fica.** Se um dia houver aval institucional para guardar dado
  de paciente, um servidor que você controla — ou que a UFPB controla — é conversa
  possível. Um KV em datacenter estrangeiro, muito menos.
- **Sem limite por requisição** e sem depender do plano gratuito de ninguém.
- **Ambiente igual ao local.** Desenvolver e testar sem emulador.
- **A máquina serve para mais coisas.** Você já administra um OMV, então a curva de
  aprendizado não é nova.

---

## 5. O que dá errado, e é sempre a mesma coisa

**Backup.** É o item que todo mundo adia. Com SQLite é simples e não há desculpa:

```
sqlite3 dados.db ".backup /tmp/dados-$(date +%F).db"
```

e daí para fora da máquina — restic para um bucket, rclone para o seu OMV, o que for. Um
backup que fica no mesmo VPS não é backup. E backup que nunca foi restaurado também não é:
teste a restauração pelo menos uma vez.

**Disco cheio.** Log sem rotação enche disco pequeno e derruba tudo. `journald` já rotaciona
por padrão, mas confira o limite.

**Você é o plantão.** Se cair num domingo, cai até você ver. Um monitor externo gratuito
resolve o "eu não sabia".

**Exposição.** O VPS tem IP público e vai receber varredura de porta e tentativa de SSH
desde o primeiro dia. Chave em vez de senha, root desabilitado e ufw resolvem 99% disso.

---

## 6. Fases

**Fase 1 — Máquina base.** Criar o VPS, usuário sem privilégio, SSH por chave, senha e root
desabilitados, ufw, unattended-upgrades, swap. Apontar o DNS do subdomínio para o IP.

**Fase 2 — Site estático servido pelo Caddy.** Publicar o site atual, com TLS automático.
Equivale à fase 1 do plano Cloudflare. Deploy por `git pull` num cron ou por webhook.

**Fase 3 — API e banco.** Aplicação Node com SQLite, rotas de kits, unidade systemd, Caddy
fazendo proxy. Aqui os kits passam a ser compartilhados. Escrita ainda sem login — protegida
provisoriamente por token no cabeçalho, que só você tem.

**Fase 4 — Autenticação.** A parte cara. Escolher o método, implementar, testar o fluxo de
quem perdeu acesso, tratar sessão e expiração.

**Fase 5 — Backup, monitoramento e rotina.** O que faz o sistema sobreviver ao primeiro ano.

---

## 7. O híbrido que talvez seja a melhor ideia

Você **não precisa escolher**. O Cloudflare Access funciona na frente de um servidor
próprio, através do Cloudflare Tunnel: o `cloudflared` roda no VPS e abre uma conexão de
saída para a Cloudflare, que passa a ser a porta de entrada do site.

Isso combina os dois lados:

- Flexibilidade total do VPS: Node, SQLite, cron, lote de PDFs, arquivos, o que quiser.
- Autenticação pronta, sem escrever a fase 4.
- O VPS **não precisa de porta aberta nem de IP público exposto** — o túnel é de dentro
  para fora, o que elimina boa parte da superfície de ataque.
- TLS e proteção contra abuso ficam com a Cloudflare.

O custo é continuar dependendo da Cloudflare para a autenticação e para a entrada do
tráfego. Mas é uma dependência bem menor do que hospedar tudo lá, e reversível: se um dia
quiser sair, abre a porta 443 no Caddy e implementa o login.

---

## 8. Comparação honesta

| | Cloudflare puro | VPS puro | VPS + Tunnel/Access |
|---|---|---|---|
| Custo mensal | zero | baixo, fixo | baixo, fixo |
| Trabalho para subir | horas | dias | um pouco mais que o VPS puro |
| Autenticação | pronta | você escreve | pronta |
| Manutenção contínua | quase nenhuma | sistema, TLS, backup, plantão | igual ao VPS puro, menos TLS e exposição |
| Processo demorado, cron, arquivos | limitado | livre | livre |
| Dado de paciente no futuro | inviável | possível, com aval institucional | possível |
| Você é o plantão | não | sim | sim |

---

## 9. Minha leitura

A flexibilidade que você busca é real e o VPS entrega. Mas note que **nenhuma das
funcionalidades que você escolheu destravar — kits compartilhados e login — precisa dela.**
As duas cabem inteiras no plano gratuito da Cloudflare, com menos trabalho e sem plantão.

O VPS se justifica quando aparecer a primeira coisa que o Worker não faz. Enquanto isso,
ele cobra em tempo de manutenção e em uma noite de sono por ano.

Se você quer o VPS de qualquer forma — e há motivos legítimos, incluindo aprender a
administrar o ambiente e ter para onde crescer —, eu iria de **VPS com Cloudflare Tunnel**.
Você fica com a máquina e a liberdade, e não gasta os dias da fase 4 reimplementando
autenticação, que é trabalho sem graça e fácil de fazer mal.
