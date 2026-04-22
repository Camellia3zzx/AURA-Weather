/**
 * Service for fetching weather data from Open-Meteo.
 * No API key required for basic usage.
 */

export interface WeatherData {
  current: {
    temp: number;
    weatherCode: number;
    isDay: boolean;
    windSpeed: number;
    humidity: number;
    apparentTemp: number;
    uvIndex: number;
    aqi: number;
  };
  hourly: {
    time: string[];
    temp: number[];
    weatherCode: number[];
  };
  daily: {
    time: string[];
    tempMax: number[];
    tempMin: number[];
    weatherCode: number[];
    uvIndexMax: number[];
  };
  locationName: string;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto&forecast_days=7`;
  
  // AQI is a separate endpoint in Open-Meteo
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi&timezone=auto`;

  const [weatherRes, aqiRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(aqiUrl)
  ]);

  if (!weatherRes.ok || !aqiRes.ok) throw new Error('Failed to fetch weather data');

  const weatherData = await weatherRes.json();
  const aqiData = await aqiRes.json();

  // Reverse geocoding for location name if possible, simplified here
  const locationName = await fetchLocationName(lat, lon);

  return {
    current: {
      temp: weatherData.current.temperature_2m,
      weatherCode: weatherData.current.weather_code,
      isDay: !!weatherData.current.is_day,
      windSpeed: weatherData.current.wind_speed_10m,
      humidity: weatherData.current.relative_humidity_2m,
      apparentTemp: weatherData.current.apparent_temperature,
      uvIndex: weatherData.daily.uv_index_max[0],
      aqi: aqiData.current.us_aqi,
    },
    hourly: {
      time: weatherData.hourly.time.slice(0, 24),
      temp: weatherData.hourly.temperature_2m.slice(0, 24),
      weatherCode: weatherData.hourly.weather_code.slice(0, 24),
    },
    daily: {
      time: weatherData.daily.time,
      tempMax: weatherData.daily.temperature_2m_max,
      tempMin: weatherData.daily.temperature_2m_min,
      weatherCode: weatherData.daily.weather_code,
      uvIndexMax: weatherData.daily.uv_index_max,
    },
    locationName
  };
}

async function fetchLocationName(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
    const data = await res.json();
    return data.address.city || data.address.town || data.address.village || data.address.state || 'Unknown Location';
  } catch {
    return 'Current Location';
  }
}

export async function searchLocation(query: string, lang: string = 'en') {
  // Use OpenStreetMap Nominatim for highly detailed global search (villages, landmarks, addresses)
  const acceptLang = lang.startsWith('zh') ? (lang === 'zh-CN' ? 'zh-CN,zh' : 'zh-TW,zh') : 'en';
  
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&accept-language=${acceptLang}`
    );
    const data = await res.json();
    
    // Map Nominatim results to our internal format
    return data.map((item: any) => ({
      id: item.place_id,
      name: item.display_name.split(',')[0], // Primary name
      fullName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      // Construct a more readable subtitle from address details
      subtitle: [
        item.address.suburb,
        item.address.city || item.address.town || item.address.village,
        item.address.state,
        item.address.country
      ].filter(Boolean).slice(1).join(', ') // Skip the primary name in subtitle
    }));
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}
