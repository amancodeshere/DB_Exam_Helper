# Database Final Prep Studio

Static exam-prep website for SQL, views, SQL functions, PLpgSQL, and Python + Psycopg practice.

## What is included

- 80 interactive exercises
- 20 exercises each for:
  - Views
  - SQL Functions
  - PLpgSQL
  - Python + Psycopg
- Multi-page learning flow with one dedicated page per topic
- Local draft and solved-state persistence via `localStorage`
- Timed mock paper generator with balanced or topic-focused random papers
- Browser-side SQL execution in a seeded practice lab

## Project structure

- `index.html` - app shell
- `views.html` - dedicated views practice page
- `sql-functions.html` - dedicated SQL functions practice page
- `plpgsql.html` - dedicated PLpgSQL practice page
- `python-psycopg.html` - dedicated Python + Psycopg practice page
- `styles.css` - styling
- `data.js` - exercise inventory and module metadata
- `seed.js` - seeded browser database for SQL execution
- `app.js` - rendering, progress tracking, timer, and mock-paper logic

## Local run

Because this is a plain static site, you can open `index.html` directly in a browser.

If you prefer serving it over HTTP:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

This project is ready for static hosting, and Vercel is the recommended option for this repo.

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- Surge

Deployment is just the static site files plus the documentation. There is no build step and no backend. The included `vercel.json` makes the project ready for a straightforward Vercel import.

## Notes

- The SQL lab and execution-backed view exercises run on a seeded in-browser SQLite database.
- PostgreSQL-specific function and PLpgSQL tasks still use structure checking because browser SQLite cannot execute PostgreSQL stored procedures or `CREATE FUNCTION`.
