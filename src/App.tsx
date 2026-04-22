import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Wind, 
  Droplets, 
  Sun, 
  AlertTriangle, 
  Navigation, 
  RefreshCcw,
  Sparkles,
  Shirt,
  Car,
  Heart,
  Smartphone,
  ChevronRight,
  Globe,
  X,
  Map as MapIcon,
  ShoppingBag,
  Bike,
  Activity,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  AreaChart, 
  Area, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import { fetchWeather, searchLocation, WeatherData } from './services/weatherService';
import { getAIWeatherAdvice, getLifestyleAdvice } from './services/geminiService';
import { WeatherIcon, getWeatherDescription } from './components/WeatherIcon';
import { GlassCard } from './components/GlassCard';
import { cn } from './lib/utils';
import { Language, translations } from './constants';

export default function App() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('aura_weather_recent') || '[]');
  });
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('aura_weather_lang') as Language) || 'zh-CN';
  });
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isRadarLoading, setIsRadarLoading] = useState(true);
  
  const [activeLifeCategory, setActiveLifeCategory] = useState<any>(null);
  const [lifeAdvice, setLifeAdvice] = useState<string | null>(null);
  const [loadingLifeDetail, setLoadingLifeDetail] = useState(false);

  const t = translations[language];
  const searchRef = useRef<HTMLDivElement>(null);

  // Dynamic Theme Mapping
  const getTheme = () => {
    if (!data) return { 
      bg: 'bg-zinc-950', 
      accent: 'from-zinc-900 to-black',
      text: 'text-zinc-100',
      muted: 'text-zinc-500',
      glass: 'bg-white/5 border-white/10 shadow-2xl',
      isDark: true,
      overlay: 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.1) 0%, transparent 80%)'
    };

    const code = data.current.weatherCode;
    const isNightVal = !data.current.isDay;

    // Night Theme (High Contrast Dark)
    if (isNightVal) {
      return {
        bg: 'bg-[#050505]',
        accent: 'from-[#111] to-[#050505]',
        text: 'text-white',
        muted: 'text-zinc-500',
        glass: 'bg-zinc-900/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        isDark: true,
        overlay: 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15) 0%, transparent 80%)'
      };
    }

    // Sunny / Clear (High Contrast Minimalist)
    if (code === 0 || code === 1) {
      return {
        bg: 'bg-[#FDFCFB]', // Pure warm ceramic
        accent: 'from-white to-[#FDFCFB]',
        text: 'text-zinc-900',
        muted: 'text-zinc-600',
        glass: 'bg-white/70 border-zinc-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]',
        isDark: false,
        overlay: 'radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.12) 0%, transparent 50%)'
      };
    }

    // Partly Cloudy
    if (code === 2) {
      return {
        bg: 'bg-[#E8F1F5]', // Soft Nordic Sky Blue
        accent: 'from-white to-[#E8F1F5]',
        text: 'text-zinc-800',
        muted: 'text-zinc-600',
        glass: 'bg-white/50 border-[#C9D9E2] shadow-sm',
        isDark: false,
        overlay: 'radial-gradient(circle at 50% -10%, rgba(186, 230, 253, 0.3) 0%, transparent 60%)'
      };
    }

    // Overcast / Foggy
    if (code === 3 || code === 45 || code === 48) {
      return {
        bg: 'bg-[#DADCE0]', // Slate Gray
        accent: 'from-[#CFD3D7] to-[#DADCE0]',
        text: 'text-zinc-900',
        muted: 'text-zinc-500',
        glass: 'bg-white/30 border-[#BDC3C7] shadow-inner',
        isDark: false,
        overlay: 'linear-gradient(to bottom, rgba(0,0,0,0.03), transparent)'
      };
    }

    // Rain / Heavy Weather (Deep Prussian Blue)
    if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
      return {
        bg: 'bg-[#0F172A]', // Deep Navy
        accent: 'from-[#1E293B] to-[#0F172A]',
        text: 'text-slate-100',
        muted: 'text-slate-500',
        glass: 'bg-slate-800/60 border-white/5 shadow-2xl',
        isDark: true,
        overlay: 'radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.15) 0%, transparent 70%)'
      };
    }

    // Default Fallback
    return {
      bg: 'bg-[#E5E7EB]',
      accent: 'from-[#D1D5DB] to-[#E5E7EB]',
      text: 'text-zinc-800',
      muted: 'text-zinc-600',
      glass: 'bg-white/40 border-zinc-300 shadow-sm',
      isDark: false,
      overlay: ''
    };
  };

  const theme = getTheme();

  // Rule-based dynamic advice for lifestyle cards
  const getDynamicAdvice = (category: string) => {
    if (!data) return '';
    
    const isZH = language.startsWith('zh');
    const { temp, uvIndex, aqi, weatherCode } = data.current;
    const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weatherCode);

    switch (category) {
      case 'dressing':
        if (temp > 28) return isZH ? '天气酷热，建议单衣、棉麻质地。' : 'Very hot, light cotton clothes recommended.';
        if (temp > 20) return isZH ? '气候温暖，衬衫或T恤最合适。' : 'Warm day, shirts or T-shirts are best.';
        if (temp > 10) return isZH ? '体感微凉，建议加一件轻便外套。' : 'Cool breezy, a light jacket is suggested.';
        return isZH ? '气温较低，请穿上厚大衣防寒。' : 'Cold weather, wear a coat to stay warm.';
      
      case 'carwash':
        if (isRainy) return isZH ? '近期有雨，不建议在此刻洗车。' : 'Rain expected, not ideal for car washing.';
        if (aqi > 150) return isZH ? '空气质量差，浮尘较多，不建议洗车。' : 'Poor air quality, not recommended for car washing.';
        return isZH ? '天气晴朗干燥，非常适合清洗爱车。' : 'Clear and dry, perfect for car washing.';
      
      case 'workout':
        if (aqi > 180) return isZH ? '空气重度污染，建议室内力量训练。' : 'High pollution, recommended indoor training.';
        if (isRainy) return isZH ? '雨天不宜户外，建议居家拉伸。' : 'Rainy day, suggest indoor stretching.';
        if (temp > 32) return isZH ? '气候炎热，建议清晨或室内运动。' : 'Scorching heat, exercise early or indoors.';
        return isZH ? '气候宜人，非常适合户外有氧运动。' : 'Pleasant weather, great for outdoor cardio.';
      
      case 'uv':
        if (uvIndex > 7) return isZH ? '紫外线极强，务必涂抹高倍防晒。' : 'Extreme UV, high-SPF sunscreen is a must.';
        if (uvIndex > 3) return isZH ? '紫外线中等，出门请佩戴墨镜或遮阳帽。' : 'Moderate UV, suggest sunglasses or hats.';
        return isZH ? '紫外线较弱，可以放心享受阳光。' : 'Low UV, safe to enjoy the sunshine.';
      default:
        return '';
    }
  };

  const getDateLocale = () => {
    if (language === 'zh-CN') return zhCN;
    if (language === 'zh-TW') return zhTW;
    return enUS;
  };

  // Popular cities based on market
  const popularCities = [
    { name: 'Beijing', latitude: 39.9042, longitude: 116.4074 },
    { name: 'Shanghai', latitude: 31.2304, longitude: 121.4737 },
    { name: 'Shenzhen', latitude: 22.5431, longitude: 114.0579 },
    { name: 'London', latitude: 51.5074, longitude: -0.1278 },
  ];

  // Persistence: Load last location
  useEffect(() => {
    const saved = localStorage.getItem('aura_weather_last_loc');
    if (saved) {
      const { lat, lon } = JSON.parse(saved);
      loadWeatherData(lat, lon);
    } else {
      loadWeatherData(39.9042, 116.4074); // Default to Beijing
    }
  }, [language]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        const results = await searchLocation(searchQuery, language);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, language]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLifeCardClick = async (category: any) => {
    setActiveLifeCategory(category);
    setLoadingLifeDetail(true);
    setLifeAdvice(null);
    
    if (data) {
      const advice = await getLifestyleAdvice(category.id, data, language);
      setLifeAdvice(advice);
    }
    setLoadingLifeDetail(false);
  };

  const openExternalMap = (query: string) => {
    if (!data) return;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}+near+${data.locationName}`;
    window.open(url, '_blank');
  };

  const loadWeatherData = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const weather = await fetchWeather(lat, lon);
      setData(weather);
      localStorage.setItem('aura_weather_last_loc', JSON.stringify({ lat, lon }));
      
      setLoadingAdvice(true);
      const advice = await getAIWeatherAdvice(weather, language);
      setAiAdvice(advice);
    } catch (err) {
      setError('Failed to fetch weather data.');
    } finally {
      setLoading(false);
      setLoadingAdvice(false);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('aura_weather_lang', newLang);
  };

  const handleSelectLocation = (loc: any) => {
    loadWeatherData(loc.latitude, loc.longitude);
    
    // Update recent searches
    const newRecent = [
      { 
        id: loc.id || Date.now(), 
        name: loc.name, 
        latitude: loc.latitude, 
        longitude: loc.longitude, 
        country: loc.country || '', 
        admin1: loc.subtitle || '' // Use the detailed subtitle we built
      },
      ...recentSearches.filter(r => r.name !== loc.name).slice(0, 4)
    ];
    setRecentSearches(newRecent);
    localStorage.setItem('aura_weather_recent', JSON.stringify(newRecent));

    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('aura_weather_recent');
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          loadWeatherData(position.coords.latitude, position.coords.longitude);
        },
        () => setError('Geolocation denied.')
      );
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="weather-bg" />
        <RefreshCcw className="w-12 h-12 animate-spin text-blue-400" />
        <p className="text-lg font-medium animate-pulse">{t.loadingAI}</p>
      </div>
    );
  }

  const chartData = data?.hourly.time.map((time, i) => ({
    time: format(new Date(time), 'HH:mm'),
    temp: data.hourly.temp[i],
  }));

  return (
    <div className={cn("min-h-screen relative p-4 md:p-8 transition-colors duration-1000", theme.bg, theme.text)}>
      <div className="weather-bg" style={{ background: theme.overlay }} />
      
      <main className="max-w-4xl mx-auto space-y-12">
        {/* Header - Minimalist */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-black/5 dark:border-white/5 pb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
              <span className="opacity-20 translate-y-[1px]">AURA</span>
              <span className="font-serif italic font-normal normal-case opacity-100 tracking-normal transform -translate-x-1">Weather</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase">
              <MapPin className="w-3 h-3" />
              <span>{data?.locationName || '---'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className={cn("flex backdrop-blur-md p-1 rounded-xl border", theme.glass)}>
                {(['en', 'zh-CN', 'zh-TW'] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLanguageChange(l)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest",
                      language === l ? (theme.bg === 'bg-[#F9F8F6]' ? "bg-black text-white" : "bg-white text-black") : "opacity-30 hover:opacity-100"
                    )}
                  >
                    {l === 'en' ? 'EN' : l === 'zh-CN' ? 'ZH' : 'TW'}
                  </button>
                ))}
              </div>
              <button 
                onClick={getCurrentLocation}
                className={cn("p-2.5 rounded-xl border hover:scale-105 transition-transform active:scale-95", theme.glass)}
              >
                <Navigation className="w-4 h-4 opacity-70" />
              </button>
          </div>
        </header>

        {/* Dynamic Search Bar */}
        <div ref={searchRef} className="relative w-full group max-w-xl mx-auto">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className={cn("w-full border rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 ring-black/5 dark:ring-white/5 transition-all font-sans text-sm tracking-tight", theme.glass)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
          
          <AnimatePresence>
            {isSearchFocused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={cn("absolute top-full left-0 right-0 mt-3 border rounded-2xl overflow-hidden z-50 shadow-2xl p-2", theme.glass, "backdrop-blur-3xl")}
              >
                {/* Search Results */}
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((loc) => (
                      <button
                        key={loc.id}
                        className="w-full text-left p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-xl flex items-center gap-3"
                        onClick={() => handleSelectLocation(loc)}
                      >
                        <Globe className="w-4 h-4 opacity-30 shrink-0" />
                        <div>
                          <p className="font-bold text-xs tracking-tight">{loc.name}</p>
                          <p className="text-[10px] opacity-40 uppercase tracking-tighter">{loc.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length > 1 ? (
                  <div className="p-4 text-center opacity-30 text-[10px] uppercase font-bold tracking-widest italic">{t.noResults}</div>
                ) : (
                  <div className="space-y-4 p-2">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <p className="text-[9px] opacity-30 uppercase tracking-[0.2em] font-black">{t.recentSearches}</p>
                          <button onClick={clearRecentSearches} className="text-[9px] opacity-30 hover:opacity-100 uppercase font-black transition-opacity">{t.clearHistory}</button>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {recentSearches.map((loc) => (
                            <button
                              key={loc.id}
                              className="text-left py-2.5 px-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                              onClick={() => handleSelectLocation(loc)}
                            >
                              <RefreshCcw className="w-3 h-3 opacity-20" />
                              <span className="opacity-70">{loc.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hero Weather Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-12 relative">
             <div className="absolute -top-12 -left-4 font-serif text-[18rem] md:text-[24rem] leading-none font-black tracking-tighter opacity-[0.03] transition-all duration-1000 select-none pointer-events-none">
                {data?.current.temp}
             </div>
             <div className="flex flex-col md:flex-row md:items-end gap-x-12 gap-y-6 relative z-10">
                <div className="space-y-0">
                  <span className="font-serif text-8xl md:text-[12rem] leading-[0.8] font-bold tracking-tighter transition-all duration-1000">
                    {data?.current.temp}
                    <span className="text-4xl md:text-6xl align-top font-normal opacity-30 mt-8 inline-block ml-4">°</span>
                  </span>
                </div>
                
                <div className="pb-4 space-y-6 flex-1">
                  <div className="flex items-center gap-6">
                    <div className={cn("p-4 rounded-3xl", theme.glass)}>
                      <WeatherIcon code={data?.current.weatherCode || 0} isDay={data?.current.isDay} className="w-12 h-12" />
                    </div>
                    <div>
                      <h2 className="text-4xl md:text-5xl font-serif italic leading-none tracking-tight">
                        {getWeatherDescription(data?.current.weatherCode || 0)}
                      </h2>
                      <div className={cn("flex items-center gap-2 mt-3 font-black uppercase tracking-[0.2em] text-[10px]", theme.muted)}>
                         <span>H {data?.daily.tempMax[0]}°</span>
                         <span className="opacity-20">•</span>
                         <span>L {data?.daily.tempMin[0]}°</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setIsRadarOpen(true)}
                      className={cn("px-10 py-4 rounded-full font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-xl active:scale-95", 
                        theme.isDark ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800")}
                    >
                      {t.viewRadar}
                    </button>
                    <div className={cn("px-8 py-4 rounded-full border font-black text-[10px] tracking-[0.2em] uppercase flex items-center gap-3 backdrop-blur-md", theme.glass)}>
                       <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                       <span className={theme.muted}>RealFeel</span>
                       <span className="font-bold">{data?.current.apparentTemp}°</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Forecast & Charts Preview */}
          <div className="lg:col-span-8">
            <GlassCard className={cn("p-8 relative group overflow-hidden h-full", theme.glass)}>
               <div className="flex items-center justify-between mb-8">
                  <h3 className={cn("text-[10px] font-black uppercase tracking-[0.3em]", theme.muted)}>{t.hourlyForecast}</h3>
                  <div className="flex gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", theme.isDark ? "bg-white/20" : "bg-black/10")} />
                    <div className={cn("w-2.5 h-2.5 rounded-full", theme.isDark ? "bg-blue-500" : "bg-blue-600")} />
                  </div>
               </div>
               <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.isDark ? "#fff" : "#000"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={theme.isDark ? "#fff" : "#000"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="temp" 
                        stroke={theme.isDark ? "#fff" : "#000"} 
                        fillOpacity={1} 
                        fill="url(#colorTemp)" 
                        strokeWidth={4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex justify-between pt-8">
                  {data?.hourly.time.filter((_, i) => i % 4 === 0).slice(0, 6).map((time, i) => {
                    const idx = data.hourly.time.indexOf(time);
                    return (
                      <div key={time} className="text-center space-y-3">
                        <p className={cn("text-[9px] font-black uppercase tracking-widest", theme.muted)}>{format(new Date(time), 'HH:mm')}</p>
                        <p className="text-sm font-serif italic font-bold">{Math.round(data.hourly.temp[idx])}°</p>
                      </div>
                    );
                  })}
               </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-4 h-full">
             <GlassCard className={cn("p-8 h-full flex flex-col justify-between", theme.glass)}>
                <div className="space-y-8">
                  {data?.daily.time.slice(1, 6).map((date, i) => (
                    <div key={date} className="flex items-center justify-between group transition-all">
                      <span className={cn("text-[10px] font-black uppercase tracking-widest w-12 transition-all", theme.muted, "group-hover:opacity-100 group-hover:translate-x-1")}>
                        {format(new Date(date), 'EEE', { locale: getDateLocale() })}
                      </span>
                      <div className="flex-1 flex justify-center">
                        <WeatherIcon code={data.daily.weatherCode[i+1]} className="w-6 h-6 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                      </div>
                      <div className="flex gap-5 font-serif italic text-sm">
                        <span className="font-bold underline decoration-blue-500/30 underline-offset-4">{data.daily.tempMax[i+1]}°</span>
                        <span className={theme.muted}>{data.daily.tempMin[i+1]}°</span>
                      </div>
                    </div>
                  ))}
                </div>
             </GlassCard>
          </div>
        </div>

        {/* Details Grid - Bento Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className={cn("p-6 flex flex-col gap-6 group hover:scale-[1.02] transition-all duration-300", theme.glass)}>
               <div className="flex justify-between items-start">
                 <div className="p-3 bg-yellow-500/15 rounded-2xl text-yellow-500 border border-yellow-500/10 shadow-lg shadow-yellow-500/5"><Sun className="w-5 h-5" /></div>
                 <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-black bg-yellow-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{t.uvLevels.moderate}</span>
               </div>
               <div className="mt-2">
                  <p className={cn("text-xs font-bold uppercase tracking-[0.2em] mb-2", theme.muted)}>{t.uvIndex}</p>
                  <p className={cn("text-4xl font-black", theme.text)}>{data?.current.uvIndex}</p>
               </div>
            </GlassCard>

            <GlassCard className={cn("p-6 flex flex-col gap-6 group hover:scale-[1.02] transition-all duration-300", theme.glass)}>
               <div className="flex justify-between items-start">
                 <div className="p-3 bg-emerald-500/15 rounded-2xl text-emerald-500 border border-emerald-500/10 shadow-lg shadow-emerald-500/5"><Heart className="w-5 h-5" /></div>
                 <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{t.aqiLevels.healthy}</span>
               </div>
               <div className="mt-2">
                  <p className={cn("text-xs font-bold uppercase tracking-[0.2em] mb-2", theme.muted)}>{t.aqi}</p>
                  <p className={cn("text-4xl font-black", theme.text)}>{data?.current.aqi}</p>
               </div>
            </GlassCard>

            <GlassCard className={cn("p-6 flex flex-col gap-6 group hover:scale-[1.02] transition-all duration-300", theme.glass)}>
               <div className="p-3 bg-blue-500/15 rounded-2xl text-blue-400 w-fit border border-blue-500/10 shadow-lg shadow-blue-500/5"><Droplets className="w-5 h-5" /></div>
               <div className="mt-2">
                  <p className={cn("text-xs font-bold uppercase tracking-[0.2em] mb-2", theme.muted)}>{t.humidity}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={cn("text-4xl font-black", theme.text)}>{data?.current.humidity}</p>
                    <span className={cn("text-xs font-bold", theme.muted)}>%</span>
                  </div>
               </div>
            </GlassCard>

            <GlassCard className={cn("p-6 flex flex-col gap-6 group hover:scale-[1.02] transition-all duration-300", theme.glass)}>
               <div className="p-3 bg-purple-500/15 rounded-2xl text-purple-400 w-fit border border-purple-500/10 shadow-lg shadow-purple-500/5"><Wind className="w-5 h-5" /></div>
               <div className="mt-2">
                  <p className={cn("text-xs font-bold uppercase tracking-[0.2em] mb-2", theme.muted)}>{t.wind}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={cn("text-4xl font-black", theme.text)}>{data?.current.windSpeed}</p>
                    <span className={cn("text-xs font-bold", theme.muted)}>km/h</span>
                  </div>
               </div>
            </GlassCard>
          </div>
      </main>

      {/* Weather Almanac - Integrated Calendar */}
      <section className="max-w-4xl mx-auto space-y-8 py-12">
         <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
               <h3 className="text-4xl font-serif italic tracking-tight">{t.weatherCalendar}</h3>
               <p className={cn("text-[10px] font-black uppercase tracking-[0.3em]", theme.muted)}>Your weather-synced schedule</p>
            </div>
            <div className={cn("hidden sm:flex items-center gap-4 p-4 rounded-3xl border shadow-sm", theme.glass)}>
               <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                     <div key={i} className={cn("w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-bold overflow-hidden")}>
                        <Sparkles className="w-4 h-4 opacity-30" />
                     </div>
                  ))}
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest leading-none opacity-60 text-emerald-500">{t.optimizedSchedule}</span>
            </div>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {data?.daily.time.slice(0, 7).map((date, i) => {
               const isToday = i === 0;
               const uv = data.daily.uvIndexMax[i];
               const code = data.daily.weatherCode[i];
               const tMax = data.daily.tempMax[i];
               
               // Dynamic Vibe/Productivity Calculation
               let score = 90;
               if (tMax > 32) score -= 20;
               if (tMax < 5) score -= 15;
               if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) score -= 35;
               if (uv > 7) score -= 10;
               
               return (
                  <GlassCard 
                    key={date}
                    onClick={() => handleLifeCardClick({ id: 'calendar', date, icon: <Calendar />, title: format(new Date(date), 'MMM d'), color: 'emerald' })}
                    className={cn(
                      "p-6 flex flex-col items-center justify-between min-h-[220px] transition-all duration-500 cursor-pointer group hover:scale-[1.03] active:scale-95 relative overflow-hidden", 
                      isToday ? "border-emerald-500/40 ring-4 ring-emerald-500/5 ring-inset shadow-emerald-500/10" : "",
                      theme.glass
                    )}
                  >
                     {/* Background Number */}
                     <div className="absolute top-2 right-4 text-4xl font-serif italic font-black opacity-[0.03] group-hover:opacity-[0.07] transition-opacity select-none">
                        {format(new Date(date), 'd')}
                     </div>

                     <div className="text-center space-y-1 relative z-10 w-full">
                        <p className={cn("text-[9px] font-black uppercase tracking-[0.2em]", theme.muted)}>
                          {format(new Date(date), 'eee', { locale: getDateLocale() })}
                        </p>
                        <p className={cn("text-2xl font-serif italic", isToday ? "text-emerald-500" : theme.text)}>
                          {format(new Date(date), 'd')}
                        </p>
                     </div>

                     <div className="my-6 relative z-10 group-hover:rotate-12 transition-transform duration-500">
                        <WeatherIcon code={code} className="w-10 h-10" />
                     </div>

                     <div className="w-full space-y-4 pt-4 border-t border-black/5 dark:border-white/5 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-40", theme.muted)}>Vibe</span>
                             <span className={cn("text-[10px] font-bold font-serif italic truncate", 
                               score > 80 ? "text-emerald-500" : score > 50 ? "text-amber-500" : "text-rose-500")}>
                               {score > 80 ? 'Peak' : score > 60 ? 'Optimal' : score > 40 ? 'Steady' : 'Careful'}
                             </span>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-40", theme.muted)}>Max</span>
                             <span className="text-xs font-bold">{tMax}°</span>
                          </div>
                        </div>
                        
                        <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.max(15, score)}%` }}
                             className={cn("h-full rounded-full", 
                               score > 80 ? "bg-emerald-500" : score > 50 ? "bg-amber-500" : "bg-rose-500")}
                           />
                        </div>
                     </div>
                  </GlassCard>
               );
            })}
         </div>
      </section>

      {/* Featured Section */}
      <section className="max-w-4xl mx-auto space-y-12 py-8">
         <div className="flex items-center gap-6">
            <h3 className="text-4xl font-serif italic tracking-tight">{t.lifestyle}</h3>
            <div className={cn("h-px flex-1", theme.isDark ? "bg-white/10" : "bg-zinc-200")} />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <GlassCard 
              onClick={() => handleLifeCardClick({ id: 'dressing', icon: <Shirt />, title: t.dressing, color: 'sky' })}
              className={cn("p-10 group hover:scale-[1.05] transition-all cursor-pointer active:scale-95 relative overflow-hidden", theme.glass)}
            >
               {/* Background Image Layer */}
               <div className="absolute inset-0 z-0 opacity-[0.14] group-hover:opacity-[0.22] transition-opacity duration-500">
                  <img 
                    src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop" 
                    alt="Fashion"
                    className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" 
                    referrerPolicy="no-referrer"
                  />
               </div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-16">
                    <div className="p-3 bg-sky-500/15 rounded-2xl text-sky-500 border border-sky-500/10"><Shirt className="w-6 h-6" /></div>
                    <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase", theme.muted)}>AURA GUIDE</span>
                 </div>
                 <h4 className="font-serif text-2xl italic mb-3">{t.dressing}</h4>
                 <p className={cn("text-xs leading-relaxed font-medium", theme.muted)}>{getDynamicAdvice('dressing')}</p>
               </div>
            </GlassCard>

            <GlassCard 
              onClick={() => handleLifeCardClick({ id: 'carwash', icon: <Car />, title: t.carWash, color: 'amber' })}
              className={cn("p-10 group hover:scale-[1.05] transition-all cursor-pointer active:scale-95 relative overflow-hidden", theme.glass)}
            >
               {/* Background Image Layer */}
               <div className="absolute inset-0 z-0 opacity-[0.14] group-hover:opacity-[0.22] transition-opacity duration-500">
                  <img 
                    src="https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=1000&auto=format&fit=crop" 
                    alt="Car Wash"
                    className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" 
                    referrerPolicy="no-referrer"
                  />
               </div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-16">
                    <div className="p-3 bg-amber-500/15 rounded-2xl text-amber-500 border border-amber-500/10"><Car className="w-6 h-6" /></div>
                    <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase", theme.muted)}>STATUS</span>
                 </div>
                 <h4 className="font-serif text-2xl italic mb-3">{t.carWash}</h4>
                 <p className={cn("text-xs leading-relaxed font-medium", theme.muted)}>{getDynamicAdvice('carwash')}</p>
               </div>
            </GlassCard>

            <GlassCard 
              onClick={() => handleLifeCardClick({ id: 'workout', icon: <Heart />, title: t.sports, color: 'pink' })}
              className={cn("p-10 group hover:scale-[1.05] transition-all cursor-pointer active:scale-95 relative overflow-hidden", theme.glass)}
            >
               {/* Background Image Layer */}
               <div className="absolute inset-0 z-0 opacity-[0.14] group-hover:opacity-[0.22] transition-opacity duration-500">
                  <img 
                    src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1000&auto=format&fit=crop" 
                    alt="Fitness"
                    className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" 
                    referrerPolicy="no-referrer"
                  />
               </div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-16">
                    <div className="p-3 bg-pink-500/15 rounded-2xl text-pink-500 border border-pink-500/10"><Heart className="w-6 h-6" /></div>
                    <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase", theme.muted)}>FITNESS</span>
                 </div>
                 <h4 className="font-serif text-2xl italic mb-3">{t.sports}</h4>
                 <p className={cn("text-xs leading-relaxed font-medium", theme.muted)}>{getDynamicAdvice('workout')}</p>
               </div>
            </GlassCard>

            <GlassCard 
              onClick={() => handleLifeCardClick({ id: 'uv', icon: <Sun />, title: t.uvProtection, color: 'indigo' })}
              className={cn("p-10 group hover:scale-[1.05] transition-all cursor-pointer active:scale-95 relative overflow-hidden", theme.glass)}
            >
               {/* Background Image Layer */}
               <div className="absolute inset-0 z-0 opacity-[0.14] group-hover:opacity-[0.22] transition-opacity duration-500">
                  <img 
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop" 
                    alt="Sun Protection"
                    className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" 
                    referrerPolicy="no-referrer"
                  />
               </div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-16">
                    <div className="p-3 bg-indigo-500/15 rounded-2xl text-indigo-500 border border-indigo-500/10"><Sun className="w-6 h-6" /></div>
                    <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase", theme.muted)}>PROTECTION</span>
                 </div>
                 <h4 className="font-serif text-2xl italic mb-3">{t.uvProtection}</h4>
                 <p className={cn("text-xs leading-relaxed font-medium", theme.muted)}>{getDynamicAdvice('uv')}</p>
               </div>
            </GlassCard>
         </div>
      </section>

      {/* Alert Section */}
      <AnimatePresence>
        {data?.current.weatherCode && [95, 96, 99, 82].includes(data.current.weatherCode) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 group">
              <div className="p-5 bg-red-500/20 rounded-full animate-pulse group-hover:bg-red-500/30 transition-colors">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                 <h4 className="text-xl font-serif italic text-red-100">{t.severeWeather}</h4>
                 <p className="text-red-100/40 text-[11px] font-bold uppercase tracking-widest leading-relaxed">{t.weatherAlert}</p>
              </div>
              <button 
                onClick={() => setIsRadarOpen(true)}
                className="px-10 py-4 bg-red-500 text-white rounded-full font-black text-[10px] tracking-[0.2em] uppercase hover:bg-red-400 transition-colors shadow-xl shadow-red-500/20 active:scale-95"
              >
                {t.viewRadar}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radar Modal */}
      <AnimatePresence>
        {isRadarOpen && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col"
            >
              {/* Fixed Header Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 backdrop-blur-xl border-b border-white/10 z-[110]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <RefreshCcw className={cn("w-4 h-4 text-blue-400", isRadarLoading && "animate-spin")} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">{t.viewRadar}</h3>
                    <p className="text-[10px] text-white/40 mt-1">{data.locationName}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setIsRadarOpen(false);
                    setIsRadarLoading(true);
                  }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xs font-medium text-white/40 group-hover:text-white/60 hidden sm:inline">关闭</span>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 relative">
                {isRadarLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-[105] space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-white/40 animate-pulse">正在获取实时气象波段...</p>
                  </div>
                )}

                <iframe
                  onLoad={() => setIsRadarLoading(false)}
                  src={`https://embed.windy.com/embed2.html?lat=${localStorage.getItem('aura_weather_last_loc') ? JSON.parse(localStorage.getItem('aura_weather_last_loc')!).lat : '39.9'}&lon=${localStorage.getItem('aura_weather_last_loc') ? JSON.parse(localStorage.getItem('aura_weather_last_loc')!).lon : '116.4'}&zoom=6&level=surface&overlay=radar&product=radar&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lifestyle Detail Modal */}
      <AnimatePresence>
        {activeLifeCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn("w-full max-w-xl border-t md:border rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl safe-p-bottom flex flex-col max-h-[90vh]", 
                !theme.isDark ? "bg-[#F2F1EF] border-black/5" : "bg-[#121417] border-white/10")}
            >
              {/* Sticky Modal Header */}
              <div className={cn("flex items-center justify-between p-6 border-b z-20 flex-none backdrop-blur-xl", 
                theme.isDark ? "bg-black/60 border-white/10" : "bg-white/60 border-black/5")}>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", `bg-${activeLifeCategory.color}-500/10 text-${activeLifeCategory.color}-500`)}>
                    {activeLifeCategory.icon}
                  </div>
                  <h3 className={cn("text-lg font-serif italic", theme.text)}>{activeLifeCategory.title}</h3>
                </div>
                <button 
                  onClick={() => setActiveLifeCategory(null)}
                  className={cn("p-2 rounded-xl transition-colors", theme.glass, theme.muted, "hover:opacity-100")}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="space-y-6">
                  {loadingLifeDetail ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p className={cn("text-xs font-bold uppercase tracking-widest animate-pulse", theme.muted)}>{t.loadingAI}</p>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-3xl p-8 border shadow-sm", theme.glass)}
                    >
                      <div className={cn("prose prose-sm max-w-none prose-p:leading-relaxed", 
                         !theme.isDark ? "prose-p:text-zinc-600 prose-li:text-zinc-600 prose-strong:text-zinc-900" : "prose-invert prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-white")}>
                        <Markdown>{lifeAdvice || 'Suggesting...'}</Markdown>
                      </div>
                    </motion.div>
                  )}

                  {activeLifeCategory.id === 'calendar' && (
                    <div className="space-y-4">
                       <div className={cn("p-6 rounded-3xl border flex items-center justify-between", theme.glass)}>
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                                <TrendingUp className="w-6 h-6" />
                             </div>
                             <div>
                                <p className={cn("text-[10px] font-black uppercase tracking-widest", theme.muted)}>AI Scheduling Agent</p>
                                <p className={cn("text-lg font-serif italic", theme.text)}>Active & Optimizing</p>
                             </div>
                          </div>
                          <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                       </div>
                       
                       <div className="space-y-3">
                          {[
                            { time: '07:00 - 09:00', task: 'Outdoor Exercise', icon: <Activity className="w-4 h-4" />, status: 'Optimal' },
                            { time: '10:00 - 15:00', task: 'Deep Work / Indoor', icon: <Clock className="w-4 h-4" />, status: 'High Focus' },
                            { time: '16:00 - 18:00', task: 'Leisure / Commute', icon: <ChevronRight className="w-4 h-4" />, status: 'Steady' }
                          ].map((item, idx) => (
                            <div key={idx} className={cn("p-4 rounded-2xl border flex items-center justify-between group hover:border-emerald-500/30 transition-all", theme.glass)}>
                               <div className="flex items-center gap-4">
                                  <div className={cn("p-2 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity", theme.isDark ? "bg-white/5" : "bg-black/5")}>
                                     {item.icon}
                                  </div>
                                  <div>
                                     <p className={cn("text-[8px] font-black uppercase tracking-tighter", theme.muted)}>{item.time}</p>
                                     <p className={cn("text-xs font-bold", theme.text)}>{item.task}</p>
                                  </div>
                               </div>
                               <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 opacity-60">{item.status}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  {activeLifeCategory.id === 'carwash' && (
                    <button 
                      onClick={() => openExternalMap('car wash')}
                      className="w-full py-4 bg-amber-500 text-amber-950 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors active:scale-95"
                    >
                      <MapIcon className="w-5 h-5" />
                      搜索附近的洗车店
                    </button>
                  )}

                  {activeLifeCategory.id === 'workout' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => openExternalMap('park')}
                        className="py-4 bg-emerald-500 text-emerald-950 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-95"
                      >
                        <MapIcon className="w-5 h-5" />
                        附近公园
                      </button>
                      <button 
                        onClick={() => openExternalMap('cycling route')}
                        className="py-4 bg-blue-500 text-blue-50 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-400 transition-colors active:scale-95"
                      >
                        <Bike className="w-5 h-5" />
                        推荐骑行路线
                      </button>
                    </div>
                  )}

                  {activeLifeCategory.id === 'uv' && data && (
                    <div className="grid grid-cols-2 gap-3">
                       <div className={cn("p-4 rounded-2xl border transition-all", theme.glass)}>
                          <Sun className="w-5 h-5 text-indigo-500 mb-2" />
                          <p className={cn("text-[10px] font-black uppercase tracking-wider", theme.muted)}>当前指数</p>
                          <p className={cn("text-sm font-bold mt-1", theme.text)}>UV {data.current.uvIndex}</p>
                       </div>
                       <div className={cn("p-4 rounded-2xl border transition-all", theme.glass)}>
                          <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
                          <p className={cn("text-[10px] font-black uppercase tracking-wider", theme.muted)}>防护等级</p>
                          <p className={cn("text-sm font-bold mt-1", theme.text)}>
                            {data.current.uvIndex <= 2 ? t.uvLevels.low : 
                             data.current.uvIndex <= 5 ? t.uvLevels.moderate : 
                             data.current.uvIndex <= 7 ? t.uvLevels.high : t.uvLevels.veryHigh}
                          </p>
                       </div>
                    </div>
                  )}

                  {activeLifeCategory.id === 'dressing' && (
                    <div className="grid grid-cols-2 gap-3">
                       <div className={cn("p-4 rounded-2xl border transition-all", theme.glass)}>
                          <ShoppingBag className="w-5 h-5 text-sky-500 mb-2" />
                          <p className={cn("text-[10px] font-black uppercase tracking-wider", theme.muted)}>今日好物</p>
                          <p className={cn("text-sm font-bold mt-1", theme.text)}>防风风衣 / 轻便跑鞋</p>
                       </div>
                       <div className={cn("p-4 rounded-2xl border transition-all", theme.glass)}>
                          <Activity className="w-5 h-5 text-pink-500 mb-2" />
                          <p className={cn("text-[10px] font-black uppercase tracking-wider", theme.muted)}>体感反馈</p>
                          <p className={cn("text-sm font-bold mt-1", theme.text)}>微风拂面，体感舒适</p>
                       </div>
                    </div>
                  )}

                  {/* Secondary Return Button */}
                  <button 
                    onClick={() => setActiveLifeCategory(null)}
                    className={cn("w-full py-5 font-black text-[10px] tracking-[0.3em] uppercase rounded-2xl transition-all mt-8 mb-4 border shadow-sm", 
                      theme.isDark ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800")}
                  >
                    <span>{t.backToHome || 'CLOSE'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className={cn("text-center pb-12 pt-12 text-xs font-bold uppercase tracking-[0.3em]", theme.muted)}>
        {t.footer} • v2.1 • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
