
// A utility to load and manage the English-Portuguese dictionary
import { toast } from "sonner";

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
    const response = await fetch('https://raw.githubusercontent.com/quelves/en-pt-dictionary/master/en-pt.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load dictionary: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Save to cache with timestamp
    localStorage.setItem(
      CACHE_KEY, 
      JSON.stringify({
        timestamp: Date.now(),
        data
      })
    );
    
    return data;
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

// Get translation for a word
export function getTranslation(word: string, dictionary: Dictionary): string {
  const cleaned = cleanWord(word);
  return dictionary[cleaned] || "Translation not found";
}
