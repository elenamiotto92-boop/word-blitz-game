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

// Avvia la partita in singolo contro il Bot
function startSinglePlayer() {
  startGameScreen();
  initGame();
}

// Passa dalla schermata iniziale al tavolo di gioco
function startGameScreen() {
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  
  if (typeof setupDataListener === 'function') {
    setupDataListener();
  }
}

function initGame() {
  playerHand = drawHand();
  if (typeof connection === 'undefined' || !connection) {
    bot.hand = drawHand();
  }
  
  // Seleziona subito una categoria casuale per evitare "Caricamento..."
  const categories = Object.keys(DICTIONARY);
  currentCategory = categories[Math.floor(Math.random() * categories.length)];
  
  nextCategoryCard();
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
  
  // Se non siamo l'host in multiplayer, prendiamo la categoria globale
  if (!currentCategory) {
    const categories = Object.keys(DICTIONARY);
    currentCategory = categories[Math.floor(Math.random() * categories.length)];
  }
  
  document.getElementById('current-category').innerText = currentCategory;
  renderHand();

  if (typeof isHost !== 'undefined' && isHost && typeof sendData === 'function') {
    const categories = Object.keys(DICTIONARY);
    currentCategory = categories[Math.floor(Math.random() * categories.length)];
    document.getElementById('current-category').innerText = currentCategory;
    sendData({ type: 'CHANGE_CATEGORY', category: currentCategory });
  }

  if (!connection || !connection.open) {
    bot.startThinking(currentCategory, handleBotPlay);
  }
}

function renderHand() {
  const handEl = document.getElementById('player-hand');
  handEl.innerHTML = "";
  playerHand.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerHTML = `${card.letter}<span class="lightning">⚡ ${card.lightnings}</span>`;
    handEl.appendChild(cardDiv);
  });
}

function registerWordPlay(word, isPlayer = true, customName = null) {
  wordsPlayedOnCard++;
  document.getElementById('words-count').innerText = wordsPlayedOnCard;

  const chip = document.createElement('div');
  chip.className = 'played-chip';
  
  let label = isPlayer ? "TU" : "BOT";
  if (customName) label = customName;

  chip.innerText = `${word.toUpperCase()} (${label})`;
  document.getElementById('played-words').appendChild(chip);

  if (wordsPlayedOnCard >= MAX_WORDS) {
    if (!connection || !connection.open) bot.stopThinking();
    setTimeout(() => {
      if (typeof isHost !== 'undefined' && isHost) {
        const categories = Object.keys(DICTIONARY);
        currentCategory = categories[Math.floor(Math.random() * categories.length)];
        sendData({ type: 'CHANGE_CATEGORY', category: currentCategory });
      }
      nextCategoryCard();
    }, 1200);
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
  errorMsg.innerText = `${reasonText} PENALITÀ: carta ${penaltyCard.letter}!`;
}

function submitTypedWord() {
  const wordInput = document.getElementById('word-input');
  const typedWord = wordInput.value.trim().toUpperCase();
  wordInput.value = "";
  processPlayerWord(typedWord);
}

const wordInput = document.getElementById('word-input');
if (wordInput) {
  wordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      submitTypedWord();
    }
  });
}

function processPlayerWord(typedWord) {
  const errorMsg = document.getElementById('error-msg');
  errorMsg.innerText = "";

  if (!typedWord) return;
  if (wordsPlayedOnCard >= MAX_WORDS) return;

  const firstLetter = typedWord.charAt(0);
  const cardIndex = playerHand.findIndex(card => card.letter === firstLetter);

  if (cardIndex === -1) {
    errorMsg.innerText = `Non hai la lettera "${firstLetter}" in mano!`;
    return;
  }

  if (!validateWord(currentCategory, typedWord)) {
    assignPenaltyCard(`"${typedWord}" non valida!`);
    return;
  }

  playerHand.splice(cardIndex, 1);
  renderHand();
  registerWordPlay(typedWord, true);

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

function endRoundAndCountLightnings() {
  playerHand.forEach(c => playerLightnings += c.lightnings);
  
  if (typeof bot !== 'undefined' && bot.hand) {
    bot.hand.forEach(c => bot.lightnings += c.lightnings);
  }

  document.getElementById('player-lightnings').innerText = playerLightnings;
  
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
    alert("Il tuo browser non supporta i comandi vocali.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const micButton = document.getElementById('btn-mic');
  micButton.style.background = '#f1c40f';
  document.getElementById('error-msg').innerText = "🎤 In ascolto...";

  recognition.start();

  recognition.onresult = (event) => {
    const spokenWord = event.results[0][0].transcript.trim().toUpperCase();
    micButton.style.background = '#e74c3c';
    document.getElementById('error-msg').innerText = "";

    const firstWord = spokenWord.split(" ")[0];
    processPlayerWord(firstWord);
  };

  recognition.onerror = () => {
    micButton.style.background = '#e74c3c';
    document.getElementById('error-msg').innerText = "Riprova!";
  };

  recognition.onspeechend = () => {
    recognition.stop();
    micButton.style.background = '#e74c3c';
  };
}
