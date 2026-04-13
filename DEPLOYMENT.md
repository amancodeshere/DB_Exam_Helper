# Deployment Plan

This project is a static site. The fastest production path inside one hour is:

1. Push the repo to GitHub.
2. Deploy it on a static host.
3. Smoke-test the SQL runtime and mock-paper flow.
4. Attach a custom domain if needed.

## Recommended host

Vercel is the best first choice for this project because:

- static hosting is enough for the whole app
- the free tier is enough for an initial launch
- setup is fast
- HTTPS is automatic
- the repo now includes a `vercel.json` file so there is no ambiguity about configuration

Netlify and Cloudflare Pages remain fine fallback options.

Official references:

- Vercel deployments: https://vercel.com/docs/deployments
- Netlify deploy management: https://docs.netlify.com/site-deploys/manage-deploys/
- Cloudflare Pages Git integration: https://developers.cloudflare.com/pages/get-started/git-integration/

## 60-minute runbook

### Minutes 0-10: local smoke test

Run:

```bash
python3 -m http.server 8000
```

Then verify:

1. The homepage loads.
2. The dark theme renders correctly.
3. The mock-paper generator works.
4. The timer starts, pauses, and resets.
5. The SQL lab shows engine-ready status.
6. `select code, title from Subjects order by code;` returns rows.
7. At least one `Views` exercise passes the execution check.

### Minutes 10-20: push to GitHub

Run:

```bash
git add .
git commit -m "Prepare database prep site for deployment"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### Minutes 20-35: create the production site

For Vercel:

- import the repository
- choose the **Other** framework preset if prompted
- leave the build command empty
- leave the output directory empty or set it to the repository root
- deploy

The included **vercel.json** is enough for this static project.

Fallback for Netlify:

- create a new site from Git or use manual deploy
- no build command
- publish directory: `.`

Fallback for Cloudflare Pages:

- create a new Pages project
- import the GitHub repository
- leave the build command empty
- set the output directory to the repository root
- deploy

## Runtime dependency

The browser SQL engine is loaded from jsDelivr:

- https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js
- the matching wasm file from the same CDN path

That is acceptable for a launch inside one hour. If you want to remove the external dependency later, vendor those assets into the repo and update the loader path in app.js.

## Minutes 35-45: production verification

After deploy, verify:

1. The site loads over HTTPS.
2. The SQL lab reaches ready state.
3. Running SQL returns a result table.
4. Execution-backed Views exercises work.
5. Local progress persists across refresh.
6. The mock-paper generator still balances topics correctly.

## Minutes 45-60: domain and hardening

If you already own a domain:

- connect it to the hosting provider
- confirm certificate issuance
- re-test the SQL lab after DNS resolves

If you do not:

- launch on the provider subdomain first
- add the custom domain after the first stable deploy

## Known constraints

- Browser SQLite is not PostgreSQL.
- Real execution is therefore limited to exercises that can run cleanly in-browser, primarily view and query-style tasks.
- PostgreSQL stored functions and PLpgSQL still use structural checking.

## Launch recommendation

For a deployment inside the next hour:

- use Vercel
- keep the current static architecture
- accept the CDN-hosted SQL runtime for the first launch
- schedule a follow-up pass to vendor sql.js locally if you want stricter control
