import { Fragment, useEffect, useState } from 'react';
import Logo from './Logo';
import Dock from './Dock';

function greetingFor(date) {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function itemText(item, { now, username, summary }) {
  switch (item.type) {
    case 'greeting':
      return greetingFor(now);
    case 'username':
      return username || 'Admin';
    case 'date':
      return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    case 'time':
      return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    case 'deviceStatus':
      return summary;
    case 'custom':
      return item.text;
    default:
      return '';
  }
}

export default function HomeHeader({
  username,
  devices,
  content,
  onHeaderContentChange,
  editMode,
  onAutoArrange,
  onDoneEditing,
  navigation,
}) {
  const [now, setNow] = useState(() => new Date());
  const [weatherResult, setWeatherResult] = useState({ location: '', temperature: null, condition: '', placeName: '' });
  const fahrenheit = content.fahrenheit === true;
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const online = devices.filter((d) => d.online).length;
  const total = devices.length;
  const state = total === 0 ? 'idle' : online === total ? 'ok' : online === 0 ? 'down' : 'warn';
  const summary = `${online}/${total} devices online`;

  useEffect(() => {
    const location = content.weatherLocation?.trim();
    if (!location) return undefined;
    const controller = new AbortController();
    const loadWeather = async () => {
      try {
        const search = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`, { signal: controller.signal });
        if (!search.ok) throw new Error('Weather unavailable');
        const place = (await search.json()).results?.[0];
        if (!place) throw new Error('Weather unavailable');
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`, { signal: controller.signal });
        if (!response.ok) throw new Error('Weather unavailable');
        const current = (await response.json()).current;
        const condition = current.weather_code === 0 ? 'Clear' : current.weather_code <= 3 ? 'Cloudy' : current.weather_code <= 67 ? 'Rain' : current.weather_code <= 86 ? 'Snow' : 'Storm';
        setWeatherResult({ location, temperature: current.temperature_2m, condition, placeName: place.name });
      } catch (error) {
        if (error.name !== 'AbortError') setWeatherResult({ location, temperature: null, condition: 'Weather unavailable', placeName: '' });
      }
    };
    loadWeather();
    return () => controller.abort();
  }, [content.weatherLocation]);

  const weather = weatherResult.location === content.weatherLocation?.trim() ? weatherResult : null;
  const values = { now, username, summary };
  const renderItems = (items) => items
    .map((item) => {
      if (item.type === 'weather') {
        if (!weather) return null;
        if (weather.temperature === null) return weather.condition;
        const temperature = fahrenheit
          ? Math.round((weather.temperature * 9) / 5 + 32)
          : Math.round(weather.temperature);
        return (
          <Fragment key="weather">
            <button
              type="button"
              className="home-header__temperature"
              onClick={() => onHeaderContentChange({ ...content, fahrenheit: !fahrenheit })}
              aria-label={`Switch to ${fahrenheit ? 'Celsius' : 'Fahrenheit'}`}
              title={`Switch to ${fahrenheit ? 'Celsius' : 'Fahrenheit'}`}
            >
              {temperature}°{fahrenheit ? 'F' : 'C'}
            </button>
            {` ${weather.condition} · ${weather.placeName}`}
          </Fragment>
        );
      }
      const value = itemText(item, values);
      return value?.trim() ? value : null;
    })
    .filter((value) => value !== null)
    .map((value, index) => <Fragment key={index}>{index > 0 && ' · '}{value}</Fragment>);

  return (
    <header className="home-header">
      <div className="home-bar">
        <a
          className="home-bar__brand"
          href="https://myrack.ct.ws"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit the MyRack website"
        >
          <Logo size={26} />
          <span>MyRack</span>
        </a>
        <div className="greeting">
          <h1 className="greeting__title">{renderItems(content.title)}</h1>
          {(content.subtitle || []).length > 0 && <p className="greeting__sub">{renderItems(content.subtitle)}</p>}
        </div>
        <div className={`status-pill status-pill--${state}`}>
          <span className="dot" aria-hidden="true" />
          {summary}
        </div>
        <Dock {...navigation} />
      </div>

      {editMode && (
        <div className="greeting greeting--editing">
          <div className="edit-banner">
            <span>Drag widgets to rearrange, pull a corner to resize.</span>
            <button type="button" className="btn btn--small" onClick={onAutoArrange}>
              Auto-arrange
            </button>
            <button type="button" className="btn btn--small btn--primary" onClick={onDoneEditing}>
              Done
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
