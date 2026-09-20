# GitHub Pages deployment

## Fastest method

1. Create a repository named `az104-practice` on GitHub.
2. Add every file and folder in this package to the root of the repository.
3. Push/commit to `main`.
4. Go to **Settings → Pages**.
5. Set **Source** to `Deploy from a branch`.
6. Select `main` and `/ (root)`.
7. Save and wait for the deployment to complete.

Your site will normally be available at:

`https://YOUR-USERNAME.github.io/az104-practice/`

## Expected repository layout

```text
az104-practice/
├── .nojekyll
├── index.html
├── app.js
├── data.js
├── explanations.js
├── styles.css
├── data-summary.json
├── assets/
│   └── ...question images...
├── README.md
└── DEPLOY_TO_GITHUB_PAGES.md
```

All application asset references are relative, so hosting under `/az104-practice/` works without changing the code.
