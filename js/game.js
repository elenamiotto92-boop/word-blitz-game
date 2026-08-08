// ==========================================
// CONFIGURAZIONE E VARIABILI GLOBALI
// ==========================================
const MAX_WORDS = 3;
const MAX_LIGHTNINGS = 40;
const HAND_SIZE = 7;

let gameMode = 'VICINI'; 
let lastPlayerId = null; 
let lastPlayedWord = "";

let currentCategory = "";
let wordsPlayedOnCard = 0;
let playerHand = [];
let playerLightnings = 0;
const bot = typeof BotPlayer !== 'undefined' ? new BotPlayer() : null;

const LETTERS_POOL = [
  { letter: 'A', lightnings: 1 }, { letter: 'B', lightnings: 2 }, { letter: 'C', lightnings: 1 }, { letter: 'D', lightnings: 2 },
  { letter: 'E', lightnings: 1 }, { letter: 'F', lightnings: 2 }, { letter: 'G', lightnings: 2 }, { letter: 'H', lightnings: 3 },
  { letter: 'I', lightnings: 1 }, { letter: 'J', lightnings: 3 }, { letter: 'K', lightnings: 3 }, { letter: 'L', lightnings: 1 },
  { letter: 'M', lightnings: 1 }, { letter: 'N', lightnings: 1 }, { letter: 'O', lightnings: 1 }, { letter: 'P', lightnings: 1 },
  { letter: 'Q', lightnings: 3 }, { letter: 'R', lightnings: 1 }, { letter: 'S', lightnings: 1 }, { letter: 'T', lightnings: 1 },
  { letter: 'U', lightnings: 2 }, { letter: 'V', lightnings: 2 }, { letter: 'W', lightnings: 3 }, { letter: 'X', lightnings: 3 },
  { letter: 'Y', lightnings: 3 }, { letter: 'Z', lightnings: 3 }
];

// ==========================================
// SCELTA MODALITÀ E SCHERMATA INIZIALE
// ==========================================
function selectGameMode(mode) {
  gameMode = mode;
  const setupBox = document.getElementById('multiplayer-setup');
  if (setupBox) setupBox.style.display = 'block';

  const labelEl = document.getElementById('selected-mode-label');
  if (labelEl) {
    if (mode === 'VICINI') {
      labelEl.innerText = "📍 Modalità: SIAMO VICINI (Tocca la carta e parla)";
    } else {
      labelEl.innerText = "🌍 Modalità: SIAMO LONTANI (Scrivi e verifica)";
    }
  }
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

function startSinglePlayer() {
  if (typeof DICTIONARY === 'undefined') return alert("Dizionario non caricato!");
  startGameScreen();
  pickRandomCategory();
  playerHand = drawHand();
  if (bot) bot.hand = drawHand();
  nextCategoryCard();
}

function startMultiplayerGame(initialCategory) {
  startGameScreen();
  if (initialCategory) {
    currentCategory = initialCategory;
  } else {
    pickRandomCategory();
  }
  playerHand = drawHand();
  nextCategoryCard();
}

// ==========================================
// GESTIONE MANO E CATEGORIE
// ==========================================
function drawHand() {
  const hand = [];
  if (!currentCategory && typeof pickRandomCategory === 'function') {
    pickRandomCategory();
  }

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
    const validPool = LETTERS_POOL.filter(card => {
      if (!hasCategoryRestriction) return true;
      const maxAvailable = letterCounts[card.letter] || 0;
      const alreadyInHand = hand.filter(c => c.letter === card.letter).length;
      return alreadyInHand < maxAvailable;
    });

    const poolToUse = validPool.length > 0 ? validPool : LETTERS_POOL;
    const randomCard = poolToUse[Math.floor(Math.random() * poolToUse.length)];
    hand.push({ ...randomCard, id: Math.random() });
  }
  return hand;
}

function nextCategoryCard() {
  wordsPlayedOnCard = 0;
  const playedEl = document.getElementById('played-words');
  if (playedEl) playedEl.innerHTML = "";
  
  const countEl = document.getElementById('words-count');
  if (countEl) countEl.innerText = wordsPlayedOnCard;
  
  const centerStage = document.getElementById('center-stage');
  if (centerStage) centerStage.style.display = 'none';
  
  if (!currentCategory) pickRandomCategory();
  
  const catEl = document.getElementById('current-category');
  if (catEl) catEl.innerText = currentCategory;
  
  renderHand();

  if (!connection || !connection.open) {
    if (bot) bot.startThinking(currentCategory, handleBotPlay);
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
    
    if (gameMode === 'VICINI') {
      cardDiv.onclick = () => playCardLocal(index);
    }
    handEl.appendChild(cardDiv);
  });

  const inputWrapper = document.querySelector('.input-wrapper');
  if (inputWrapper) {
    inputWrapper.style.display = gameMode === 'VICINI' ? 'none' : 'flex';
  }
}

// ==========================================
// REGISTRAZIONE PAROLE E CAMBIO CATEGORIA (A 3 PAROLE)
// ==========================================
function registerWordPlay(word, isPlayer = true, customName = null) {
  wordsPlayedOnCard++;
  const countEl = document.getElementById('words-count');
  if (countEl) countEl.innerText = wordsPlayedOnCard;

  const chip = document.createElement('div');
  chip.className = 'played-chip';
  
  let label = isPlayer ? "TU" : "AVVERSARIO";
  if (customName) label = customName;

  chip.innerText = `${word.toUpperCase()} (${label})`;
  
  const playedWordsEl = document.getElementById('played-words');
  if (playedWordsEl) playedWordsEl.appendChild(chip);

  // OGNI 3 PAROLE CAMBIA SOLO LA CATEGORIA (Le carte in mano restano invariate!)
  if (wordsPlayedOnCard >= MAX_WORDS) {
    if (!connection || !connection.open) {
      if (bot) bot.stopThinking();
      setTimeout(() => {
        pickRandomCategory();
        nextCategoryCard();
      }, 1200);
    } else {
      if (isPlayer) {
        setTimeout(() => {
          pickRandomCategory();
          sendData({ type: 'CHANGE_CATEGORY_ONLY', category: currentCategory });
          nextCategoryCard();
        }, 1200);
      }
    }
  }
}

// ==========================================
// AZIONI DI GIOCO (VICINI E LONTANI)
// ==========================================
function playCardLocal(cardIndex) {
  if (wordsPlayedOnCard >= MAX_WORDS) return;

  const card = playerHand[cardIndex];
  if (!card) return;

  playerHand.splice(cardIndex, 1);
  renderHand();

  showCenterStage(card.letter, "Hai giocato la lettera: DICI LA PAROLA A VOCE!");
  lastPlayerId = "TU";

  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'PLAY_CARD_STAGE', letter: card.letter });
  }

  registerWordPlay(`[LETTERA ${card.letter}]`, true);
  
  const countEl = document.getElementById('words-count');
  if (countEl) countEl.innerText = wordsPlayedOnCard;

  // CONTROLLO SE HAI FINITO TUTTE LE CARTE
  if (playerHand.length === 0) {
    alert("Hai svuotato la mano per primo! Fine della manche.");
    if (typeof sendData === 'function' && connection && connection.open) {
      sendData({ type: 'ROUND_OVER' });
    }
    triggerRoundEnd(true);
  }
}

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

  playerHand.splice(cardIndex, 1);
  renderHand();

  lastPlayedWord = typedWord;
  showCenterStage(firstLetter, `Parola giocata: "${typedWord}"`);
  lastPlayerId = "TU";

  registerWordPlay(typedWord, true);

  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'PLAY_WORD_REMOTE', word: typedWord, letter: firstLetter });
  }

  // CONTROLLO SE HAI FINITO TUTTE LE CARTE
  if (playerHand.length === 0) {
    if (!connection || !connection.open) {
      if (bot) bot.stopThinking();
    }
    alert("HAI SVUOTATO LA MANO! Fine della manche.");
    if (typeof sendData === 'function' && connection && connection.open) {
      sendData({ type: 'ROUND_OVER' });
    }
    triggerRoundEnd(true);
  }
}

function showCenterStage(letter, infoText) {
  const stage = document.getElementById('center-stage');
  const zoomedCard = document.getElementById('zoomed-card');
  const infoEl = document.getElementById('last-play-info');
  const googleBtn = document.getElementById('btn-google-check');

  if (stage) stage.style.display = 'block';
  if (zoomedCard) zoomedCard.innerText = letter;
  if (infoEl) infoEl.innerText = infoText;

  if (googleBtn) {
    if (gameMode === 'LONTANI' && lastPlayedWord) {
      googleBtn.style.display = 'inline-block';
      googleBtn.href = `https://www.google.com/search?q=significato+${encodeURIComponent(lastPlayedWord)}`;
    } else {
      googleBtn.style.display = 'none';
    }
  }
}

function contestLastPlay() {
  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'CONTEST_PLAY' });
  }

  if (lastPlayerId === "TU") {
    assignPenaltyCard("Contestazione accettata!");
  } else {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) errorMsg.innerText = "Hai contestato! L'avversario pesca +1 carta.";
  }
}

function changeCategoryWithPenalty() {
  const penaltyCardPlayer = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
  playerHand.push({ ...penaltyCardPlayer, id: Math.random() });
  renderHand();

  if (!connection || !connection.open) {
    if (bot && bot.hand) {
      const penaltyCardBot = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      bot.hand.push({ ...penaltyCardBot, id: Math.random() });
      bot.stopThinking();
    }
  } else if (typeof sendData === 'function') {
    sendData({ type: 'PENALTY_CARD_BOTH' });
  }

  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) errorMsg.innerText = "Categoria cambiata! +1 carta a testa.";

  pickRandomCategory();
  if (typeof isHost !== 'undefined' && isHost && connection && connection.open) {
    sendData({ type: 'CHANGE_CATEGORY_ONLY', category: currentCategory });
  }

  nextCategoryCard();
}

function handleBotPlay(card, word) {
  if (wordsPlayedOnCard >= MAX_WORDS) return;
  bot.hand = bot.hand.filter(c => c.id !== card.id);
  registerWordPlay(word, false);

  if (bot.hand.length === 0) {
    bot.stopThinking();
    setTimeout(() => {
      alert("Il Bot ha svuotato la mano! Fine della manche.");
      triggerRoundEnd(false); // Il bot ha chiuso, tu prendi i fulmini
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

// ==========================================
// FINE MANCHE E CALCOLO FULMINI
// ==========================================
function triggerRoundEnd(iClosedFirst) {
  if (iClosedFirst) {
    // Tu hai chiuso per primo -> 0 fulmini per te.
    // Se siamo in singolo contro il bot, calcoliamo i fulmini del bot:
    if (!connection || !connection.open) {
      if (bot && bot.hand) {
        let botPenalties = 0;
        bot.hand.forEach(c => botPenalties += c.lightnings);
        bot.lightnings += botPenalties;
      }
    }
  } else {
    // L'avversario ha chiuso per primo -> tu prendi i fulmini delle tue carte rimanenti in mano
    let myPenalties = 0;
    playerHand.forEach(c => myPenalties += c.lightnings);
    playerLightnings += myPenalties;
  }

// Aggiorna la grafica dei fulmini
  const playerLightningsEl = document.getElementById('player-lightnings');
  if (playerLightningsEl) playerLightningsEl.innerText = playerLightnings;
  
  const botLightningsEl = document.getElementById('bot-lightnings');
  if (botLightningsEl) botLightningsEl.innerText = bot.lightnings || 0;

  // ⚡ INVIA I TUOI FULMINI AGGIORNATI ALL'AVVERSARIO VIA RETE
  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'UPDATE_LIGHTNINGS', lightnings: playerLightnings });
  }
  // Controllo fine partita (40 fulmini)
  if (playerLightnings >= MAX_LIGHTNINGS || (bot && bot.lightnings >= MAX_LIGHTNINGS)) {
    alert("FINE PARTITA - 40 FULMINI RAGGIUNTI!");
    location.reload();
    return;
  }

  // Distribuzione di 7 CARTE NUOVE TOTALI a testa
  alert("Nuova manche! Distribuite 7 nuove carte a tutti.");
  playerHand = drawHand();
  if (!connection || !connection.open) {
    if (bot) bot.hand = drawHand();
  }

  // Cambio categoria per la nuova manche
  pickRandomCategory();
  nextCategoryCard();
}

// ==========================================
// COMANDI VOCALI (MICROFONO)
// ==========================================
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Comandi vocali non supportati dal browser.");
    return;
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

function pickRandomCategory() {
  if (typeof DICTIONARY === 'undefined') return;
  const categories = Object.keys(DICTIONARY);
  currentCategory = categories[Math.floor(Math.random() * categories.length)];
}
