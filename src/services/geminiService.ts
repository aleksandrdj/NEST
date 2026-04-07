import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { WeatherData, Child, ChatMessage, Recommendation } from "../types";

/**
 * Fetches clothing recommendation via Firebase Cloud Function Proxy.
 */
export async function getClothingRecommendation(
  weather: WeatherData, 
  child: Child, 
  language: 'ru' | 'en'
): Promise<Recommendation> {
  const getNestRecommendation = httpsCallable(functions, 'getNestRecommendation');
  
  try {
    const ageInDays = Math.floor((new Date().getTime() - new Date(child.birthDate).getTime()) / (1000 * 60 * 60 * 24));
    
    const result = await getNestRecommendation({
      weather,
      childAge: ageInDays,
      language
    });

    const data = result.data as any;
    
    return {
      id: '', // Will be set by Firestore
      childId: child.id,
      date: new Date().toISOString(),
      weather,
      clothing: data.clothing || [],
      advice: data.advice || '',
      confidence: data.confidence || 0,
      parentUid: child.parentUid
    };
  } catch (error) {
    console.error("Cloud Function Error (Recommendation):", error);
    return {
      id: '',
      childId: child.id,
      date: new Date().toISOString(),
      weather,
      clothing: language === 'ru' ? ["Боди", "Комбинезон"] : ["Bodysuit", "Overall"],
      advice: language === 'ru' ? "Оденьте ребенка по погоде, ориентируясь на свои ощущения." : "Dress your child according to the weather, following your intuition.",
      confidence: 70,
      parentUid: child.parentUid
    };
  }
}

/**
 * Fetches AI chat response via Firebase Cloud Function Proxy.
 */
export async function chatWithAI(
  message: string, 
  history: ChatMessage[], 
  context: { weather: WeatherData, child: Child, language: 'ru' | 'en' }
): Promise<string> {
  const nestAIChat = httpsCallable(functions, 'nestAIChat');

  try {
    const ageInDays = Math.floor((new Date().getTime() - new Date(context.child.birthDate).getTime()) / (1000 * 60 * 60 * 24));
    
    const result = await nestAIChat({
      message,
      history: history.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      childInfo: { name: context.child.name, ageDays: ageInDays },
      weather: context.weather,
      language: context.language
    });

    const data = result.data as any;
    return data.text || '';
  } catch (error) {
    console.error("Cloud Function Error (Chat):", error);
    return context.language === 'ru' ? "Извините, я сейчас не могу ответить. Попробуйте позже." : "Sorry, I can't respond right now. Please try again later.";
  }
}
