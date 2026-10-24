# Jijiga Express Telegram Mini App integration

## Scope and current status

This integration reuses the existing React/Vite customer experience and Firebase order model. It does not create a second order database, write to production by itself, register a webhook, publish a Mini App, or deploy anything.

The Mini App validates raw \`Telegram.WebApp.initData\` on the server, then issues a Firebase custom token for a customer-only UID (\`telegram_<Telegram user id>\`). It does not mint email or staff role claims. Firestore authorization remains enforced by the existing rules, and the customer UI reuses existing order and cancellation functions.

## Commands

| Command | Behavior |
| --- | --- |
| \`/start\` | Welcome and open app |
| \`/order\` | Open customer ordering screen |
| \`/orders\` | Order history |
| \`/status\` | Live tracking; \`/status ORDER_ID\` targets that order if it belongs to the customer |
| \`/location\` | Profile & Address; location is shared only after an explicit tap and Telegram permission |
| \`/contact\` | Dispatcher contact card; optional dispatcher username must be configured |
| \`/help\` | List commands |
| \`/cancel\` | Order history; customer selects an eligible order and confirms cancellation inside the app |

Commands only open the Mini App. The webhook does not cancel orders from chat text alone.

## Required server environment variables

Set these in the **dedicated customer-facing Vercel project**, as server variables (never as \`VITE_*\`):

- \`TELEGRAM_BOT_TOKEN\`: replacement token issued by @BotFather after revoking the exposed token.
- \`TELEGRAM_WEBHOOK_SECRET\`: strong random 32+ character string using only \`A-Z a-z 0-9 _ -\`.
- \`TELEGRAM_MINI_APP_URL\`: public HTTPS app origin, such as \`https://your-public-app.example/\`, with no query, fragment, or path.
- \`FIREBASE_SERVICE_ACCOUNT_JSON\`: JSON service account from the same Firebase project used by the app. Its private key signs short-lived Firebase custom tokens; never put it in Vite variables, Git, logs, or Telegram messages.
- \`TELEGRAM_DISPATCHER_USERNAME\`: optional public Telegram username without leading \`@\`.

For the UI contact shortcut, optionally set \`VITE_TELEGRAM_DISPATCHER_USERNAME\` to the same public username. This value is not secret.

The service-account key is privileged. Use a dedicated account with only required permissions where supported. Never paste credentials into chat or commit them. If safe token signing cannot be configured, stop and use an approved server-side signing arrangement.

## Public hosting requirement

The Mini App and webhook must be reachable from Telegram on a public HTTPS origin. Vercel Preview SSO blocks Telegram's server and customers. Do not use the existing \`jijiga-express-ai-coding-agent\` project while Preview SSO is enabled. Create or select a dedicated customer-facing Vercel project connected to this repository with root directory \`.\`, and preserve the agent project's settings. Do not merge to \`main\`, change production data, or deploy without approval.

The existing Firebase Hosting configuration rewrites \`/api/*\` to the SPA and does not execute these Node API routes. Run the app and \`/api/telegram/*\` routes together on Vercel before activating the bot.

## Webhook and BotFather setup

1. Revoke the exposed bot token in @BotFather and configure the replacement token only in server environment settings.
2. Register the commands through \`/setcommands\`:

   \`\`\`text
   start - Start Jijiga Express
   order - Place a new order
   orders - My orders
   status - Check order status
   location - Update my location
   contact - Contact dispatcher
   help - Help
   cancel - Cancel current order
   \`\`\`

3. Configure the public Main Mini App or menu button in BotFather to use \`TELEGRAM_MINI_APP_URL\`.
4. Set webhook URL to \`https://YOUR_PUBLIC_ORIGIN/api/telegram/webhook\` using Bot API \`setWebhook\`, send the same \`TELEGRAM_WEBHOOK_SECRET\` as Telegram's \`secret_token\`, and include \`message\` in \`allowed_updates\`.
5. Test with a Telegram test account and a harmless command. Verify invalid/stale initData is rejected, the identity is customer-only, and orders/cancellations continue to obey Firestore rules.
6. Do not advertise ordering until public hosting, authentication, order creation/cancellation, dispatcher contact, and required environment variables are verified.

## Tests

Run \`npm run test:telegram\` for HMAC validation and token-signing tests. These do not contact Telegram, production Firebase, or Vercel.
