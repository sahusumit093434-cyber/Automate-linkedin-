# JobFlow AI

JobFlow AI is a private, browser-based job qualification and application-preparation workspace. It scores pasted vacancies against a verified candidate profile, prepares truthful draft materials, and tracks applications.

## Safety boundary

The app does not log in to LinkedIn, scrape LinkedIn, message recruiters, upload documents, or press a final Submit button. Those actions remain manual. Job discovery should use authorized APIs, employer career feeds, email alerts, or job-board exports if a backend is added later.

## Current qualification rules

- Remote-only roles when that profile preference is enabled.
- Guaranteed lower salary bound must meet the configured minimum.
- Unknown salary is held for review rather than recommended automatically.
- Experienced and senior roles are blocked for the fresher profile.
- Target-role and verified-skill evidence contribute to the match score.
- Duplicate URL or company/role combinations are rejected.

## Local use

Open `dist/index.html` in a modern browser. Data is stored only in that browser's local storage. Use Export data regularly because clearing browser storage removes the pipeline.

## Verification

```powershell
npm test
npm run check
```

The test suite uses only Node.js built-ins; no dependency installation is required.

## Security

- Imported JSON is schema-normalized and all job analyses are recomputed.
- Only HTTP and HTTPS URLs are accepted.
- Imported statuses and enumerated fields are allowlisted.
- Rendered user-controlled text is HTML-escaped.
- Candidate contact details are not embedded in JavaScript defaults.

The bundled resume contains personal contact information. Keep the deployment private or remove the resume before publishing the static directory.
