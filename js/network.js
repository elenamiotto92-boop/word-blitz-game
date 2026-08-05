let peer = null;
let connection = null;
let isHost = false;

// 1. L'HOST CREA LA STANZA
function createRoom() {
  isHost = true;
  // Genera un ID casuale breve
  const shortId = "blitz-" + Math.floor(1000 + Math.random() * 9000);
  
  peer = new Peer(shortId);

  peer.on('open', (id) => {
    document.getElementById('connection-status').innerText = `Stanza creata! Codice da dare all'amico: ${id}`;
  });

  // Quando l'amico si collega
  peer.on('connection', (conn) => {
    connection = conn;
    document.getElementById('connection-status').innerText = "Amico connesso! La partita inizia.";
    setupDataListener();
    
    // L'Host invia all'amico la prima categoria
    sendData({ type: 'START_GAME', category: currentCategory });
  });
}

// 2. L'AMICO SI UNISCE ALLA STANZA
function joinRoom() {
  isHost = false;
  const targetId = document.getElementById('room-code-input').value.trim();
  if (!targetId) return alert("Inserisci un codice stanza!");

  peer = new Peer();

  peer.on('open', () => {
    connection = peer.connect(targetId);
    
    connection.on('open', () => {
      document.getElementById('connection-status').innerText = `Connesso alla stanza ${targetId}!`;
      setupDataListener();
    });
  });
}

// 3. ASCOLTO MESSAGGI IN TEMPO REALE
function setupDataListener() {
  connection.on('data', (data) => {
    console.log("Dati ricevuti:", data);

    // Se l'amico gioca una parola
    if (data.type === 'PLAY_WORD') {
      // Viene mostrata a schermo come parola giocata
      registerWordPlay(data.word, false, "AMICO");
    }

    // Se l'Host cambia categoria o inizia la manche
    if (data.type === 'CHANGE_CATEGORY' && !isHost) {
      currentCategory = data.category;
      wordsPlayedOnCard = 0;
      document.getElementById('current-category').innerText = currentCategory;
      document.getElementById('played-words').innerHTML = "";
      document.getElementById('words-count').innerText = "0";
    }
  });
}

// 4. FUNZIONE PER INVIARE DATI ALL'ALTRO GIOCATORE
function sendData(payload) {
  if (connection && connection.open) {
    connection.send(payload);
  }
}
