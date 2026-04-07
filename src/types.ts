export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  language: 'ru' | 'en';
  theme: 'light' | 'dark';
}

export interface Child {
  id: string;
  name: string;
  birthDate: string; // ISO string
  gender: 'boy' | 'girl' | 'other';
  parentUid: string;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  wind: number;
  location: string;
}

export interface Recommendation {
  id: string;
  childId: string;
  date: string;
  weather: WeatherData;
  clothing: string[];
  advice: string;
  confidence: number;
  parentUid: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
