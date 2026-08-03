// --- 1. KART DESTE SİSTEMİ ---
const colors = ['red', 'blue', 'green', 'yellow'];
const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Pas', 'Yön', '+2'];

let deck = [];
let players = [];
let discardPile = [];
let selectedPlayerCount = 0;
let currentPlayerIndex = 0;
let playDirection = 1; 

let hasDrawnThisTurn = false; 
let hasPlayedThisTurn = false; 
let hasSaidUno = false;        
let pendingSteps = 1;          

let activePenalty = 0; 
let expectedPenaltyType = null; 

function createDeck() {
    let newDeck = [];
    for (let color of colors) {
        for (let value of values) {
            newDeck.push({ color: color, value: value, type: 'normal' });
            if (value !== '0') newDeck.push({ color: color, value: value, type: 'normal' }); 
        }
    }
    for (let i = 0; i < 4; i++) {
        newDeck.push({ color: 'black', value: 'Joker', type: 'wild' });
        newDeck.push({ color: 'black', value: '+4', type: 'wild' });
    }
    return newDeck;
}

function shuffle(deckToShuffle) {
    for (let i = deckToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
    }
    return deckToShuffle;
}

function getTailwindColor(colorName) {
    switch(colorName) {
        case 'red': return 'bg-red-500';
        case 'blue': return 'bg-blue-500';
        case 'green': return 'bg-green-500';
        case 'yellow': return 'bg-yellow-400';
        case 'black': return 'bg-gray-800';
        default: return 'bg-gray-500';
    }
}

// --- 2. OYUN KURULUMU VE DİNAMİK İSİM GİRİŞİ ---
const playerBtns = document.querySelectorAll('.player-btn');
const startGameBtn = document.getElementById('startGameBtn');

playerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        playerBtns.forEach(b => { b.classList.remove('bg-blue-500', 'text-white'); b.classList.add('bg-gray-200', 'text-gray-800'); });
        e.target.classList.remove('bg-gray-200', 'text-gray-800');
        e.target.classList.add('bg-blue-500', 'text-white');
        selectedPlayerCount = parseInt(e.target.getAttribute('data-players'));
        
        let nameContainer = document.getElementById('nameContainer');
        if (!nameContainer) {
            nameContainer = document.createElement('div');
            nameContainer.id = 'nameContainer';
            nameContainer.className = 'grid grid-cols-2 gap-2 w-full max-w-md mx-auto mt-4 mb-4';
            startGameBtn.parentNode.insertBefore(nameContainer, startGameBtn);
        }
        nameContainer.innerHTML = ''; 
        for (let i = 0; i < selectedPlayerCount; i++) {
            nameContainer.innerHTML += `<input type="text" id="playerNameInput${i}" placeholder="${i+1}. Oyuncu" class="border-2 border-gray-300 p-2 rounded text-black font-bold text-center shadow-inner">`;
        }
        
        startGameBtn.disabled = false;
        startGameBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        startGameBtn.innerText = `${selectedPlayerCount} Oyuncu ile Başlat`;
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const endTurnBtn = document.getElementById('endTurnBtn');
    if (endTurnBtn && !document.getElementById('unoBtn')) {
        const unoBtn = document.createElement('button');
        unoBtn.id = 'unoBtn';
        unoBtn.className = 'bg-yellow-500 hover:bg-yellow-600 text-white font-extrabold py-2 px-6 rounded-lg shadow-lg mr-4 border-2 border-white transition-all transform active:scale-95';
        unoBtn.innerText = 'UNO!';
        unoBtn.onclick = () => {
            hasSaidUno = true;
            unoBtn.classList.add('opacity-50', 'cursor-not-allowed');
            unoBtn.innerText = 'UNO Dendi!';
        };
        endTurnBtn.parentNode.insertBefore(unoBtn, endTurnBtn);
    }
});

startGameBtn.addEventListener('click', () => {
    if (selectedPlayerCount < 2 || selectedPlayerCount > 6) return;

    deck = shuffle(createDeck());
    
    players = Array.from({ length: selectedPlayerCount }, (_, i) => {
        const inputVal = document.getElementById(`playerNameInput${i}`).value.trim();
        return { id: inputVal !== '' ? inputVal : `Oyuncu ${i + 1}`, hand: [] };
    });
    
    for (let i = 0; i < 7; i++) {
        for (let p = 0; p < selectedPlayerCount; p++) {
            players[p].hand.push(deck.pop());
        }
    }
    
    let firstCard = deck.pop();
    while(firstCard.color === 'black' || firstCard.value === 'Pas' || firstCard.value === 'Yön' || firstCard.value === '+2') {
        deck.unshift(firstCard);
        firstCard = deck.pop();
    }
    discardPile.push(firstCard);
    
    hasDrawnThisTurn = false; 
    hasPlayedThisTurn = false;
    hasSaidUno = false;
    pendingSteps = 1;
    activePenalty = 0;
    expectedPenaltyType = null;

    document.getElementById('startScreen').classList.add('hidden');
    showPassScreen(); 
});

// --- 3. OYUN KURALLARI VE MANTIĞI ---

function advanceTurn(steps = 1) {
    hasDrawnThisTurn = false; 
    hasPlayedThisTurn = false;
    hasSaidUno = false;
    pendingSteps = 1;

    const unoBtn = document.getElementById('unoBtn');
    if (unoBtn) {
        unoBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        unoBtn.innerText = 'UNO!';
    }

    currentPlayerIndex = (((currentPlayerIndex + (playDirection * steps)) % players.length) + players.length) % players.length;
    showPassScreen();
}

function playCard(index) {
    if (hasPlayedThisTurn) {
        alert("Bu elde zaten bir kart oynadınız! Hamleyi tamamlamak için 'Hamleyi Bitir' butonuna basın.");
        return;
    }

    const currentPlayer = players[currentPlayerIndex];
    const cardToPlay = currentPlayer.hand[index];
    const topCard = discardPile[discardPile.length - 1];

    // Üzerine ceza varken oynanan oyun
    if (activePenalty > 0) {
        if (cardToPlay.value === expectedPenaltyType || cardToPlay.value === '+4') {
            
            if (cardToPlay.value === '+4') {
                expectedPenaltyType = '+4';
                activePenalty += 4;
                let secilenRenk = prompt("Rengi değiştirin: 'red', 'blue', 'green', 'yellow' yazın.").toLowerCase().trim();
                const gecerliRenkler = ['red', 'blue', 'green', 'yellow'];
                cardToPlay.color = gecerliRenkler.includes(secilenRenk) ? secilenRenk : 'red';
            } else if (cardToPlay.value === '+2') {
                activePenalty += 2;
            }

            currentPlayer.hand.splice(index, 1);
            discardPile.push(cardToPlay);
            
            hasPlayedThisTurn = true;
            pendingSteps = 1;

            if (currentPlayer.hand.length === 0) {
                renderGameArea();
                setTimeout(() => { alert(`🎉 TEBRİKLER! ${currentPlayer.id} OYUNU KAZANDI! 🎉`); location.reload(); }, 100);
                return;
            }

            renderGameArea(); 
            return;
        } else {
            alert(`Dikkat! Ceza devrede. Ya üzerine ${expectedPenaltyType} (veya +4) atmalısın ya da desteye tıklayıp kartları çekmelisin.`);
            return;
        }
    }

    // Normal kart atma (Ceza yokken)
    if (cardToPlay.color === topCard.color || cardToPlay.value === topCard.value || cardToPlay.color === 'black') {
        
        if (cardToPlay.color === 'black') {
            let secilenRenk = prompt("Rengi değiştirin: 'red', 'blue', 'green', 'yellow' yazın.").toLowerCase().trim();
            const gecerliRenkler = ['red', 'blue', 'green', 'yellow'];
            cardToPlay.color = gecerliRenkler.includes(secilenRenk) ? secilenRenk : 'red';
        }

        currentPlayer.hand.splice(index, 1);
        discardPile.push(cardToPlay);
        hasPlayedThisTurn = true; 

        if (currentPlayer.hand.length === 0) {
            renderGameArea();
            setTimeout(() => { alert(`🎉 TEBRİKLER! ${currentPlayer.id} OYUNU KAZANDI! 🎉`); location.reload(); }, 100);
            return;
        }

        if (cardToPlay.value === '+2') {
            activePenalty = 2;
            expectedPenaltyType = '+2';
        } else if (cardToPlay.value === '+4') {
            activePenalty = 4;
            expectedPenaltyType = '+4';
        } else if (cardToPlay.value === 'Yön') {
            if (players.length === 2) pendingSteps = 2; 
            else { playDirection *= -1; alert("Oyunun yönü değişti!"); }
        } else if (cardToPlay.value === 'Pas') {
            pendingSteps = 2;
            alert("Sıradaki oyuncu pas geçildi! (Hamleni bitirince etki edecek)");
        }

        renderGameArea(); 

    } else {
        alert("Bu kartı oynayamazsın! Renk veya sayı ortadaki kartla eşleşmeli.");
    }
}

document.getElementById('drawCardBtn').addEventListener('click', () => {
    if (hasPlayedThisTurn) {
        alert("Kart oynadıktan sonra desteden kart çekemezsiniz! Lütfen 'Hamleyi Bitir' butonuna basın.");
        return;
    }

    const currentPlayer = players[currentPlayerIndex];

    if (activePenalty > 0) {
        for (let i = 0; i < activePenalty; i++) {
            if (deck.length === 0) {
                const topCard = discardPile.pop();
                deck = shuffle(discardPile);
                discardPile = [topCard];
            }
            currentPlayer.hand.push(deck.pop());
        }
        alert(`Eyvah! ${currentPlayer.id} uygun kart atmadığı için tam ${activePenalty} kart çekti! Şimdi hamleyi bitirebilirsin.`);
        activePenalty = 0; // Cezayı çekti, ceza sıfırlandı
        expectedPenaltyType = null;
        hasDrawnThisTurn = true;
        hasPlayedThisTurn = true; // Cezayı çekmek hamle sayıldığı için sırayı bitirebilmesini sağlar
        renderGameArea();
        return;
    }

    if (hasDrawnThisTurn) {
        alert("Bu elde zaten kart çektiniz! Ya elinizden uygun bir kart atın ya da 'Hamleyi Bitir'e basın.");
        return;
    }

    if (deck.length === 0) {
        const topCard = discardPile.pop();
        deck = shuffle(discardPile);
        discardPile = [topCard];
        alert("Deste bitti! Ortadaki kartlar yeniden karıştırıldı.");
    }
    
    currentPlayer.hand.push(deck.pop());
    hasDrawnThisTurn = true; 
    renderGameArea();
});

// --- 4. EKRAN YÖNETİMİ ---

function showPassScreen() {
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('passScreen').classList.remove('hidden');
    document.getElementById('passScreen').classList.add('flex');
    document.getElementById('turnText').innerText = `Sıra: ${players[currentPlayerIndex].id}`;
}

function showGameScreen() {
    document.getElementById('passScreen').classList.add('hidden');
    document.getElementById('passScreen').classList.remove('flex');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('flex');
    renderGameArea();
}

function renderGameArea() {
    const currentPlayer = players[currentPlayerIndex];
    document.getElementById('currentPlayerName').innerText = currentPlayer.id;

    const topCard = discardPile[discardPile.length - 1];
    const topCardDiv = document.getElementById('topCard');
    topCardDiv.className = `w-24 h-36 rounded-xl border-4 border-white shadow-lg flex items-center justify-center text-3xl text-white font-extrabold text-center drop-shadow-md ${getTailwindColor(topCard.color)}`;
    topCardDiv.innerText = topCard.value;

    const drawBtn = document.getElementById('drawCardBtn');
    
    // YENİ DÜZELTME: Sadece henüz hamle yapmamış ve cezayla karşılaşan kişi "Cezayı Çek" butonunu görecek
    if (activePenalty > 0 && !hasPlayedThisTurn) {
        drawBtn.innerHTML = `<span class="text-white font-bold text-center text-sm">CEZAYI ÇEK<br>(+${activePenalty})</span>`;
        drawBtn.classList.remove('bg-gray-800');
        drawBtn.classList.add('bg-red-600', 'animate-pulse');
    } else {
        drawBtn.innerHTML = `<span class="text-white font-bold transform -rotate-45 text-xl">UNO</span>`;
        drawBtn.classList.remove('bg-red-600', 'animate-pulse');
        drawBtn.classList.add('bg-gray-800');
    }

    const handContainer = document.getElementById('playerHand');
    handContainer.innerHTML = ''; 
    
    currentPlayer.hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        let baseClasses = `${getTailwindColor(card.color)} h-24 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md border-2 border-white transition-transform`;
        
        if (hasPlayedThisTurn) {
            baseClasses += ' opacity-50 cursor-not-allowed'; 
        } else {
            baseClasses += ' cursor-pointer hover:-translate-y-2'; 
            cardDiv.onclick = () => playCard(index);
        }

        cardDiv.className = baseClasses;
        cardDiv.innerText = card.value;
        handContainer.appendChild(cardDiv);
    });
}

document.getElementById('showCardsBtn').addEventListener('click', showGameScreen);

document.getElementById('endTurnBtn').addEventListener('click', () => {
    // YENİ DÜZELTME: Kart atan kişi hamleyi bitirebilir, ancak cezayı çeken veya cezayı karşılayan kişi hamlesiz geçemez.
    if (activePenalty > 0 && !hasPlayedThisTurn && !hasDrawnThisTurn) {
        alert("Ceza aktifken hamleyi geçemezsiniz! Ya üstüne kart atın ya da desteye tıklayıp cezayı çekin.");
        return;
    }

    if (!hasPlayedThisTurn && !hasDrawnThisTurn) {
        alert("Önce elinizden bir kart atmalı veya desteden 1 kart çekmelisiniz!");
        return;
    }

    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.hand.length === 1 && !hasSaidUno) {
        alert(`🚨 YAKALANDIN ${currentPlayer.id}! UNO demeyi unuttuğun için 2 kart ceza çekiyorsun!`);
        for (let i = 0; i < 2; i++) {
            if (deck.length === 0) {
                const topCard = discardPile.pop();
                deck = shuffle(discardPile);
                discardPile = [topCard];
            }
            currentPlayer.hand.push(deck.pop());
        }
    }
    
    advanceTurn(pendingSteps);
});
