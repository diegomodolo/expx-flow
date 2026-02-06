import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Simple cache to avoid re-translating
const translationCache = new Map<string, string>();

// Detect if text is likely English
function isLikelyEnglish(text: string): boolean {
  // Common English words that are unlikely in Portuguese
  const englishWords = new Set([
    // Very common English words
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 
    'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 
    'now', 'old', 'see', 'two', 'way', 'who', 'did', 'let', 'put', 'say', 'she', 'too', 
    'use', 'that', 'this', 'with', 'have', 'from', 'they', 'been', 'will', 'your', 'when',
    'what', 'where', 'which', 'while', 'about', 'after', 'being', 'could', 'every', 'first',
    'found', 'great', 'house', 'large', 'little', 'never', 'other', 'place', 'right', 'small',
    'sound', 'still', 'their', 'there', 'these', 'thing', 'think', 'those', 'three', 'under',
    'water', 'world', 'would', 'write', 'years', 'young', 'into', 'just', 'know', 'take',
    'people', 'year', 'good', 'some', 'them', 'than', 'then', 'look', 'only', 'come', 'over',
    'such', 'make', 'because', 'back', 'through', 'most', 'want', 'give', 'much', 'before',
    // Tech/business words commonly in English
    'tools', 'tool', 'framework', 'works', 'proven', 'strategies', 'strategy', 'increase',
    'leads', 'demand', 'generation', 'method', 'faster', 'seconds', 'open', 'source', 'feel',
    'illegal', 'market', 'goes', 'wrong', 'best', 'worst', 'top', 'tips', 'tricks', 'guide',
    'tutorial', 'learn', 'build', 'create', 'why', 'everything', 'need', 'know', 'complete',
    'ultimate', 'beginner', 'advanced', 'masterclass', 'explained', 'crash', 'course',
    'secrets', 'revealed', 'hidden', 'features', 'update', 'review', 'versus', 'compared',
  ]);

  // Extract words from text
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  
  // Count English word matches
  let englishCount = 0;
  for (const word of words) {
    if (englishWords.has(word)) {
      englishCount++;
    }
  }

  // If at least 2 English words found, consider it English
  return englishCount >= 2;
}

export function useTranslation() {
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const translateText = useCallback(async (text: string): Promise<string | null> => {
    // Check cache first
    if (translationCache.has(text)) {
      return translationCache.get(text) || null;
    }

    // Check if already translated in state
    if (translations.has(text)) {
      return translations.get(text) || null;
    }

    // Check if not English
    if (!isLikelyEnglish(text)) {
      return null;
    }

    // Mark as loading
    setLoading((prev) => new Set(prev).add(text));

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text, targetLanguage: 'pt-BR' },
      });

      if (error) throw error;

      const translated = data?.translatedText || null;
      
      if (translated) {
        translationCache.set(text, translated);
        setTranslations((prev) => new Map(prev).set(text, translated));
      }

      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return null;
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(text);
        return next;
      });
    }
  }, [translations]);

  // Batch translate multiple texts
  const translateBatch = useCallback(async (texts: string[]): Promise<void> => {
    const toTranslate = texts.filter(
      (text) => 
        !translationCache.has(text) && 
        !translations.has(text) && 
        isLikelyEnglish(text)
    );

    if (toTranslate.length === 0) return;

    // Mark all as loading
    setLoading((prev) => {
      const next = new Set(prev);
      toTranslate.forEach((t) => next.add(t));
      return next;
    });

    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { texts: toTranslate, targetLanguage: 'pt-BR' },
      });

      if (error) throw error;

      const results = data?.translations || {};
      
      setTranslations((prev) => {
        const next = new Map(prev);
        Object.entries(results).forEach(([original, translated]) => {
          if (translated) {
            translationCache.set(original, translated as string);
            next.set(original, translated as string);
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Batch translation error:', error);
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        toTranslate.forEach((t) => next.delete(t));
        return next;
      });
    }
  }, [translations]);

  const getTranslation = useCallback((text: string): string | null => {
    return translationCache.get(text) || translations.get(text) || null;
  }, [translations]);

  const isTranslating = useCallback((text: string): boolean => {
    return loading.has(text);
  }, [loading]);

  const needsTranslation = useCallback((text: string): boolean => {
    return isLikelyEnglish(text);
  }, []);

  return {
    translateText,
    translateBatch,
    getTranslation,
    isTranslating,
    needsTranslation,
    isLikelyEnglish,
  };
}
