const MAX_WORDS = 3;
const MAX_LIGHTNINGS = 40;
const HAND_SIZE = 7;

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

function pickRandomCategory() {
  if (typeof DICTIONARY === 'undefined') return;
  const categories = Object.keys(DICTIONARY);
  currentCategory = categories[Math.floor(Math.random() * categories.length)];
}

function drawHand() {
  const hand = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    const randomCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
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
  playerHand.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerHTML = `${card.letter}<span class="lightning">⚡ ${card.lightnings}</span>`;
    handEl.appendChild(cardDiv);
  });
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
