# AZ-104 Exam Practice — GitHub Pages Edition

Static AZ-104 practice website generated from the supplied exam-question PDF.

## Included

- 606 questions preserved in source order
- Practice mode with immediate answer checking
- Randomized timed mock exams
- Wrong-answer and bookmark review
- Topic filters and search
- HOTSPOT / DRAG DROP / exhibit images
- Browser `localStorage` progress tracking
- ExamTopics discussion links where present in the source
- Relative asset paths so the site works from a GitHub Pages project URL such as `https://USERNAME.github.io/REPOSITORY/`
- `.nojekyll` included for GitHub Pages

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `az104-practice`.
2. Upload **the contents of this folder to the repository root**. Do not upload the enclosing folder itself.
3. Commit the files to the `main` branch.
4. Open the repository on GitHub and go to **Settings → Pages**.
5. Under **Build and deployment** choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
6. Click **Save**.
7. After GitHub finishes publishing, open:

   `https://YOUR-USERNAME.github.io/az104-practice/`

If your repository has a different name, replace `az104-practice` in the URL with that repository name.

## Important

Progress is stored in the browser using `localStorage`. It is therefore specific to the browser/device and GitHub Pages URL being used.

The source answers are preserved as written in the PDF. They have not been silently corrected. Some visual-format questions are self-review questions because the PDF provides a screenshot/answer area rather than machine-readable controls.

## Test locally

You can double-click `index.html`, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
