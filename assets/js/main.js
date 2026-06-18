// main.js — Open-Meteo based weather + timezone + local clock
// Preset Canadian cities by name. Geocoding will be performed for each selection.

const citySelect = document.getElementById('citySelect');
const locBtn = document.getElementById('locBtn');
const refreshBtn = document.getElementById('refreshBtn');
const placeEl = document.getElementById('place');
const timeEl = document.getElementById('time');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const extrasEl = document.getElementById('extras');
const iconEl = document.getElementById('icon');
const statusEl = document.getElementById('status');

let currentTimezone = null;
let clockTimer = null;
let lastCoords = null;

function setStatus(msg){
  statusEl.textContent = msg || '';
}

function weatherCodeToDesc(code){
  // simplified mapping from Open-Meteo weathercode
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return map[code] || 'Unknown';
}

function weatherCodeToIcon(code){
  // return a tiny emoji-based icon (keeps site fully static/no assets)
  if(code === 0) return '☀️';
  if(code <= 3) return '⛅';
  if(code >= 45 && code <= 48) return '🌫️';
  if((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️';
  if((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return '❄️';
  if(code >= 95) return '⛈️';
  return '🌤️';
}

async function geocodePlace(name){
  setStatus('Looking up location...');
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&country=CA`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if(!data.results || data.results.length === 0) throw new Error('Location not found');
  const r = data.results[0];
  return {lat: r.latitude, lon: r.longitude, name: r.name + (r.admin1 ? ', ' + r.admin1 : '')};
}

async function getTimezone(lat, lon){
  setStatus('Determining timezone...');
  const url = `https://api.open-meteo.com/v1/timezone?latitude=${lat}&longitude=${lon}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Timezone request failed');
  const data = await res.json();
  return data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

async function getWeather(lat, lon){
  setStatus('Fetching weather...');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&temperature_unit=celsius&windspeed_unit=kmh`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather request failed');
  const data = await res.json();
  return data;
}

function startClock(timezone){
  currentTimezone = timezone;
  if(clockTimer) clearInterval(clockTimer);
  function tick(){
    try{
      const now = new Date();
      const fmt = new Intl.DateTimeFormat([], {hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:timezone});
      timeEl.textContent = fmt.format(now);
    }catch(e){
      // Fallback: local time
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString();
    }
  }
  tick();
  clockTimer = setInterval(tick,1000);
}

async function showForCoords(lat, lon, displayName){
  try{
    setStatus('Preparing data...');
    placeEl.textContent = displayName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    lastCoords = {lat, lon};

    const tz = await getTimezone(lat, lon);
    startClock(tz);

    const weatherData = await getWeather(lat, lon);
    const cw = weatherData.current_weather;
    if(!cw) throw new Error('No current weather available');

    tempEl.textContent = `${cw.temperature.toFixed(1)} °C`;
    descEl.textContent = weatherCodeToDesc(cw.weathercode);
    const icon = weatherCodeToIcon(cw.weathercode);
    iconEl.src = '';
    iconEl.alt = descEl.textContent;
    iconEl.style.fontSize = '32px';
    // We don't have an image asset; use emoji rendered into a small data URI SVG so it shows nicely
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='44'>${icon}</text></svg>`;
    const uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    iconEl.src = uri;

    // Extras: wind speed and approximate humidity if available
    const wind = cw.windspeed != null ? `${cw.windspeed} km/h` : '—';
    let humidity = '—';
    // The hourly humidity array may not align with current hour in some cases; try a simple fallback to hourly if provided
    if(weatherData.hourly && weatherData.hourly.relativehumidity_2m && weatherData.hourly.time){
      // find the index close to current time in UTC
      const now = new Date();
      const utcIso = now.toISOString().slice(0,19);
      // best effort: look for nearest timestamp
      const times = weatherData.hourly.time;
      let idx = times.indexOf(utcIso);
      if(idx === -1) idx = 0;
      humidity = weatherData.hourly.relativehumidity_2m[idx] != null ? `${weatherData.hourly.relativehumidity_2m[idx]}%` : '—';
    }

    extrasEl.textContent = `Wind: ${wind} | Humidity: ${humidity}`;
    setStatus('');
  }catch(err){
    console.error(err);
    setStatus(err.message || String(err));
  }
}

async function handleSelection(){
  const name = citySelect.value;
  try{
    const g = await geocodePlace(name);
    await showForCoords(g.lat, g.lon, g.name);
  }catch(err){
    setStatus('Error: ' + (err.message || err));
  }
}

citySelect.addEventListener('change', handleSelection);
refreshBtn.addEventListener('click', ()=>{
  if(lastCoords) showForCoords(lastCoords.lat, lastCoords.lon, placeEl.textContent);
  else handleSelection();
});

locBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ setStatus('Geolocation not available in your browser'); return; }
  setStatus('Getting your location...');
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    await showForCoords(lat, lon, 'Your location');
  }, (err)=>{
    setStatus('Permission denied or unavailable');
  }, {timeout:10000});
});

// Initial load: show selected city
handleSelection();
