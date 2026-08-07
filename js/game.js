let gameMode = 'VICINI'; // Default
let lastPlayerId = null;
let lastPlayedWord = "";

function selectGameMode(mode) {
  gameMode = mode;
  
  // Rende visibile il riquadro con "Crea Stanza", il codice e "Unisciti"
  const setupBox = document.getElementById('multiplayer-setup');
  if (setupBox) {
    setupBox.style.display = 'block';
  }

  // Aggiorna la scritta che conferma la modalità scelta
  const labelEl = document.getElementById('selected-mode-label');
  if (labelEl) {
    if (mode === 'VICINI') {
      labelEl.innerText = "📍 Modalità: SIAMO VICINI (Tocca la carta e parla)";
    } else {
      labelEl.innerText = "🌍 Modalità: SIAMO LONTANI (Scrivi e verifica)";
    }
  }
}
const MAX_WORDS = 3;
const MAX_LIGHTNINGS = 40;
const HAND_SIZE = 7;
let gameMode = 'VICINI'; // Default
let lastPlayerId = null; // Per sapere a chi dare la carta di penalità se contestato
let lastPlayedWord = "";

let currentCategory = "";
let wordsPlayedOnCard = 0;
let playerHand = [];
let playerLightnings = 0;
const bot = new BotPlayer();

const LETTERS_POOL = [
  { letter: 'A', lightnings: 1 },
  { letter: 'B', lightnings: 2 },
  { letter: 'C', lightnings: 1 },
  { letter: 'D', lightnings: 2 },
  { letter: 'E', lightnings: 1 },
  { letter: 'F', lightnings: 2 },
  { letter: 'G', lightnings: 2 },
  { letter: 'H', lightnings: 3 },
  { letter: 'I', lightnings: 1 },
  { letter: 'J', lightnings: 3 },
  { letter: 'K', lightnings: 3 },
  { letter: 'L', lightnings: 1 },
  { letter: 'M', lightnings: 1 },
  { letter: 'N', lightnings: 1 },
  { letter: 'O', lightnings: 1 },
  { letter: 'P', lightnings: 1 },
  { letter: 'Q', lightnings: 3 },
  { letter: 'R', lightnings: 1 },
  { letter: 'S', lightnings: 1 },
  { letter: 'T', lightnings: 1 },
  { letter: 'U', lightnings: 2 },
  { letter: 'V', lightnings: 2 },
  { letter: 'W', lightnings: 3 },
  { letter: 'X', lightnings: 3 },
  { letter: 'Y', lightnings: 3 },
  { letter: 'Z', lightnings: 3 }
];

function startSinglePlayer() {
  if (typeof DICTIONARY === 'undefined') {
    alert("Errore: dizionario non caricato!");
    return;
  }
  startGameScreen();
  playerHand = drawHand();
  bot.hand = drawHand();
  pickRandomCategory();
  nextCategoryCard();
}

function startGameScreen() {
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  
  const wordInput = document.getElementById('word-input');
  if (wordInput && !wordInput.dataset.listenerAttached) {
    wordInput.dataset.listenerAttached = "true";
    wordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitTypedWord();
    });
  }

  if (typeof setupDataListener === 'function') {
    setupDataListener();
  }
}

function startMultiplayerGame(initialCategory) {
  startGameScreen();
  playerHand = drawHand();
  if (initialCategory) {
    currentCategory = initialCategory;
  } else {
    pickRandomCategory();
  }
  nextCategoryCard();
}

function startSinglePlayer() {
  if (typeof DICTIONARY === 'undefined') {
    alert("Errore: dizionario non caricato!");
    return;
  }
  startGameScreen();
  pickRandomCategory(); // Seleziona prima la categoria per bilanciare le carte
  playerHand = drawHand();
  bot.hand = drawHand();
  nextCategoryCard();
}

function startMultiplayerGame(initialCategory) {
  startGameScreen();
  if (initialCategory) {
    currentCategory = initialCategory;
  } else {
    pickRandomCategory();
  }
  playerHand = drawHand(); // Pescata bilanciata in base alla categoria
  nextCategoryCard();
}

function drawHand() {
  const hand = [];
  
  // Assicurati che una categoria sia selezionata per calcolare le risposte disponibili
  if (!currentCategory && typeof pickRandomCategory === 'function') {
    pickRandomCategory();
  }

  // Mappa di quante parole iniziano con ogni lettera nella categoria corrente
  const letterCounts = {};
  let hasCategoryRestriction = false;

  if (typeof DICTIONARY !== 'undefined' && DICTIONARY[currentCategory]) {
    hasCategoryRestriction = true;
    DICTIONARY[currentCategory].forEach(word => {
      const firstChar = word.charAt(0).toUpperCase();
      letterCounts[firstChar] = (letterCounts[firstChar] || 0) + 1;
    });
  }

  for (let i = 0; i < HAND_SIZE; i++) {
    // Tieni solo lettere che hanno parole disponibili e non superano il totale di risposte per quella lettera
    const validPool = LETTERS_POOL.filter(card => {
      if (!hasCategoryRestriction) return true;
      const maxAvailable = letterCounts[card.letter] || 0;
      const alreadyInHand = hand.filter(c => c.letter === card.letter).length;
      return alreadyInHand < maxAvailable;
    });

    // Fallback di sicurezza nel caso rarissimo in cui finiscano le lettere disponibili
    const poolToUse = validPool.length > 0 ? validPool : LETTERS_POOL;
    const randomCard = poolToUse[Math.floor(Math.random() * poolToUse.length)];
    
    hand.push({ ...randomCard, id: Math.random() });
  }
  
  return hand;
}

function nextCategoryCard() {
  wordsPlayedOnCard = 0;
  document.getElementById('played-words').innerHTML = "";
  document.getElementById('words-count').innerText = wordsPlayedOnCard;
  
  if (!currentCategory) {
    pickRandomCategory();
  }
  
  document.getElementById('current-category').innerText = currentCategory;
  renderHand();

  if (typeof isHost !== 'undefined' && isHost && typeof sendData === 'function') {
    pickRandomCategory();
    document.getElementById('current-category').innerText = currentCategory;
    sendData({ type: 'CHANGE_CATEGORY', category: currentCategory });
  }

  if (!connection || !connection.open) {
    bot.startThinking(currentCategory, handleBotPlay);
  }
}

function renderHand() {
  const handEl = document.getElementById('player-hand');
  if (!handEl) return;
  handEl.innerHTML = "";
  
  playerHand.forEach((card, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = gameMode === 'VICINI' ? 'card clickable' : 'card';
    cardDiv.innerHTML = `${card.letter}<span class="lightning">⚡ ${card.lightnings}</span>`;
    
    // In modalità Vicini, cliccare la carta la lancia al centro
    if (gameMode === 'VICINI') {
      cardDiv.onclick = () => playCardLocal(index);
    }
    
    handEl.appendChild(cardDiv);
  });

  // Nascondi o mostra la casella di testo in base alla modalità
  const inputWrapper = document.querySelector('.input-wrapper');
  if (inputWrapper) {
    inputWrapper.style.display = gameMode === 'VICINI' ? 'none' : 'flex';
  }
}

function registerWordPlay(word, isPlayer = true, customName = null) {
  // Evita di registrare due volte la stessa parola se arriva via rete
  wordsPlayedOnCard++;
  document.getElementById('words-count').innerText = wordsPlayedOnCard;

  const chip = document.createElement('div');
  chip.className = 'played-chip';
  
  let label = isPlayer ? "TU" : "AVVERSARIO";
  if (customName) label = customName;

  chip.innerText = `${word.toUpperCase()} (${label})`;
  document.getElementById('played-words').appendChild(chip);
if (wordsPlayedOnCard >= MAX_WORDS) {
    if (!connection || !connection.open) bot.stopThinking();
    setTimeout(() => {
      // Genera sempre una nuova categoria localmente
      const categories = Object.keys(DICTIONARY);
      currentCategory = categories[Math.floor(Math.random() * categories.length)];
      
      // Se siamo in multiplayer e siamo l'host, invia il cambio all'avversario
      if (typeof isHost !== 'undefined' && isHost && connection && connection.open) {
        sendData({ type: 'CHANGE_CATEGORY', category: currentCategory });
      }
      
      nextCategoryCard();
    }, 1200);
  }
}
function processPlayerWord(typedWord) {
  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) errorMsg.innerText = "";

  if (!typedWord) return;
  if (wordsPlayedOnCard >= MAX_WORDS) return;

  const firstLetter = typedWord.charAt(0);
  const cardIndex = playerHand.findIndex(card => card.letter === firstLetter);

  if (cardIndex === -1) {
    if (errorMsg) errorMsg.innerText = `Non hai la lettera "${firstLetter}" in mano!`;
    return;
  }

  if (!validateWord(currentCategory, typedWord)) {
    assignPenaltyCard(`"${typedWord}" non valida!`);
    return;
  }

  // Rimuovi la carta dalla mano locale
  playerHand.splice(cardIndex, 1);
  renderHand();
  
  // Registra sul proprio schermo come "TU"
  registerWordPlay(typedWord, true);

  // Invia all'amico specificando che per lui sei l'avversario
  if (typeof sendData === 'function') {
    sendData({ type: 'PLAY_WORD', word: typedWord });
  }

  if (playerHand.length === 0) {
    if (!connection || !connection.open) bot.stopThinking();
    setTimeout(() => {
      alert("HAI SVUOTATO LA MANO! Fine della manche.");
      endRoundAndCountLightnings();
    }, 500);
  }
}
function handleBotPlay(card, word) {
  if (wordsPlayedOnCard >= MAX_WORDS) return;
  bot.hand = bot.hand.filter(c => c.id !== card.id);
  registerWordPlay(word, false);

  if (bot.hand.length === 0) {
    bot.stopThinking();
    setTimeout(() => {
      alert("Il Bot ha svuotato la mano! Fine della manche.");
      endRoundAndCountLightnings();
    }, 500);
  }
}

function assignPenaltyCard(reasonText) {
  const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
  playerHand.push({ ...penaltyCard, id: Math.random() });
  renderHand();
  
  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) errorMsg.innerText = `${reasonText} +1 carta!`;
}

function submitTypedWord() {
  const wordInput = document.getElementById('word-input');
  if (!wordInput) return;
  const typedWord = wordInput.value.trim().toUpperCase();
  wordInput.value = "";
  processPlayerWord(typedWord);
}


function endRoundAndCountLightnings() {
  playerHand.forEach(c => playerLightnings += c.lightnings);
  if (typeof bot !== 'undefined' && bot.hand) {
    bot.hand.forEach(c => bot.lightnings += c.lightnings);
  }

  const playerLightningsEl = document.getElementById('player-lightnings');
  if (playerLightningsEl) playerLightningsEl.innerText = playerLightnings;
  
  const botLightningsEl = document.getElementById('bot-lightnings');
  if (botLightningsEl && bot.lightnings) {
    botLightningsEl.innerText = bot.lightnings;
  }

  if (playerLightnings >= MAX_LIGHTNINGS || (bot.lightnings && bot.lightnings >= MAX_LIGHTNINGS)) {
    alert("FINE PARTITA - 40 FULMINI RAGGIUNTI!");
    location.reload();
  } else {
    playerHand = drawHand();
    if (!connection || !connection.open) bot.hand = drawHand();
    nextCategoryCard();
  }
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Comandi vocali non supportati dal browser.");
    return;
  }
function selectGameMode(mode) {
  gameMode = mode;
  document.getElementById('multiplayer-setup').style.display = 'block';
  const labelEl = document.getElementById('selected-mode-label');
  if (mode === 'VICINI') {
    labelEl.innerText = "📍 Modalità: SIAMO VICINI (Tocca la carta e parla)";
  } else {
    labelEl.innerText = "🌍 Modalità: SIAMO LONTANI (Scrivi e verifica)";
  }
}
  // MODALITÀ VICINI: Clicchi la carta, si ingrandisce al centro e la dici a voce
function playCardLocal(cardIndex) {
  if (wordsPlayedOnCard >= MAX_WORDS) return;

  const card = playerHand[cardIndex];
  playerHand.splice(cardIndex, 1);
  renderHand();

  showCenterStage(card.letter, "Hai giocato la lettera: DICI LA PAROLA A VOCE!");
  lastPlayerId = "TU";

  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'PLAY_CARD_STAGE', letter: card.letter });
  }

  registerWordPlay(`[LETTERA ${card.letter}]`, true);
}

// MODALITÀ LONTANI: Scrivi senza controllo IA, con link a Google per verifica
function processPlayerWord(typedWord) {
  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) errorMsg.innerText = "";
  if (!typedWord || wordsPlayedOnCard >= MAX_WORDS) return;

  const firstLetter = typedWord.charAt(0);
  const cardIndex = playerHand.findIndex(card => card.letter === firstLetter);

  if (cardIndex === -1) {
    if (errorMsg) errorMsg.innerText = `Non hai la lettera "${firstLetter}" in mano!`;
    return;
  }

  // NESSUN CONTROLLO IA: Si accetta qualsiasi parola scritta!
  playerHand.splice(cardIndex, 1);
  renderHand();

  lastPlayedWord = typedWord;
  showCenterStage(firstLetter, `Parola giocata: "${typedWord}"`);
  lastPlayerId = "TU";

  registerWordPlay(typedWord, true);

  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'PLAY_WORD_REMOTE', word: typedWord, letter: firstLetter });
  }
}

// Mostra la carta gigante al centro e il tasto Google (se in Lontani)
function showCenterStage(letter, infoText) {
  const stage = document.getElementById('center-stage');
  const zoomedCard = document.getElementById('zoomed-card');
  const infoEl = document.getElementById('last-play-info');
  const googleBtn = document.getElementById('btn-google-check');

  stage.style.display = 'block';
  zoomedCard.innerText = letter;
  infoEl.innerText = infoText;

  if (gameMode === 'LONTANI' && lastPlayedWord) {
    googleBtn.style.display = 'inline-block';
    googleBtn.href = `https://www.google.com/search?q=significato+${encodeURIComponent(lastPlayedWord)}`;
  } else {
    googleBtn.style.display = 'none';
  }
}

// CONTESTAZIONE: Chi ha giocato l'ultima carta prende +1 penalità
function contestLastPlay() {
  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'CONTEST_PLAY' });
  }

  // Se l'ultima giocata era la tua, prendi la penalità
  if (lastPlayerId === "TU") {
    assignPenaltyCard("Contestazione accettata!");
  } else {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) errorMsg.innerText = "Hai contestato! L'avversario pesca +1 carta.";
  }
}
  const recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const micButton = document.getElementById('btn-mic');
  if (micButton) micButton.style.background = '#f1c40f';
  
  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) errorMsg.innerText = "🎤 In ascolto...";

  recognition.start();

  recognition.onresult = (event) => {
    const spokenWord = event.results[0][0].transcript.trim().toUpperCase();
    if (micButton) micButton.style.background = '#e74c3c';
    if (errorMsg) errorMsg.innerText = "";
    processPlayerWord(spokenWord.split(" ")[0]);
  };

  recognition.onerror = () => {
    if (micButton) micButton.style.background = '#e74c3c';
    if (errorMsg) errorMsg.innerText = "Riprova!";
  };

  recognition.onspeechend = () => {
    recognition.stop();
    if (micButton) micButton.style.background = '#e74c3c';
  };
}
