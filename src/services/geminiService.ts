import { GoogleGenAI } from "@google/genai";
import { WeatherData } from "./weatherService";
import { Language, translations } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getAIWeatherAdvice(data: WeatherData, lang: Language = 'en'): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return 'Please set your Gemini API key to get AI advice.';

  const t = translations[lang];

  const prompt = `
    Based on the following weather data for ${data.locationName}:
    - Current Temp: ${data.current.temp}°C (Feels like ${data.current.apparentTemp}°C)
    - Condition Code: ${data.current.weatherCode}
    - Humidity: ${data.current.humidity}%
    - UV Index: ${data.current.uvIndex}
    - AQI: ${data.current.aqi}
    - Wind Speed: ${data.current.windSpeed} km/h
    - 7-Day Range: ${Math.min(...data.daily.tempMin)}°C to ${Math.max(...data.daily.tempMax)}°C

    ${t.aiSystemInstruction}
    Provide a concise (2-3 sentences) travel and dressing suggestion for a user today. Mention if they need sunscreen, an umbrella, or heavy clothing. Be friendly and helpful. Respond ONLY in the requested language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || 'Unable to generate AI advice at this time.';
  } catch (error) {
    console.error('Gemini error:', error);
    return 'The AI meteorologist is currently offline. Please check back later.';
  }
}

export async function getLifestyleAdvice(
  category: 'dressing' | 'workout' | 'uv' | 'carwash' | 'calendar',
  data: WeatherData,
  lang: Language = 'en'
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return 'Missing API Key';

  const categoryMap = {
    dressing: 'dressing index and specific outfit recommendations (indoor/outdoor)',
    workout: 'exercise advice and intensity recommendations based on air quality and temp',
    uv: 'UV protection and skincare recommendations',
    carwash: 'car washing feasibility and dust forecast',
    calendar: 'weather-optimized scheduling advice for the day (outdoor activities vs indoor productivity)'
  };

  const prompt = `
    Based on the weather for ${data.locationName}:
    - Temp: ${data.current.temp}°C
    - Weather: ${data.current.weatherCode}
    - UV: ${data.current.uvIndex}
    - AQI: ${data.current.aqi}
    - Humidity: ${data.current.humidity}%

    Provide a focused, detailed recommendation for: ${categoryMap[category]}.
    Include specific action-oriented advice (e.g., "Wear a linen shirt" or "Avoid jogging between 2-4 PM").
    Respond in ${lang === 'zh-CN' ? 'Simplified Chinese' : lang === 'zh-TW' ? 'Traditional Chinese' : 'English'}.
    Maximum 4 concise bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { temperature: 0.8 }
    });
    return response.text || 'Advice unavailable.';
  } catch (error) {
    return 'Error generating lifestyle advice.';
  }
}
