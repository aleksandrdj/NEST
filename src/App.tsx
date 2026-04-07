/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  Wind, 
  Droplets, 
  User as UserIcon, 
  Settings, 
  Plus, 
  History, 
  MessageCircle, 
  ChevronRight, 
  LogOut, 
  Moon, 
  Baby, 
  Calendar, 
  MapPin, 
  Send,
  X,
  Heart,
  Globe,
  Loader2,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';

import { auth, db } from './lib/firebase';
import { cn } from './lib/utils';
import { UserProfile, Child, WeatherData, Recommendation, ChatMessage } from './types';
import { fetchWeather, fetchHourlyForecast } from './services/weatherService';
import { getClothingRecommendation, chatWithAI } from './services/geminiService';
import { calculateAgeInDays, formatAgeString } from './utils/age';

// --- Localization ---
const translations = {
  ru: {
    welcome: "Добро пожаловать в Nest",
    tagline: "Спокойствие начинается здесь",
    signIn: "Войти через Google",
    onboardingTitle: "Давайте познакомимся",
    childName: "Имя малыша",
    birthDate: "Дата рождения",
    gender: "Пол",
    boy: "Мальчик",
    girl: "Девочка",
    save: "Сохранить",
    today: "Сегодня",
    recommendation: "Рекомендация",
    confidence: "Уверенность",
    chat: "Чат с ассистентом",
    history: "Дневник заботы",
    profile: "Профиль",
    language: "Язык",
    theme: "Тема",
    light: "Светлая",
    dark: "Темная",
    logout: "Выйти",
    loading: "Загрузка...",
    askAnything: "Спросите о чем угодно...",
    weather: "Погода",
    feelsLike: "Ощущается как",
    humidity: "Влажность",
    wind: "Ветер",
    babyAge: (days: number) => `Малышу ${days} дней 💛`
  },
  en: {
    welcome: "Welcome to Nest",
    tagline: "Peace of mind starts here",
    signIn: "Sign in with Google",
    onboardingTitle: "Let's get to know you",
    childName: "Baby's Name",
    birthDate: "Birth Date",
    gender: "Gender",
    boy: "Boy",
    girl: "Girl",
    save: "Save",
    today: "Today",
    recommendation: "Recommendation",
    confidence: "Confidence",
    chat: "Chat with Assistant",
    history: "Care Diary",
    profile: "Profile",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    logout: "Log Out",
    loading: "Loading...",
    askAnything: "Ask anything...",
    weather: "Weather",
    feelsLike: "Feels like",
    humidity: "Humidity",
    wind: "Wind",
    babyAge: (days: number) => `Baby is ${days} days old 💛`
  }
};

// --- Contexts ---

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            language: 'ru',
            theme: 'light'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const newProfile = { ...profile, ...updates } as UserProfile;
    await setDoc(doc(db, 'users', user.uid), newProfile);
    setProfile(newProfile);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-cream dark:bg-neutral-950 z-50">
    <motion.div 
      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      className="w-24 h-24 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center"
    >
      <Baby className="w-12 h-12 text-neutral-400" />
    </motion.div>
    <p className="mt-8 text-neutral-500 font-medium tracking-wide animate-pulse">Nest</p>
  </div>
);

const AuthScreen = () => {
  const { signIn } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream dark:bg-neutral-950 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-12 inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-neutral-900 rounded-[24pt] shadow-xl">
          <Baby className="w-10 h-10 text-neutral-900 dark:text-white" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-4">Nest</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-12 text-lg">Спокойствие начинается здесь</p>
        
        <button 
          onClick={signIn}
          className="w-full py-4 px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[24pt] font-semibold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <Globe className="w-5 h-5" />
          Войти через Google
        </button>
      </motion.div>
    </div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [loading, setLoading] = useState(false);
  const t = translations[profile?.language || 'ru'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !birthDate) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'children'), {
        uid: user.uid,
        name,
        birthDate,
        gender,
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-neutral-950 p-6 flex flex-col">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center"
      >
        <h2 className="text-3xl font-serif font-bold mb-8 dark:text-white">{t.onboardingTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">{t.childName}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-white dark:bg-neutral-900 border-none rounded-[24pt] shadow-sm focus:ring-2 focus:ring-neutral-200 dark:text-white"
              placeholder="Александр"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">{t.birthDate}</label>
            <input 
              type="date" 
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full p-4 bg-white dark:bg-neutral-900 border-none rounded-[24pt] shadow-sm focus:ring-2 focus:ring-neutral-200 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2">{t.gender}</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setGender('boy')}
                className={cn(
                  "py-4 rounded-[24pt] font-medium transition-all",
                  gender === 'boy' ? "bg-neutral-900 text-white" : "bg-white dark:bg-neutral-900 text-neutral-500"
                )}
              >
                {t.boy}
              </button>
              <button 
                type="button"
                onClick={() => setGender('girl')}
                className={cn(
                  "py-4 rounded-[24pt] font-medium transition-all",
                  gender === 'girl' ? "bg-neutral-900 text-white" : "bg-white dark:bg-neutral-900 text-neutral-500"
                )}
              >
                {t.girl}
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[24pt] font-bold text-lg mt-8 shadow-lg flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : t.save}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const MainScreen = () => {
  const { user, profile, logout, updateProfile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [hourly, setHourly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'main' | 'history' | 'profile'>('main');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const t = translations[profile?.language || 'ru'];

  // Fetch children
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'children'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Child));
      setChildren(docs);
      if (docs.length > 0 && !selectedChild) {
        setSelectedChild(docs[0]);
      }
    });
    return unsubscribe;
  }, [user]);

  // Fetch Weather & Recommendation
  useEffect(() => {
    const initData = async () => {
      if (!selectedChild) return;
      setLoading(true);
      try {
        // Get location
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          const wData = await fetchWeather(latitude, longitude);
          setWeather(wData);
          
          const hData = await fetchHourlyForecast(latitude, longitude);
          setHourly(hData);

          const ageDays = calculateAgeInDays(selectedChild.birthDate);
          const rec = await getClothingRecommendation(wData, selectedChild, profile?.language || 'ru');
          setRecommendation(rec);
          
          // Save to history
          await addDoc(collection(db, 'recommendations'), {
            uid: user?.uid,
            childId: selectedChild.id,
            weather: wData,
            clothing: rec.clothing,
            advice: rec.advice,
            confidence: rec.confidence,
            createdAt: serverTimestamp()
          });
        }, (err) => {
          console.error("Location error", err);
          // Fallback to London
          fetchWeather(51.5074, -0.1278).then(setWeather);
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [selectedChild]);

  const handleSendMessage = async () => {
    if (!input.trim() || !user || !weather || !selectedChild) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatWithAI(
        input, 
        messages, 
        { weather, child: selectedChild, language: profile?.language || 'ru' }
      );
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const ageDays = selectedChild ? calculateAgeInDays(selectedChild.birthDate) : 0;

  return (
    <div className="min-h-screen bg-cream dark:bg-neutral-950 flex flex-col max-w-lg mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="p-6 pt-12 flex items-center justify-between z-10">
        <div>
          <h1 className="text-2xl font-serif font-bold dark:text-white">Nest</h1>
          {selectedChild && (
            <p className="text-neutral-500 text-sm font-medium mt-1">
              {t.babyAge(ageDays)}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => updateProfile({ theme: profile?.theme === 'light' ? 'dark' : 'light' })}
            className="w-10 h-10 rounded-[12pt] glass flex items-center justify-center text-neutral-600 dark:text-neutral-300"
          >
            {profile?.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setView('profile')}
            className="w-10 h-10 rounded-[12pt] glass flex items-center justify-center text-neutral-600 dark:text-neutral-300"
          >
            <UserIcon size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">
        <AnimatePresence mode="wait">
          {view === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Weather Card */}
              {weather && (
                <div className="card-soft glass relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-neutral-500 text-sm font-medium uppercase tracking-wider">{t.today}</p>
                      <h2 className="text-5xl font-serif font-bold mt-2 dark:text-white">{weather.temp}°</h2>
                      <p className="text-neutral-600 dark:text-neutral-400 font-medium">{weather.condition}</p>
                    </div>
                    <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-[16pt] flex items-center justify-center">
                      <Sun className="text-orange-400" size={32} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50">
                    <div className="text-center">
                      <Wind size={16} className="mx-auto text-neutral-400 mb-1" />
                      <p className="text-xs text-neutral-400">{t.wind}</p>
                      <p className="text-sm font-bold dark:text-white">{weather.wind} km/h</p>
                    </div>
                    <div className="text-center">
                      <Droplets size={16} className="mx-auto text-neutral-400 mb-1" />
                      <p className="text-xs text-neutral-400">{t.humidity}</p>
                      <p className="text-sm font-bold dark:text-white">{weather.humidity}%</p>
                    </div>
                    <div className="text-center">
                      <Heart size={16} className="mx-auto text-neutral-400 mb-1" />
                      <p className="text-xs text-neutral-400">{t.feelsLike}</p>
                      <p className="text-sm font-bold dark:text-white">{weather.feelsLike}°</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendation Block */}
              {recommendation ? (
                <div className="card-soft bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-neutral-400" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">{t.recommendation}</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {recommendation.clothing.map((item, i) => (
                      <motion.li 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="flex items-center gap-3 text-lg font-medium"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30 dark:bg-neutral-900/30" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                  <p className="text-sm opacity-80 leading-relaxed italic border-t border-white/10 dark:border-neutral-900/10 pt-4">
                    "{recommendation.advice}"
                  </p>
                  <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter opacity-40">
                    <span>{t.confidence}: {recommendation.confidence}%</span>
                    <span>AI Assistant</span>
                  </div>
                </div>
              ) : (
                <div className="card-soft glass h-48 flex items-center justify-center">
                  <Loader2 className="animate-spin text-neutral-300" />
                </div>
              )}

              {/* Hourly Forecast */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 ml-1">Прогноз</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {hourly.map((h, i) => (
                    <div key={i} className="flex-shrink-0 w-20 py-4 glass rounded-[18pt] flex flex-col items-center gap-2">
                      <p className="text-xs font-medium text-neutral-500">{h.time}</p>
                      <Sun size={18} className="text-neutral-400" />
                      <p className="text-sm font-bold dark:text-white">{h.temp}°</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <HistoryView key="history" t={t} />
          )}

          {view === 'profile' && (
            <ProfileView key="profile" t={t} onBack={() => setView('main')} />
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-6 right-6 h-20 glass rounded-[24pt] flex items-center justify-around px-4 z-20 shadow-2xl border border-white/40 dark:border-neutral-800/40">
        <button 
          onClick={() => setView('main')}
          className={cn(
            "w-12 h-12 rounded-[14pt] flex items-center justify-center transition-all",
            view === 'main' ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-400"
          )}
        >
          <Sun size={24} />
        </button>
        <button 
          onClick={() => setView('history')}
          className={cn(
            "w-12 h-12 rounded-[14pt] flex items-center justify-center transition-all",
            view === 'history' ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-400"
          )}
        >
          <History size={24} />
        </button>
        <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800" />
        <button 
          onClick={() => setChatOpen(true)}
          className="w-12 h-12 rounded-[14pt] flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          <MessageCircle size={24} />
        </button>
      </nav>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-cream dark:bg-neutral-950 z-50 flex flex-col"
          >
            <header className="p-6 pt-12 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-[12pt] flex items-center justify-center">
                  <MessageCircle size={20} className="text-neutral-900 dark:text-white" />
                </div>
                <div>
                  <h3 className="font-serif font-bold dark:text-white">{t.chat}</h3>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center dark:text-white"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <Heart className="w-12 h-12" />
                  <p className="text-sm font-medium max-w-[200px]">Я здесь, чтобы помочь вам с заботой о малыше</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex flex-col",
                  m.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-[18pt]",
                    m.role === 'user' 
                      ? "bg-neutral-900 text-white rounded-tr-none" 
                      : "bg-white dark:bg-neutral-900 dark:text-white rounded-tl-none shadow-sm"
                  )}>
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert">
                      <Markdown>
                        {m.content}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-neutral-400">
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            <div className="p-6 pb-10 border-t border-neutral-100 dark:border-neutral-900">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t.askAnything}
                  className="flex-1 p-4 bg-white dark:bg-neutral-900 border-none rounded-[18pt] shadow-sm focus:ring-2 focus:ring-neutral-200 dark:text-white"
                />
                <button 
                  onClick={handleSendMessage}
                  className="w-14 h-14 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[18pt] flex items-center justify-center shadow-lg"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HistoryView = ({ t }: { t: any }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'recommendations'), 
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-serif font-bold dark:text-white">{t.history}</h2>
      <div className="space-y-4">
        {history.map((item, i) => (
          <div key={i} className="card-soft glass flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                {item.createdAt ? format(item.createdAt.toDate(), 'dd MMM, HH:mm') : '...'}
              </p>
              <p className="text-sm font-medium mt-1 dark:text-white">{item.clothing.join(', ')}</p>
              <p className="text-[10px] text-neutral-500 mt-1">{item.weather.temp}° • {item.weather.condition}</p>
            </div>
            <ChevronRight className="text-neutral-300" size={20} />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const ProfileView = ({ t, onBack }: { t: any, onBack: () => void }) => {
  const { profile, logout, updateProfile } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'children'), where('uid', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChildren(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Child)));
    });
    return unsubscribe;
  }, [profile]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full glass flex items-center justify-center dark:text-white">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-serif font-bold dark:text-white">{t.profile}</h2>
      </div>

      <div className="space-y-6">
        <div className="card-soft glass">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Малыши</h3>
          <div className="space-y-3">
            {children.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/50 dark:bg-neutral-800/50 rounded-[12pt]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                    <Baby size={18} className="text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{c.name}</p>
                    <p className="text-[10px] text-neutral-500">{format(new Date(c.birthDate), 'dd.MM.yyyy')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-soft glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-neutral-400" />
              <span className="text-sm font-medium dark:text-white">{t.language}</span>
            </div>
            <select 
              value={profile?.language}
              onChange={(e) => updateProfile({ language: e.target.value as 'ru' | 'en' })}
              className="bg-transparent text-sm font-bold dark:text-white border-none focus:ring-0"
            >
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-neutral-400" />
              <span className="text-sm font-medium dark:text-white">{t.theme}</span>
            </div>
            <button 
              onClick={() => updateProfile({ theme: profile?.theme === 'light' ? 'dark' : 'light' })}
              className="text-sm font-bold dark:text-white"
            >
              {profile?.theme === 'light' ? t.light : t.dark}
            </button>
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full py-4 glass text-red-500 rounded-[24pt] font-bold flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          {t.logout}
        </button>
      </div>
    </motion.div>
  );
};

// --- App Root ---

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    if (profile?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.theme]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'children'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChildren(snapshot.docs.map(d => d.data() as Child));
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;
  if (children.length === 0 && !onboardingComplete) {
    return <Onboarding onComplete={() => setOnboardingComplete(true)} />;
  }

  return <MainScreen />;
}
