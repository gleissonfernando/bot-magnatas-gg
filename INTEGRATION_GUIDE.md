# Guia de Integração Bot-Dashboard (Magnatas.gg)

Este guia explica como configurar a comunicação entre o seu Bot do Discord e o seu Dashboard (Frontend/Backend).

## 1. Fluxo de Comunicação
A comunicação funciona da seguinte forma:
1.  **Discord -> Backend**: O usuário clica no link de verificação gerado pelo comando `/painelverificar`.
2.  **Backend -> Discord**: O backend troca o código recebido pelo Discord por um token de acesso.
3.  **Backend -> Banco de Dados**: Os dados do usuário são salvos/atualizados no MongoDB.
4.  **Backend -> Frontend**: O backend gera um JWT e redireciona o usuário para o dashboard com o token.
5.  **Frontend -> Backend**: O dashboard usa o JWT para buscar dados protegidos do usuário na API.

## 2. Configurações Necessárias
Você deve configurar as seguintes variáveis de ambiente (no arquivo `.env` ou no painel do seu host):

### Discord (Developer Portal)
- `DISCORD_TOKEN`: Token do Bot.
- `DISCORD_CLIENT_ID`: ID da aplicação.
- `DISCORD_CLIENT_SECRET`: Secret da aplicação.
- `DISCORD_REDIRECT_URI`: Deve ser `http://seu-dominio.com/callback`.

### Backend & Dashboard
- `JWT_SECRET`: Uma senha forte para assinar os tokens de acesso.
- `MONGO_URI`: Sua URL de conexão com o MongoDB.
- `FRONTEND_URL`: A URL onde o seu dashboard estará hospedado (ex: `http://seu-dominio.com`).
- `VITE_API_URL`: A URL da API do backend (ex: `http://seu-dominio.com/api`).

## 3. Comandos Úteis
- `/painelverificar`: Use este comando no Discord para enviar o painel com o link de conexão.
- `npm run dev`: Inicia o bot e o backend em modo de desenvolvimento.

## 4. Observações de Segurança
- Nunca compartilhe seu `DISCORD_TOKEN` ou `JWT_SECRET`.
- Certifique-se de que o `REDIRECT_URI` no Discord Developer Portal seja exatamente igual ao configurado no seu código.
