
// A utility to load and manage the English-Portuguese dictionary
import { toast } from "sonner";
import translate from "translate";

// Type definition for the dictionary
export type Dictionary = Record<string, string>;

// Cache the dictionary in localStorage
const CACHE_KEY = 'offline-dictionary';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export async function loadDictionary(): Promise<Dictionary> {
  try {
    // First check if we have a cached version
    const cachedData = localStorage.getItem(CACHE_KEY);
    
    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      
      // Check if cache is still valid
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        console.log('Using cached dictionary');
        return data;
      }
    }
    
    // If no cache or expired, fetch from source
    // Using a dictionary of common English words
    const response = await fetch('https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary_compact.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load dictionary: ${response.status}`);
    }
    
    const rawData = await response.json();
    
    // Extract a subset of common words to avoid processing the entire dictionary
    const commonWords: Dictionary = {};
    let count = 0;
    
    // Get first 1000 words
    for (const word in rawData) {
      if (count >= 1000) break;
      if (word.length > 2 && word.length < 10) {
        commonWords[word.toLowerCase()] = '';
        count++;
      }
    }
    
    // Configure the translation service
    translate.from = "en";
    translate.to = "pt";
    
    // Save to cache with timestamp
    localStorage.setItem(
      CACHE_KEY, 
      JSON.stringify({
        timestamp: Date.now(),
        data: commonWords
      })
    );
    
    return commonWords;
  } catch (error) {
    console.error('Error loading dictionary:', error);
    toast.error("Could not load the dictionary. Some features might not work offline.");
    
    // Return empty dictionary in case of error
    return {};
  }
}

// Clean up a word by removing punctuation and converting to lowercase
export function cleanWord(word: string): string {
  return word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toLowerCase();
}

// Translate a word using the translate package
export async function translateWord(word: string): Promise<string> {
  try {
    const cleaned = cleanWord(word);
    const translation = await translate(cleaned, { from: 'en', to: 'pt' });
    return translation || "Translation not found";
  } catch (error) {
    console.error('Translation error:', error);
    return "Translation service unavailable";
  }
}

// Get translation for a word (used for cached translations)
export function getTranslation(word: string, dictionary: Dictionary): string {
  const cleaned = cleanWord(word);
  return dictionary[cleaned] || "Translation not found";
}
