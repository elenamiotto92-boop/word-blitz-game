// Dizionario integrato per categorie
const DICTIONARY = {
  "ANIMALIA": {
    "C": ["CANE", "CAVALLO", "CONIGLIO", "CANGURO", "CIGNO"],
    "G": ["GATTO", "GIRAFFA", "GABBIANO", "GELSOMINO", "GHEPARDO"],
    "L": ["LEONE", "LUPO", "LUCERTOLA", "LEOPARDO", "LAMA"],
    "S": ["SERPENTE", "SCIMMIA", "SQUALO", "SCOIATTOLO", "SALMONE"],
    "T": ["TIGRE", "TOPO", "TARTARUGA", "TORO", "TONNO"]
  },
  "CITTA EUROPEE": {
    "A": ["AMSTERDAM", "ATENE", "AMBURGO"],
    "B": ["BERLINO", "BARCELLONA", "BRUXELLES", "BOLOGNA", "BUDAPEST"],
    "L": ["LONDRA", "LIONE", "LISBONA", "LIVERPOOL"],
    "M": ["MADRID", "MILANO", "MONACO", "MANCHESTER", "MARSIGLIA"],
    "P": ["PARIGI", "PRAGA", "PALERMO", "PORTO"]
  },
  "SPORT": {
    "B": ["BASEBALL", "BASKET", "BOXE", "BADMINTON"],
    "C": ["CALCIO", "CICLISMO", "CORSA", "CANOTTAGGIO", "CRICKET"],
    "N": ["NUOTO", "NETBALL"],
    "P": ["PALLAVOLO", "PALLACANESTRO", "PALLANUOTO", "PATTINAGGIO"],
    "T": ["TENNIS", "TUFFI", "TAEKWONDO", "TRIATHLON"]
  },
  "STRUMENTI MUSICALI": {
    "C": ["CHITARRA", "CLARINETTO", "CONTRABBASSO", "CELLO"],
    "F": ["FLAUTO", "FISARMONICA", "FAGOTTO"],
    "P": ["PIANOFORTE", "PERCUSSIONI", "PICCOLO"],
    "T": ["TROMBA", "TROMBONE", "TAMBURO", "TIMPANI"],
    "V": ["VIOLINO", "VIOLA", "VIOLONCELLO", "VIBRAFONO"]
  }
};

// Funzione globale di controllo validità
function validateWord(category, word) {
  const cleanWord = word.trim().toUpperCase();
  if (!cleanWord) return false;

  const firstLetter = cleanWord.charAt(0);
  const categoryWords = DICTIONARY[category];

  if (!categoryWords || !categoryWords[firstLetter]) {
    return false;
  }

  return categoryWords[firstLetter].includes(cleanWord);
}
