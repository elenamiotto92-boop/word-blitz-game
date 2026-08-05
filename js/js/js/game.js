// Setup iniziale
const MAX_WORDS = 3;
const MAX_LIGHTNINGS = 40;
const HAND_SIZE = 7;

let currentCategory = "";
let wordsPlayedInRound = 0;
let playerHand = [];
let playerLightnings = 0;
const bot = new BotPlayer();

// Mazzo Lettere (con pesi di fulmini basati sulla difficoltà)
const LETTERS_POOL = [
  { letter: 'A', lightnings: 1 },
  { letter: 'B', lightnings: 2 },
  { letter: 'C', lightnings: 1 },
  { letter: 'F', lightnings: 2 },
  { letter: 'G', lightnings: 1 },
  { letter: 'L', lightnings: 1 },
  { letter: 'M', lightnings: 2 },
  { letter: 'N', lightnings: 2 },
  { letter: 'P', lightnings: 1 },
  { letter: 'S', lightnings: 1 },
  { letter: 'T', lightnings: 2 },
  { letter: 'V', lightnings: 3 }
];

// Funzioni di avvio
function initGame() {
  playerHand = drawHand();
  bot.hand = drawHand();
  nextRound();
}

function drawHand() {
  const hand = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    const randomCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
    hand.push({ ...randomCard, id: Math.random() });
  }
  return hand;
}

function nextRound() {
  wordsPlayedInRound = 0;
  document.getElementById('played-words').innerHTML = "";
  document.getElementById('words-count').innerText = wordsPlayedInRound;

  // Seleziona categoria casuale tra quelle del dizionario
  const categories = Object.keys(DICTIONARY);
  currentCategory = categories[Math.floor(Math.random() * categories.length)];
  document.getElementById('current-category').innerText = currentCategory;

  renderHand();

  // Fai partire il timer di reazione del bot
  bot.startThinking(currentCategory, handleBotPlay);
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

// Scarto carta e aggiornamento sul tavolo
function registerWordPlay(word, isPlayer = true) {
  wordsPlayedInRound++;
  document.getElementById('words-count').innerText = wordsPlayedInRound;

  const chip = document.createElement('div');
  chip.className = 'played-chip';
  chip.innerText = `${word.toUpperCase()} (${isPlayer ? 'TU' : 'BOT'})`;
  document.getElementById('played-words').appendChild(chip);

  // Controlla se la carta domanda è finita (3 parole giocate)
  if (wordsPlayedInRound >= MAX_WORDS) {
    bot.stopThinking();
    setTimeout(() => {
      checkEndRoundPenalties();
      nextRound();
    }, 1500);
  }
}

function handleBotPlay(card, word) {
  if (wordsPlayedInRound >= MAX_WORDS) return;

  // Rimuovi carta dalla mano del bot
  bot.hand = bot.hand.filter(c => c.id !== card.id);
  registerWordPlay(word, false);
}

// Gestione dell'invio parola dal giocatore umano
const wordInput = document.getElementById('word-input');
const errorMsg = document.getElementById('error-msg');

wordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const typedWord = wordInput.value.trim().toUpperCase();
    wordInput.value = "";
    errorMsg.innerText = "";

    if (wordsPlayedInRound >= MAX_WORDS) return;

    // 1. Controlla se la parola inizia con una lettera nella mano
    const firstLetter = typedWord.charAt(0);
    const cardIndex = playerHand.findIndex(card => card.letter === firstLetter);

    if (cardIndex === -1) {
      errorMsg.innerText = `Non hai nessuna carta con la lettera ${firstLetter}!`;
      return;
    }

    // 2. Convalida la parola nel dizionario
    if (!validateWord(currentCategory, typedWord)) {
      errorMsg.innerText = "Parola non valida per questa categoria!";
      return;
    }

    // 3. Parola corretta -> Gioca e scarta carta
    playerHand.splice(cardIndex, 1);
    renderHand();
    registerWordPlay(typedWord, true);

    // Se il giocatore svuota la mano, vince subito il round
    if (playerHand.length === 0) {
      bot.stopThinking();
      setTimeout(() => {
        alert("Hai svuotato la mano! Il round finisce.");
        checkEndRoundPenalties();
        nextRound();
      }, 500);
    }
  }
});

// Penalità a fine round e controllo eliminazione 40 fulmini
function checkEndRoundPenalties() {
  // Somma fulmini per carte rimaste in mano
  playerHand.forEach(c => playerLightnings += c.lightnings);
  bot.hand.forEach(c => bot.lightnings += c.lightnings);

  document.getElementById('player-lightnings').innerText = playerLightnings;
  document.getElementById('bot-lightnings').innerText = bot.lightnings;

  if (playerLightnings >= MAX_LIGHTNINGS || bot.lightnings >= MAX_LIGHTNINGS) {
    const winner = playerLightnings < bot.lightnings ? "HAI VINTO TU!" : "HA VINTO IL BOT!";
    alert(`GIOCO TERMINATO - 40 FULMINI RAGGIUNTI!\n${winner}`);
    location.reload();
  } else {
    // Pesca nuove carte per completare le mani a 7
    while (playerHand.length < HAND_SIZE) {
      const card = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      playerHand.push({ ...card, id: Math.random() });
    }
    while (bot.hand.length < HAND_SIZE) {
      const card = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      bot.hand.push({ ...card, id: Math.random() });
    }
  }
}

// Avvia tutto al caricamento pagina
window.onload = initGame;
