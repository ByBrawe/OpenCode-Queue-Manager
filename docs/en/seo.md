# Search visibility / SEO checklist

Google indexing and search ranking cannot be guaranteed by repository code alone. This repository includes useful descriptive metadata, a readable bilingual README, npm keywords, and an optional static landing page with canonical URL and structured data.

## Enable an indexable landing page

1. GitHub repository → **Settings → Pages**.
2. Select **Deploy from a branch** → `main` → `/docs` → **Save** (after this branch is merged).
3. Confirm the page loads at `https://bybrawe.github.io/OpenCode-Queue-Manager/`. GitHub Pages can take time to publish.
4. In [Google Search Console](https://search.google.com/search-console/about), verify this specific URL/property and submit `https://bybrawe.github.io/OpenCode-Queue-Manager/sitemap.xml`.
5. Request indexing for the landing page and keep content current as the project evolves.
6. In **GitHub → About**, set a factual summary and the Pages website URL, and add relevant topics (suggested: `opencode`, `opencode-plugin`, `queue-manager`, `ai-coding`, `tui`, `desktop`, `typescript`, `npm`).
7. Keep npm description and README accurate. Do not claim broad platform support, adoption, reviews, or verified GUI compatibility without evidence.

The site lives in `docs/index.html` and `docs/sitemap.xml`. GitHub Pages and Google Search Console must be enabled by a repository owner. No private analytics, tracking scripts, or user credential collection are included.
