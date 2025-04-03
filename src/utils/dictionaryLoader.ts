import translate from 'translate';

// Define the Dictionary type
export type Dictionary = Record<string, string>;

// Dictionary for common words, expand as needed
const commonWordsDictionary: Dictionary = {
  "the": "o/a",
  "to": "para",
  "and": "e",
  "a": "um/uma",
  "in": "em",
  "is": "é",
  "it": "isto",
  "you": "você",
  "that": "aquele/aquela",
  "he": "ele",
  "was": "era/foi",
  "for": "para",
  "on": "em/sobre",
  "are": "são/estão",
  "with": "com",
  "as": "como",
  "I": "eu",
  "his": "dele",
  "they": "eles/elas",
  "be": "ser/estar",
  "at": "em/a",
  "one": "um",
  "have": "ter",
  "this": "isto/este",
  "from": "de",
  "by": "por",
  "hot": "quente",
  "word": "palavra",
  "but": "mas",
  "what": "o que",
  "some": "alguns",
  "can": "poder",
  "out": "fora",
  "other": "outro",
  "were": "eram/estavam",
  "all": "todos",
  "there": "lá",
  "when": "quando",
  "up": "para cima",
  "use": "usar",
  "your": "seu/sua",
  "how": "como",
  "said": "disse",
  "an": "um/uma",
  "each": "cada",
  "she": "ela",
  "which": "qual",
  "do": "fazer",
  "their": "deles/delas",
  "time": "tempo",
  "if": "se",
  "will": "irá",
  "way": "caminho",
  "about": "sobre",
  "many": "muitos",
  "then": "então",
  "them": "eles/elas",
  "write": "escrever",
  "would": "iria",
  "like": "como/gostar",
  "so": "então/tão",
  "these": "estes/estas",
  "her": "dela",
  "long": "longo",
  "make": "fazer",
  "thing": "coisa",
  "see": "ver",
  "him": "ele",
  "two": "dois",
  "has": "tem",
  "look": "olhar",
  "more": "mais",
  "day": "dia",
  "could": "poderia",
  "go": "ir",
  "come": "vir",
  "did": "fez",
  "number": "número",
  "sound": "som",
  "no": "não",
  "most": "maioria",
  "people": "pessoas",
  "my": "meu/minha",
  "over": "sobre",
  "know": "saber",
  "water": "água",
  "than": "do que",
  "call": "chamar",
  "first": "primeiro",
  "who": "quem",
  "may": "pode",
  "down": "para baixo",
  "side": "lado",
  "been": "sido",
  "now": "agora",
  "find": "encontrar",
  "any": "qualquer",
  "new": "novo",
  "work": "trabalho",
  "part": "parte",
  "take": "pegar",
  "get": "obter",
  "place": "lugar",
  "made": "feito",
  "live": "viver",
  "where": "onde",
  "after": "depois",
  "back": "voltar",
  "little": "pouco",
  "only": "apenas",
  "round": "redondo",
  "man": "homem",
  "year": "ano",
  "came": "veio",
  "show": "mostrar",
  "every": "cada",
  "good": "bom",
  "me": "me/mim",
  "give": "dar",
  "our": "nosso",
  "under": "sob",
  "name": "nome",
  "very": "muito",
  "through": "através",
  "just": "apenas",
  "form": "forma",
  "sentence": "frase",
  "great": "grande",
  "think": "pensar",
  "say": "dizer",
  "help": "ajuda",
  "low": "baixo",
  "line": "linha",
  "differ": "diferir",
  "turn": "virar",
  "cause": "causa",
  "much": "muito",
  "mean": "significar",
  "before": "antes",
  "move": "mover",
  "right": "direito",
  "boy": "menino",
  "old": "velho",
  "too": "também",
  "same": "mesmo",
  "tell": "contar",
  "does": "faz",
  "set": "conjunto",
  "three": "três",
  "want": "querer",
  "air": "ar",
  "well": "bem",
  "also": "também",
  "play": "jogar",
  "small": "pequeno",
  "end": "fim",
  "put": "colocar",
  "home": "casa",
  "read": "ler",
  "hand": "mão",
  "port": "porto",
  "large": "grande",
  "spell": "soletrar",
  "add": "adicionar",
  "even": "mesmo",
  "land": "terra",
  "here": "aqui",
  "must": "deve",
  "big": "grande",
  "high": "alto",
  "such": "tal",
  "follow": "seguir",
  "act": "agir",
  "why": "por que",
  "ask": "perguntar",
  "men": "homens",
  "change": "mudar",
  "went": "foi",
  "light": "luz",
  "kind": "tipo",
  "off": "desligado",
  "need": "precisar",
  "house": "casa",
  "picture": "foto",
  "try": "tentar",
  "us": "nós",
  "again": "novamente",
  "animal": "animal",
  "point": "ponto",
  "mother": "mãe",
  "world": "mundo",
  "near": "perto",
  "build": "construir",
  "self": "auto",
  "earth": "terra",
  "father": "pai"
};

// Function to clean a word (remove punctuation, etc.)
export const cleanWord = (word: string): string => {
  return word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
};

// Initialize the translation service
try {
  // @ts-ignore - the translate library typings don't include these properties
  translate.engine = 'google';
  // @ts-ignore
  translate.key = ''; // No key needed for free usage
} catch (error) {
  console.error('Error initializing translation service:', error);
}

let translating = false;

// Load dictionary (simplified for now, just returns the common words)
export const loadDictionary = async (): Promise<Dictionary> => {
  return Promise.resolve(commonWordsDictionary);
};

// Function to get translation for a word
export const translateWord = async (word: string): Promise<string> => {
  // Check if the word is in our common dictionary first
  const lowerWord = word.toLowerCase();
  if (commonWordsDictionary[lowerWord]) {
    return commonWordsDictionary[lowerWord];
  }
  
  // Try to get a translation from Google Translate
  try {
    translating = true;
    const options = { from: 'en', to: 'pt' };
    const translation = await translate(word, options);
    translating = false;
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    translating = false;
    return "Translation not available";
  }
};

// Export a function to check if translation is in progress
export const isTranslating = () => translating;
