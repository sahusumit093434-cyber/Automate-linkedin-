# JobFlow AI

JobFlow AI is a private, browser-based job discovery, qualification, and application-preparation workspace. It checks a permitted remote-job feed, scores vacancies against a verified candidate profile, prepares truthful draft materials, and tracks applications.

## Safety boundary

The app does not log in to LinkedIn, scrape LinkedIn, message recruiters, upload documents, or press a final Submit button. Those actions remain manual. LinkedIn prohibits unauthorized bots and browser automation, and its job APIs require approved partner access.

## Automated discovery

- Uses Remotive's public API with the required source attribution and link back.
- Runs at most once every six hours, matching the provider's recommended maximum of four requests per day.
- Adds only target-role listings that explicitly allow candidates in India, Asia/APAC, or worldwide.
- Rejects duplicate URLs and experienced/senior vacancies.
- Leaves unknown or non-INR compensation in review instead of guessing an exchange rate.
- Never republishes or submits a Remotive listing to another job board.

## Current qualification rules

- Remote-only roles when that profile preference is enabled.
- Guaranteed lower salary bound must meet the configured minimum.
- Unknown salary is held for review rather than recommended automatically.
- Experienced and senior roles are blocked for the fresher profile.
- Target-role and verified-skill evidence contribute to the match score.
- Duplicate URL or company/role combinations are rejected.
- Blocked vacancies cannot be approved until their qualification issue is resolved.

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
