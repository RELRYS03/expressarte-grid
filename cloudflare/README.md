# Publicação gratuita na Cloudflare

Este diretório prepara o Expressarte Grid para Cloudflare Workers (API e arquivos públicos), D1 (contas e sessões) e Workers AI (conversa gratuita até a cota do plano). O código do site continua em `public/`. A versão Python em `serve.py` continua disponível para estudo e testes locais.

## Estado

`wrangler deploy --dry-run` e `wrangler dev --local` foram executados com sucesso. A versão local foi testada com cadastro de visitante, login, acesso reservado de administrador, conversa e preenchimento da capinha. **A conta Cloudflare ainda não está autenticada neste ambiente e o D1 remoto ainda não foi criado.** O UUID em `wrangler.toml` é apenas um marcador para testes locais.

## Configuração na conta do proprietário

1. Entre na conta Cloudflare e autorize o Wrangler (`npx wrangler login`). Nunca envie token de API ou senha no chat.
2. Na raiz do projeto, execute `npx wrangler d1 create expressarte-grid`. Substitua o `database_id` em `wrangler.toml` pelo UUID retornado.
3. Execute `npx wrangler d1 execute expressarte-grid --remote --file=cloudflare/schema.sql` para criar as tabelas.
4. Gere duas senhas diferentes, cada uma com ao menos 12 caracteres, rodando `python cloudflare/hash-password.py` duas vezes. Salve cada hash como segredo com `npx wrangler secret put ADMIN_HASH_RELRYSALVES` e `npx wrangler secret put ADMIN_HASH_RELRYS17`. A senha digitada não aparece no terminal. Não coloque senhas nem hashes em arquivos versionados.
5. Execute `npx wrangler deploy` e verifique o endereço `*.workers.dev` retornado. Antes de convidar visitantes, teste login das duas contas, cadastro comum, robô, capinha e saída.

O código não inclui checkout, cobrança ou planos. O Workers AI gratuito tem limite diário; quando não estiver disponível, a conversa retorna orientação local de medidas. A pessoa também pode informar a própria chave de OpenAI ou Anthropic para uma solicitação; esses provedores podem cobrar o titular da chave fora do Expressarte. Uma chave do proprietário pode ser configurada como segredo `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`, acessível somente a administradores. A chave do usuário não é armazenada.

O cadastro comum ainda não confirma a posse do e-mail. Os dois e-mails de administrador são reservados e só entram com seus hashes configurados como segredo. O login tem limite de tentativas e o cadastro tem limite por IP. Antes de divulgação ampla, configure verificação de e-mail ou outro método para recuperação de conta. O banco D1 deve ter uma política de backup.
