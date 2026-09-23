# Onde Vamos 🍽️

App para grupos de amigos decidirem onde ir comer (swipe estilo Tinder) e dividirem a conta no fim.

## Stack

- Expo (React Native + TypeScript)
- Supabase (Auth, Postgres, Realtime)
- React Navigation
- Zustand
- Google Places API (Nearby Search + Place Details)

## 1. Configurar o Supabase

1. Cria um projeto em [supabase.com](https://supabase.com).
2. Vai a **SQL Editor** e corre o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Isto cria todas as tabelas, RLS e o trigger que deteta matches automaticamente.
3. Em **Project Settings > API**, copia o `Project URL` e a `anon public key`.
4. (Opcional mas recomendado) Em **Authentication > Providers > Email**, desativa
   "Confirm email" durante o desenvolvimento para não teres de confirmar contas de teste por email.

## 2. Configurar a Google Places API

1. No [Google Cloud Console](https://console.cloud.google.com/), cria/seleciona um projeto.
2. Ativa a **Places API**.
3. Cria uma API key em **APIs & Services > Credentials**.
4. (Recomendado) restringe a key por "Application restrictions" e por API (Places API).

## 3. Configurar o projeto localmente

```bash
npm install
cp .env.example .env   # depois edita o .env com os teus valores reais
```

O `.env` precisa de:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...
```

## 4. Correr a app

```bash
npx expo start
```

Abre a app **Expo Go** no telemóvel (iOS ou Android) e faz scan do QR code que aparece no terminal.
O telemóvel e o computador precisam de estar na mesma rede Wi-Fi.

## 5. Testar o fluxo completo

Para testar o swipe em grupo precisas de **duas contas** (podem ser dois emails diferentes, ex.
`teste1@exemplo.com` e `teste2@exemplo.com` — não precisam de ser reais se desativaste a
confirmação de email). O ideal é abrir a app em dois telemóveis (ou um telemóvel + Expo Go na web/
um segundo dispositivo) com sessões diferentes.

1. **Conta A**: cria conta → cria um grupo (ex: "Teste") → recebe um código de convite.
2. **Conta B**: cria conta → "Entrar com código" → insere o código da Conta A.
3. **Conta A**: dentro do grupo, toca em "Onde Vamos?" → escolhe Lisboa ou Porto, um raio (ex.
   2 km), deixa filtros em branco para maximizar resultados → confirma que ambos os membros estão
   selecionados → "Começar a fazer swipe".
4. **Ambas as contas** entram automaticamente nessa sessão (Conta B: abre o grupo → sessão aparece
   em "Sessões anteriores" com estado "Em curso" → toca para entrar no swipe).
5. Passa cartões para a direita (gosto) ou esquerda (não gosto) em ambos os telemóveis. Assim que
   **os dois** derem "gosto" ao mesmo restaurante, ambos os ecrãs saltam automaticamente para o
   ecrã de Match — isto é o Supabase Realtime + o trigger SQL a funcionar.
6. Testa "Abrir direções" (abre Google/Apple Maps).
7. No ecrã de match, toca "Registar despesa deste jantar" → preenche valor total, confirma quem
   pagou e quem participa → guarda.
8. Volta ao grupo → "Saldos" mostra quem deve a quem (já simplificado) → "Despesas" mostra o
   histórico.
9. Para testar o cenário sem match: cria outra sessão e faz os dois membros darem sempre "não
   gosto" a todos os cartões — o ecrã de "Sem match" aparece com a opção de alargar o raio.

### Testar sem um segundo telemóvel

Podes testar sozinho criando uma sessão só contigo como participante (desmarca os outros membros
no ecrã de criação de sessão) — como és o único participante, o teu primeiro "gosto" já dá match
imediatamente. Útil para testar rapidamente o ecrã de resultado e a divisão de despesas.

## Simplificações assumidas no MVP

- A Google Places (Nearby Search) só suporta um intervalo contínuo de preço; se selecionares
  preços não-contíguos (ex. € e €€€ sem €€), a app pede o intervalo completo à API e depois
  filtra localmente para mostrar só os níveis pedidos.
- "Vegetariano/vegan friendly" é tratado como uma categoria de pesquisa (palavra-chave), já que a
  Nearby Search não devolve esse campo diretamente — só o Place Details o devolve, e só é
  consultado para o restaurante que ganhou o match (para não multiplicar pedidos pagos à API).
- O caso de "esgotar os cartões sem match" é por participante: quando o teu baralho acaba, vês a
  sugestão de alargar o raio; isso adiciona mais restaurantes à sessão para todos, sem reiniciar
  os swipes já feitos.
- Divisão de despesas é sempre igual entre os participantes selecionados (o schema já guarda
  `share_amount` por pessoa, pronto para no futuro suportar valores desiguais sem migração).
