import { useEffect, useState } from 'react';
import MiniCard from './MiniCard';
import Icon from '../Icons';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

function describeWeather(code) {
  if (code === 0) return ['Clear sky', 'sun'];
  if (code <= 2) return ['Partly cloudy', 'partly'];
  if (code === 3) return ['Overcast', 'cloud'];
  if (code <= 48) return ['Fog', 'fog'];
  if (code <= 57) return ['Drizzle', 'rain'];
  if (code <= 67) return ['Rain', 'rain'];
  if (code <= 77) return ['Snow', 'snow'];
  if (code <= 82) return ['Showers', 'rain'];
  if (code <= 86) return ['Snow showers', 'snow'];
  return ['Thunderstorm', 'storm'];
}

function WeatherGlyph({ kind }) {
  return (
    <svg className={`weather__glyph weather__glyph--${kind}`} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {kind === 'sun' && (
        <>
          <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="2.5" />
          <path d="M24 4v5m0 30v5M4 24h5m30 0h5M9.9 9.9l3.5 3.5m21.2 21.2 3.5 3.5m0-28.2-3.5 3.5M13.4 34.6l-3.5 3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {kind === 'partly' && (
        <>
          <circle cx="30" cy="16" r="7" stroke="currentColor" strokeWidth="2.5" />
          <path d="M30 3v4m0 18v4m-13-13h4m18 0h4m-22.2-9.2 2.8 2.8m12.8 12.8 2.8 2.8m0-18.4-2.8 2.8m-12.8 12.8-2.8 2.8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M12 39h22a8 8 0 000-16 11 11 0 00-20.9-3A9.6 9.6 0 0012 39z" fill="var(--bg-base, #0b0d10)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )}
      {['cloud', 'fog'].includes(kind) && (
        <>
          <path d="M10 31h26a8 8 0 000-16 11 11 0 00-20.9-3A9.6 9.6 0 0010 31z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          {kind === 'fog' && <path d="M8 38h30M13 43h21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
        </>
      )}
      {['rain', 'storm'].includes(kind) && (
        <>
          <path d="M10 26h26a8 8 0 000-16 11 11 0 00-20.9-3A9.6 9.6 0 0010 26z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          {kind === 'storm' ? (
            <path d="m27 29-7 10h6l-2 7 8-11h-6l2-6z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
          ) : (
            <path d="m17 32-2 5m12-5-2 5m12-5-2 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          )}
        </>
      )}
      {kind === 'snow' && (
        <>
          <path d="M10 26h26a8 8 0 000-16 11 11 0 00-20.9-3A9.6 9.6 0 0010 26z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M16 34h.01M25 39h.01M34 33h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function formatTemp(value, fahrenheit = false) {
  return `${Math.round(fahrenheit ? (value * 9) / 5 + 32 : value)}°`;
}

function formatTime(value) {
  const time = value?.split('T')[1]?.slice(0, 5);
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':');
  return `${Number(hours)}:${minutes}`;
}

export default function WeatherWidget({ config, onConfigChange, editMode, onRemove }) {
  const location = config.location;
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(Boolean(location));
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [editing, setEditing] = useState(!location);
  const fahrenheit = config.temperatureUnit === 'fahrenheit';

  useEffect(() => {
    if (latitude == null || longitude == null) return undefined;
    const controller = new AbortController();
    fetch(`${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=5`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Weather service is unavailable.');
        return response.json();
      })
      .then((data) => {
        setForecast(data);
        setError('');
      })
      .catch((fetchError) => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message || 'Could not load weather.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [latitude, longitude]);

  const chooseCity = async (event) => {
    event.preventDefault();
    const query = city.trim();
    if (!query) return;
    setLoading(true);
    setError('');
    let locationSelected = false;
    try {
      const response = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!response.ok) throw new Error('Location search is unavailable.');
      const result = (await response.json()).results?.[0];
      if (!result) throw new Error('No matching city found.');
      onConfigChange({ ...config, location: { name: [result.name, result.admin1, result.country].filter(Boolean).slice(0, 2).join(', '), latitude: result.latitude, longitude: result.longitude } });
      locationSelected = true;
      setEditing(false);
      setCity('');
    } catch (searchError) {
      setError(searchError.message || 'Could not find that location.');
    } finally {
      if (!locationSelected) setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Location access is not available in this browser.');
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onConfigChange({ ...config, location: { name: 'Current location', latitude: coords.latitude, longitude: coords.longitude } });
        setEditing(false);
      },
      (geoError) => {
        setError(geoError.code === geoError.PERMISSION_DENIED ? 'Allow location access or search for a city.' : 'Could not determine your location.');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const current = forecast?.current;
  const today = forecast?.daily;
  const [condition, glyph] = current ? describeWeather(current.weather_code) : ['', ''];
  const toggleTemperatureUnit = () => onConfigChange({ ...config, temperatureUnit: fahrenheit ? 'celsius' : 'fahrenheit' });

  return (
    <MiniCard label="Weather" editMode={editMode} onRemove={onRemove}>
      <div className="weather">
        <div className="weather__place">
          <span className="weather__place-name">{location?.name || 'Choose a location'}</span>
          {location && (
            <button type="button" className="weather__icon-button" onClick={() => setEditing((value) => !value)} title="Change location" aria-label="Change weather location">
              <Icon name="edit" size={14} />
            </button>
          )}
        </div>
        {editing && (
          <>
            <form className="weather__form" onSubmit={chooseCity}>
              <input className="input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Search city" aria-label="Search city" />
              <button type="submit" className="btn btn--primary" disabled={loading || !city.trim()}>Search</button>
            </form>
            <div className="weather__actions">
              <button type="button" className="weather__link" onClick={useCurrentLocation} disabled={loading}>Use my location</button>
            </div>
          </>
        )}
        {error && <p className="weather__message" role="status">{error}</p>}
        {!forecast && !error && <p className="weather__message">{loading ? 'Loading weather…' : 'Search for a city or use your location.'}</p>}
        {forecast && current && (
          <>
            <div className="weather__current">
              <WeatherGlyph kind={glyph} />
              <div>
                <button
                  type="button"
                  className="weather__temperature"
                  onClick={toggleTemperatureUnit}
                  title={`Switch to ${fahrenheit ? 'Celsius' : 'Fahrenheit'}`}
                  aria-label={`Current temperature ${formatTemp(current.temperature_2m, fahrenheit)}${fahrenheit ? 'F' : 'C'}. Switch to ${fahrenheit ? 'Celsius' : 'Fahrenheit'}`}
                >
                  {formatTemp(current.temperature_2m, fahrenheit)}{fahrenheit ? 'F' : 'C'}
                </button>
                <div className="weather__condition">{condition}</div>
              </div>
            </div>
            <div className="weather__details">
              <span>Feels {formatTemp(current.apparent_temperature, fahrenheit)}</span>
              <span>Humidity {current.relative_humidity_2m}%</span>
              <span>Wind {Math.round(current.wind_speed_10m)} km/h</span>
            </div>
            <div className="weather__today-details">
              <span>Rain {today.precipitation_probability_max[0]}%</span>
              <span>UV max {today.uv_index_max[0]}</span>
              <span>Sunrise {formatTime(today.sunrise[0])}</span>
              <span>Sunset {formatTime(today.sunset[0])}</span>
            </div>
            <div className="weather__forecast">
              {forecast.daily.time.map((day, index) => {
                const [, dayGlyph] = describeWeather(forecast.daily.weather_code[index]);
                const dayName = index === 0 ? 'Today' : new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: 'short' });
                return (
                  <div className="weather__day" key={day}>
                    <span>{dayName}</span>
                    <WeatherGlyph kind={dayGlyph} />
                    <span className="weather__day-temps">{formatTemp(forecast.daily.temperature_2m_max[index], fahrenheit)} {formatTemp(forecast.daily.temperature_2m_min[index], fahrenheit)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </MiniCard>
  );
}