import React from 'react';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Snowflake, 
  CloudFog, 
  CloudDrizzle,
  Moon,
  CloudSun,
  CloudMoon
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  code: number;
  isDay?: boolean;
  className?: string;
}

/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
export const WeatherIcon: React.FC<Props> = ({ code, isDay = true, className }) => {
  const iconProps = { className: cn("w-full h-full", className) };

  // Clear sky
  if (code === 0) return isDay ? <Sun {...iconProps} className={cn("text-yellow-400", className)} /> : <Moon {...iconProps} className={cn("text-blue-200", className)} />;
  
  // Mainly clear, partly cloudy, and overcast
  if ([1, 2, 3].includes(code)) {
    if (code === 1) return isDay ? <CloudSun {...iconProps} className={cn("text-yellow-300", className)} /> : <CloudMoon {...iconProps} className={cn("text-blue-300", className)} />;
    return <Cloud {...iconProps} className={cn("text-gray-400", className)} />;
  }

  // Fog and depositing rime fog
  if ([45, 48].includes(code)) return <CloudFog {...iconProps} className={cn("text-gray-300", className)} />;

  // Drizzle
  if ([51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle {...iconProps} className={cn("text-blue-300", className)} />;

  // Rain
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain {...iconProps} className={cn("text-blue-500", className)} />;

  // Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <Snowflake {...iconProps} className={cn("text-blue-100", className)} />;

  // Thunderstorm
  if ([95, 96, 99].includes(code)) return <CloudLightning {...iconProps} className={cn("text-amber-400", className)} />;

  return <Cloud {...iconProps} />;
};

export const getWeatherDescription = (code: number): string => {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Heavy thunderstorm',
  };
  return descriptions[code] || 'Cloudy';
};
