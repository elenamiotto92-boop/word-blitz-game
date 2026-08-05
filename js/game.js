const MAX_WORDS = 3;
const MAX_LIGHTNINGS = 40;
const HAND_SIZE = 7;

let currentCategory = "";
let wordsPlayedOnCard = 0;
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

// Avvio del gioco
function initGame() {
  playerHand = drawHand();
  bot.hand = drawHand();
  nextCategoryCard();
}

// Pesca mano di 7 carte
function drawHand() {
  const hand = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    const randomCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
    hand.push({ ...randomCard, id: Math.random() });
  }
  return hand;
}

// Gira una NUOVA CARTA CATEGORIA (dopo 3 parole o a inizio manche)
function nextCategoryCard() {
  wordsPlayedOnCard = 0;
  document.getElementById('played-words').innerHTML = "";
  document.getElementById('words-count').innerText = wordsPlayedOnCard;

  const categories = Object.keys(DICTIONARY);
  currentCategory = categories[Math.floor(Math.random() * categories.length)];
  document.getElementById('current-category').innerText = currentCategory;

  renderHand();
  bot.startThinking(currentCategory, handleBotPlay);
}

// Mostra le carte del giocatore a schermo
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

// Registra la parola giocata sul tavolo
function registerWordPlay(word, isPlayer = true) {
  wordsPlayedOnCard++;
  document.getElementById('words-count').innerText = wordsPlayedOnCard;

  const chip = document.createElement('div');
  chip.className = 'played-chip';
  chip.innerText = `${word.toUpperCase()} (${isPlayer ? 'TU' : 'BOT'})`;
  document.getElementById('played-words').appendChild(chip);

  // REGOLA DELLE 3 PAROLE: appena si arriva a 3, si cambia SUBITO categoria!
  if (wordsPlayedOnCard >= MAX_WORDS) {
    bot.stopThinking();
    setTimeout(() => {
      nextCategoryCard();
    }, 1200);
  }
}

// Giocata del Bot
function handleBotPlay(card, word) {
  if (wordsPlayedOnCard >= MAX_WORDS) return;

  bot.hand = bot.hand.filter(c => c.id !== card.id);
  registerWordPlay(word, false);

  // Se il bot resta senza carte, vince la manche!
  if (bot.hand.length === 0) {
    bot.stopThinking();
    setTimeout(() => {
      alert("Il Bot ha svuotato la mano! Fine della manche.");
      endRoundAndCountLightnings();
    }, 500);
  }
}

// Penalità: assegna una carta in mano se la parola è errata
function assignPenaltyCard(reasonText) {
  const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
  playerHand.push({ ...penaltyCard, id: Math.random() });
  renderHand();
  
  const errorMsg = document.getElementById('error-msg');
  errorMsg.innerText = `${reasonText} PENALITÀ: hai ricevuto una carta ${penaltyCard.letter}!`;
}

// Gestione input parola del giocatore
const wordInput = document.getElementById('word-input');
const errorMsg = document.getElementById('error-msg');

wordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const typedWord = wordInput.value.trim().toUpperCase();
    wordInput.value = "";
    errorMsg.innerText = "";

    if (wordsPlayedOnCard >= MAX_WORDS) return;

    // 1. Controllo possesso lettera in mano
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

    // 3. Giocata valida: rimuove la carta e registra parola
    playerHand.splice(cardIndex, 1);
    renderHand();
    registerWordPlay(typedWord, true);

    // Se resti con 0 carte in mano, vinci la manche!
    if (playerHand.length === 0) {
      bot.stopThinking();
      setTimeout(() => {
        alert("HAI SVUOTATO LA MANO! Fine della manche.");
        endRoundAndCountLightnings();
      }, 500);
    }
  }
});

// Fine Manche: conta i fulmini delle carte rimaste in mano e controlla i 40 fulmini totali
function endRoundAndCountLightnings() {
  playerHand.forEach(c => playerLightnings += c.lightnings);
  bot.hand.forEach(c => bot.lightnings += c.lightnings);

  document.getElementById('player-lightnings').innerText = playerLightnings;
  document.getElementById('bot-lightnings').innerText = bot.lightnings;

  // Eliminazione a 40 fulmini
  if (playerLightnings >= MAX_LIGHTNINGS || bot.lightnings >= MAX_LIGHTNINGS) {
    const winner = playerLightnings < bot.lightnings ? "HAI VINTO LA PARTITA!" : "HA VINTO IL BOT!";
    alert(`ELIMINAZIONE - RAGGIUNTI I 40 FULMINI!\n${winner}`);
    location.reload();
  } else {
    // Si ricomincia una nuova manche distribuendo 7 nuove carte a testa
    playerHand = drawHand();
    bot.hand = drawHand();
    nextCategoryCard();
  }
}
// Funzione per attivare il riconoscimento vocale
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Il tuo browser non supporta i comandi vocali. Usa la tastiera!");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'it-IT'; // Imposta la lingua italiana
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const micButton = document.getElementById('btn-mic');
  micButton.style.background = '#f1c40f'; // Giallo = in ascolto
  document.getElementById('error-msg').innerText = "🎤 In ascolto... Parla!";

  recognition.start();

  recognition.onresult = (event) => {
    const spokenWord = event.results[0][0].transcript.trim().toUpperCase();
    micButton.style.background = '#e74c3c'; // Torna rosso
    document.getElementById('error-msg').innerText = "";

    // Prendi solo la prima parola pronunciata (se dicono una frase)
    const firstWord = spokenWord.split(" ")[0];
    
    // Inserisci la parola nel flusso di gioco come se fosse stata digitata
    processPlayerWord(firstWord);
  };

  recognition.onerror = (event) => {
    micButton.style.background = '#e74c3c';
    document.getElementById('error-msg').innerText = "Non ho capito bene, riprova!";
  };

  recognition.onspeechend = () => {
    recognition.stop();
    micButton.style.background = '#e74c3c';
  };
}
window.onload = initGame;
