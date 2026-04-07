import { WeatherData } from "../types";

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const weatherCodeMap: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
  };

  return {
    temp: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    condition: weatherCodeMap[data.current.weather_code] || 'Unknown',
    humidity: data.current.relative_humidity_2m,
    wind: data.current.wind_speed_10m,
    location: 'Current Location'
  };
}

export async function fetchHourlyForecast(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`;
  const response = await fetch(url);
  const data = await response.json();
  
  const hourly = data.hourly.time.slice(0, 12).map((time: string, index: number) => ({
    time: new Date(time).getHours() + ':00',
    temp: data.hourly.temperature_2m[index],
    code: data.hourly.weather_code[index]
  }));
  
  return hourly;
}
