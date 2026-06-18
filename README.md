# Dentist North York — Canada Weather & Local Time

This adds a small static UI to show current weather (from Open‑Meteo) and local time for Canadian places. It uses Open‑Meteo geocoding and timezone endpoints and runs fully client-side (no API keys required).

Files added on branch `feature/weather-time`:

- `index.html` — main page with city selector and controls
- `assets/css/style.css` — basic styles
- `assets/js/main.js` — JavaScript logic: geocoding, timezone, weather fetch, live clock

How it works
- When a user selects a city the site calls Open‑Meteo's geocoding API to get lat/lon (limited to Canada results).
- The site requests the timezone for those coordinates and starts a live clock using the IANA timezone via `Intl.DateTimeFormat`.
- Current weather is requested from Open‑Meteo `current_weather` and displayed with a small emoji icon.

Preview locally
- You can open `index.html` directly in the browser, but some browsers restrict fetch from file:// — recommended run a simple static server:

  - Python 3: `python -m http.server 8000` (then open http://localhost:8000)
  - Node: `npx serve .`

Deploy to Cloudflare Pages
1. Sign in to https://dash.cloudflare.com and go to Pages.
2. Create a new project and connect your GitHub account and select the `janeclair/dentist-north-york` repository.
3. For the Production branch you can use `main` or (for review) choose `feature/weather-time` to preview the new UI immediately.
4. Build settings: None required — this is a static site. Set "Build command" empty and "Build output directory" to `/` (root).
5. Save and deploy. Cloudflare will build and publish the site. After connecting, pushes to the selected branch will auto-deploy.

Notes & next steps
- If you prefer a search box with autocomplete (instead of the preset list) I can add a free autocomplete using the same geocoding API.
- If you want temperature in °F or other units I can add a toggle.

Testing & QA
- Try "Use my location" to allow geolocation in the browser and see the local weather & time for your coordinates.

If you want, I can open a PR from `feature/weather-time` into your main branch (I have created the branch and added the files). If you'd like that, say "Please open a PR" and I will create the pull request content here for you to create — I cannot open the PR automatically without additional permissions.
