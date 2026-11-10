const MAX_WORDS = 3;
const MAX_LIGHTNINGS = 40;
const HAND_SIZE = 7;

let gameMode = 'VICINI'; 
let lastPlayerId = null; 
let lastPlayedWord = "";

let currentCategory = "";
let availableCategories = [];
let wordsPlayedOnCard = 0;
let playerHand = [];
let playerLightnings = 0;
const bot = typeof BotPlayer !== 'undefined' ? new BotPlayer() : null;

const LETTERS_POOL = [
  { letter: 'A', lightnings: 2 }, { letter: 'B', lightnings: 2 }, { letter: 'C', lightnings: 1 }, { letter: 'D', lightnings: 2 },
  { letter: 'E', lightnings: 1 }, { letter: 'F', lightnings: 2 }, { letter: 'G', lightnings: 2 }, { letter: 'H', lightnings: 3 },
  { letter: 'I', lightnings: 1 }, { letter: 'J', lightnings: 3 }, { letter: 'K', lightnings: 3 }, { letter: 'L', lightnings: 1 },
  { letter: 'M', lightnings: 2 }, { letter: 'N', lightnings: 1 }, { letter: 'O', lightnings: 1 }, { letter: 'P', lightnings: 1 },
  { letter: 'Q', lightnings: 3 }, { letter: 'R', lightnings: 1 }, { letter: 'S', lightnings: 1 }, { letter: 'T', lightnings: 1 },
  { letter: 'U', lightnings: 2 }, { letter: 'V', lightnings: 2 }, { letter: 'W', lightnings: 3 }, { letter: 'X', lightnings: 3 },
  { letter: 'Y', lightnings: 3 }, { letter: 'Z', lightnings: 3 }
];

// --- GESTIONE E SINCRONIZZAZIONE CATEGORIE UNIFICATA ---
function syncCategory(newCategory) {
  currentCategory = newCategory;
  window.currentCategory = newCategory;
  
  if (typeof DICTIONARY !== 'undefined') {
    if (!availableCategories || availableCategories.length === 0) {
      availableCategories = Object.keys(DICTIONARY);
    }
    const index = availableCategories.indexOf(newCategory);
    if (index !== -1) {
      availableCategories.splice(index, 1);
    }
  }
}

function pickRandomCategory() {
  if (typeof DICTIONARY === 'undefined') return;
  if (!availableCategories || availableCategories.length === 0) {
    availableCategories = Object.keys(DICTIONARY);
  }
  const randomIndex = Math.floor(Math.random() * availableCategories.length);
  syncCategory(availableCategories[randomIndex]);
}

// --- LOGICA DI GIOCO ---
function selectGameMode(mode) {
  gameMode = mode;
  const setupBox = document.getElementById('multiplayer-setup');
  if (setupBox) setupBox.style.display = 'block';

  const labelEl = document.getElementById('selected-mode-label');
  if (labelEl) {
    if (mode === 'VICINI') {
      labelEl.innerText = "📍 Modalità: SIAMO VICINI (Tocca la carta e parla)";
    } else {
      labelEl.innerText = "🌍 Modalità Lontani: Nessun correttore o T9 attivo. Scrivi liberamente la tua parola: verrà accettata dal sistema, ma attenzione! Il tuo avversario potrà verificarla con il tasto Google e contestarla se è errata o fuori tema, facendoti pescare una carta di penalità.";
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
// Aggiungi dentro startGameScreen() dopo l'event listener della tastiera:
wordInput.addEventListener('focus', () => {
  setTimeout(() => {
    wordInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
});
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
    syncCategory(initialCategory);
  } else {
    pickRandomCategory();
  }
  playerHand = drawHand();
  nextCategoryCard();
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

  if (wordsPlayedOnCard >= MAX_WORDS) {
    if (!connection || !connection.open) {
      if (bot) bot.stopThinking();
      setTimeout(() => {
        pickRandomCategory();
        nextCategoryCard();
      }, 4000);
    } else {
      if (isPlayer) {
        setTimeout(() => {
          pickRandomCategory();
          sendData({ type: 'CHANGE_CATEGORY_ONLY', category: currentCategory });
          nextCategoryCard();
        }, 4000);
      }
    }
  }
}

function playCardLocal(cardIndex) {
  if (wordsPlayedOnCard >= MAX_WORDS) return;

  const card = playerHand[cardIndex];
  if (!card) return;

  playerHand.splice(cardIndex, 1);
  renderHand();

  lastPlayedWord = card.letter;
  showCenterStage(card.letter, "Hai giocato la lettera:"); 
  lastPlayerId = "TU";

  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'PLAY_CARD_STAGE', letter: card.letter });
  }

  registerWordPlay(`[LETTERA ${card.letter}]`, true);
  
  if (playerHand.length === 0) {
    alert("Hai svuotato la mano per primo! Fine della manche.");
    pickRandomCategory();
    if (typeof sendData === 'function' && connection && connection.open) {
      sendData({ type: 'ROUND_OVER', category: currentCategory, lightnings: playerLightnings });
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

  if (playerHand.length === 0) {
    if (!connection || !connection.open) {
      if (bot) bot.stopThinking();
    }
    alert("HAI SVUOTATO LA MANO! Fine della manche.");
    pickRandomCategory();
    if (typeof sendData === 'function' && connection && connection.open) {
      sendData({ type: 'ROUND_OVER', category: currentCategory, lightnings: playerLightnings });
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
    if (lastPlayedWord) {
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
// Variable per il cooldown del cambio categoria
let categoryCooldownTimer = null;
let categoryCooldownRemaining = 0;

function changeCategoryWithPenalty() {
  // Blocco se il timer da 30s è ancora attivo
  if (categoryCooldownRemaining > 0) {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) errorMsg.innerText = `⏳ Attendi ancora ${categoryCooldownRemaining}s per cambiare categoria!`;
    return;
  }

  const penaltyCardPlayer = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
  playerHand.push({ ...penaltyCardPlayer, id: Math.random() });
  renderHand();

  if (!connection || !connection.open) {
    if (bot && bot.hand) {
      const penaltyCardBot = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      bot.hand.push({ ...penaltyCardBot, id: Math.random() });
      bot.stopThinking();
    }
  } 
  
  pickRandomCategory(); 
  
  if (connection && connection.open && typeof sendData === 'function') {
    sendData({ type: 'PENALTY_CARD_BOTH' });
    sendData({ type: 'CHANGE_CATEGORY_ONLY', category: currentCategory });
  }

  const errorMsg = document.getElementById('error-msg');
  if (errorMsg) errorMsg.innerText = "Categoria cambiata! +1 carta a testa.";

  nextCategoryCard();

  // Avvia il conto alla rovescia di 30 secondi
  startCategoryCooldownTimer();
}

function startCategoryCooldownTimer() {
  const btn = document.querySelector('.btn-change-cat');
  categoryCooldownRemaining = 30;
  
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
    btn.innerText = `⏳ ATTENDI ${categoryCooldownRemaining}S PER CAMBIARE`;
  }

  if (categoryCooldownTimer) clearInterval(categoryCooldownTimer);

  categoryCooldownTimer = setInterval(() => {
    categoryCooldownRemaining--;
    const currentBtn = document.querySelector('.btn-change-cat');
    
    if (categoryCooldownRemaining <= 0) {
      clearInterval(categoryCooldownTimer);
      categoryCooldownTimer = null;
      if (currentBtn) {
        currentBtn.disabled = false;
        currentBtn.style.opacity = '1';
        currentBtn.style.cursor = 'pointer';
        currentBtn.innerText = "🔄 CAMBIA CATEGORIA (+1 CARTA A TESTA)";
      }
    } else if (currentBtn) {
      currentBtn.innerText = `⏳ ATTENDI ${categoryCooldownRemaining}S PER CAMBIARE`;
    }
  }, 1000);
}
function handleBotPlay(card, word) {
  if (wordsPlayedOnCard >= MAX_WORDS) return;
  bot.hand = bot.hand.filter(c => c.id !== card.id);
  registerWordPlay(word, false);

  if (bot.hand.length === 0) {
    bot.stopThinking();
    setTimeout(() => {
      alert("Il Bot ha svuotato la mano! Fine della manche.");
      triggerRoundEnd(false); 
    }, 500);
  }
}

function assignPenaltyCard(reasonText) {
  const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
  playerHand.push({ ...penaltyCard, id: Math.random() });
  renderHand();
  triggerPenaltyEffect();
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

function drawHand() {
  const hand = [];
  if (!currentCategory && typeof pickRandomCategory === 'function') {
    pickRandomCategory();
  }

  const letterCounts = {};
  let hasCategoryRestriction = false;

  if (typeof DICTIONARY !== 'undefined' && Array.isArray(DICTIONARY[currentCategory]) && DICTIONARY[currentCategory].length > 0) {
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

function checkGameWinCondition() {
  let bScore = 0;
  const botEl = document.getElementById('bot-lightnings');
  if (botEl) {
    const match = botEl.innerText.match(/\d+/);
    bScore = match ? parseInt(match[0], 10) : 0;
  }

  if (playerLightnings >= 40) {
    showGameOverModal(false, "Hai raggiunto 40 fulmini... Peccato, ha vinto l'avversario!");
    return true;
  }

  if (bScore >= 40) {
    showGameOverModal(true, "L'avversario ha raggiunto 40 fulmini! Complimenti, hai vinto la partita!");
    return true;
  }

  return false;
}

function triggerRoundEnd(iClosedFirst, incomingCategory = null, incomingLightnings = null) {
  if (typeof bot !== 'undefined' && bot && (typeof bot.lightnings !== 'number' || isNaN(bot.lightnings))) {
    bot.lightnings = 0;
  }

  let oldLightnings = playerLightnings;

  if (iClosedFirst) {
    if (!connection || !connection.open) {
      if (typeof bot !== 'undefined' && bot && Array.isArray(bot.hand)) {
        let botPenalties = 0;
        bot.hand.forEach(c => {
          if (c && typeof c.lightnings === 'number') botPenalties += c.lightnings;
        });
        bot.lightnings += botPenalties;
      }
    }
  } else {
    let myPenalties = 0;
    if (Array.isArray(playerHand)) {
      playerHand.forEach(c => {
        if (c && typeof c.lightnings === 'number') myPenalties += c.lightnings;
      });
    }
    playerLightnings += myPenalties;

    if (incomingCategory) {
      syncCategory(incomingCategory); 
    }
  }

  if (playerLightnings > oldLightnings) {
    triggerPenaltyEffect();
  }

  const playerLightningsEl = document.getElementById('player-lightnings');
  if (playerLightningsEl) playerLightningsEl.innerText = playerLightnings;

  const botLightningsEl = document.getElementById('bot-lightnings');
  if (botLightningsEl) {
    if (incomingLightnings !== null && incomingLightnings !== undefined) {
      botLightningsEl.innerText = incomingLightnings;
    } else if (typeof bot !== 'undefined' && bot) {
      botLightningsEl.innerText = bot.lightnings;
    }
  }

  if (typeof sendData === 'function' && connection && connection.open) {
    sendData({ type: 'UPDATE_LIGHTNINGS', lightnings: playerLightnings });
  }

  if (checkGameWinCondition()) {
    return; 
  }

  alert("Nuova manche! Distribuite 7 nuove carte a tutti.");
  
  playerHand = drawHand();
  if (!connection || !connection.open) {
    if (typeof bot !== 'undefined' && bot) bot.hand = drawHand();
  }

  nextCategoryCard();
}

function showGameOverModal(isVictory, message) {
  const modal = document.getElementById('game-over-modal');
  const title = document.getElementById('modal-title');
  const text = document.getElementById('modal-message');
  
  if (modal && title && text) {
    if (isVictory) {
      title.innerText = "🏆 VITTORIA! 🏆";
      title.style.color = "#3f6212";
    } else {
      title.innerText = "💀 SCONFITTA 💀";
      title.style.color = "#b91c1c";
    }
    text.innerText = message;
    modal.style.display = 'flex';
  } else {
    alert(message);
    location.reload();
  }
}

function triggerPenaltyEffect() {
  const container = document.getElementById('game-container') || document.body;
  if (container) {
    container.classList.remove('shake-animation');
    void container.offsetWidth; 
    container.classList.add('shake-animation');
    setTimeout(() => {
      container.classList.remove('shake-animation');
    }, 400);
  }

  const lightningEl = document.getElementById('player-lightnings');
  if (lightningEl) {
    lightningEl.classList.remove('flash-warning');
    void lightningEl.offsetWidth; 
    lightningEl.classList.add('flash-warning');
    setTimeout(() => {
      lightningEl.classList.remove('flash-warning');
    }, 600);
  }
}

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
    processPlayerWord(spokenWord);
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

setInterval(() => {
  const modal = document.getElementById('game-over-modal');
  if (modal && modal.style.display === 'flex') return;

  if (playerLightnings >= 40) {
    showGameOverModal(false, "Hai raggiunto 40 fulmini... Peccato, ha vinto l'avversario!");
    return;
  }

  const botEl = document.getElementById('bot-lightnings');
  if (botEl) {
    const numeriEstratti = botEl.innerText.match(/\d+/g); 
    if (numeriEstratti) {
      const punteggioAvversario = parseInt(numeriEstratti[0], 10);
      if (punteggioAvversario >= 40) {
        showGameOverModal(true, "L'avversario ha raggiunto 40 fulmini! Complimenti, hai vinto la partita!");
      }
    }
  }
}, 500);
