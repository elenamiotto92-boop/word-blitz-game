class BotPlayer {
  constructor() {
    this.name = "Bot IA";
    this.hand = [];
    this.lightnings = 0;
    this.timer = null;
  }

  // Riceve la nuova categoria e calcola la prossima giocata
  startThinking(currentCategory, onBotPlay) {
    clearTimeout(this.timer);

    // Trova le carte che il Bot ha in mano valide per questa categoria
    const categoryDict = DICTIONARY[currentCategory];
    if (!categoryDict) return;

    const validCards = this.hand.filter(card => {
      const list = categoryDict[card.letter];
      return list && list.length > 0;
    });

    if (validCards.length === 0) return; // Nessuna carta utile, il bot non gioca

    // Scegli a caso una carta valida tra quelle possedute
    const chosenCard = validCards[Math.floor(Math.random() * validCards.length)];
    const wordList = categoryDict[chosenCard.letter];
    const chosenWord = wordList[Math.floor(Math.random() * wordList.length)];

    // Simula i riflessi: gioca tra i 2.5 e i 4.5 secondi
    const delay = Math.floor(Math.random() * 2000) + 2500;

    this.timer = setTimeout(() => {
      onBotPlay(chosenCard, chosenWord);
    }, delay);
  }

  stopThinking() {
    clearTimeout(this.timer);
  }
}
