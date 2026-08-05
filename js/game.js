const MAX_WORDS = 3;
const MAX_LIGHTNINGS = 40;
const HAND_SIZE = 7;

let currentCategory = "";
let wordsPlayedInRound = 0;
let playerHand = [];
let playerLightnings = 0;
const bot = new BotPlayer();

// Mazzo Lettere Completo (Tutto l'alfabeto A-Z con fulmini bilanciati)
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

  const categories = Object.keys(DICTIONARY);
  currentCategory = categories[Math.floor(Math.random() * categories.length)];
  document.getElementById('current-category').innerText = currentCategory;

  renderHand();
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

function registerWordPlay(word, isPlayer = true) {
  wordsPlayedInRound++;
  document.getElementById('words-count').innerText = wordsPlayedInRound;

  const chip = document.createElement('div');
  chip.className = 'played-chip';
  chip.innerText = `${word.toUpperCase()} (${isPlayer ? 'TU' : 'BOT'})`;
  document.getElementById('played-words').appendChild(chip);

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

  bot.hand = bot.hand.filter(c => c.id !== card.id);
  registerWordPlay(word, false);
}

// Funzione di Penalità: assegna una carta casuale in mano quando la parola è errata
function assignPenaltyCard(reasonText) {
  const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
  playerHand.push({ ...penaltyCard, id: Math.random() });
  renderHand();
  
  const errorMsg = document.getElementById('error-msg');
  errorMsg.innerText = `${reasonText} PENALITÀ: hai ricevuto una carta ${penaltyCard.letter}!`;
}

// Gestione dell'invio parola
const wordInput = document.getElementById('word-input');
const errorMsg = document.getElementById('error-msg');

wordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const typedWord = wordInput.value.trim().toUpperCase();
    wordInput.value = "";
    errorMsg.innerText = "";

    if (wordsPlayedInRound >= MAX_WORDS) return;

    // 1. Controllo possesso della lettera
    const firstLetter = typedWord.charAt(0);
    const cardIndex = playerHand.findIndex(card => card.letter === firstLetter);

    if (cardIndex === -1) {
      errorMsg.innerText = `Non hai nessuna carta con la lettera "${firstLetter}" in mano!`;
      return;
    }

    // 2. Controllo validità parola nel dizionario -> SE NON VALIDA, PENALITÀ CARTA
    if (!validateWord(currentCategory, typedWord)) {
      assignPenaltyCard("Parola non valida per questa categoria!");
      return;
    }

    // 3. Giocata valida: rimuove la carta e registra la parola
    playerHand.splice(cardIndex, 1);
    renderHand();
    registerWordPlay(typedWord, true);

    // Vittoria del round se svuoti la mano
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

function checkEndRoundPenalties() {
  playerHand.forEach(c => playerLightnings += c.lightnings);
  bot.hand.forEach(c => bot.lightnings += c.lightnings);

  document.getElementById('player-lightnings').innerText = playerLightnings;
  document.getElementById('bot-lightnings').innerText = bot.lightnings;

  if (playerLightnings >= MAX_LIGHTNINGS || bot.lightnings >= MAX_LIGHTNINGS) {
    const winner = playerLightnings < bot.lightnings ? "HAI VINTO TU!" : "HA VINTO IL BOT!";
    alert(`GIOCO TERMINATO - RAGGIUNTI 40 FULMINI!\n${winner}`);
    location.reload();
  } else {
    // Ripristina la mano a 7 carte a inizio turno (se ne hai meno)
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

window.onload = initGame;
