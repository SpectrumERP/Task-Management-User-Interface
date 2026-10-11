# CRM sign-in and environment configuration

Task Management sends sign-in and session-expiry redirects to the CRM. It uses the current host by
default, so same-origin deployments such as `https://crm.example.com/task/` work without a host-specific
URL in the code.

For each Vite mode, configure public URLs in `.env.<mode>` (or inject them in the build pipeline):

```dotenv
# Example for a separately hosted UAT remote
VITE_CRM_LOGIN_URL=https://crm-uat.example.com/login
VITE_TASK_PUBLIC_URL=https://tasks-uat.example.com/
VITE_CRM_COOKIE_DOMAIN=.example.com
```

- `VITE_CRM_LOGIN_URL`: CRM login page. Omit it for same-origin hosting.
- `VITE_TASK_PUBLIC_URL`: Task app's public base URL, used for the CRM's post-login `next` return.
  Omit it when Task is under the CRM origin.
- `VITE_CRM_COOKIE_DOMAIN`: must match CRM `VITE_COOKIE_DOMAIN` if both apps are sibling subdomains
  and share the CRM auth cookie. Do not set it when they are on different sites.

Use `npm run build -- --mode <mode>` for a standalone Task build. The CRM monorepo's
`npm run build:all -- --mode <mode>` passes that mode and these public settings to its Task remote build.

Cookie sharing only works on the same origin or a shared parent domain. Across different registrable
domains, the CRM and Task need an API-backed session or explicit shell `postMessage` integration. The
browser does not share cookies or `BroadcastChannel` messages across those origins.
