// --- 1. KART DESTE SİSTEMİ ---
const colors = ['red', 'blue', 'green', 'yellow'];
const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Pas', 'Yön', '+2'];
const specialValues = ['Pas', 'Yön', '+2', '+4', 'Joker'];

const colorOrder = { 'red': 1, 'blue': 2, 'green': 3, 'yellow': 4, 'black': 5 };
const valOrder = { '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'Pas':10, 'Yön':11, '+2':12, '+4':13, 'Joker':14 };

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
        case 'red': return 'bg-gradient-to-br from-red-500 to-red-700';
        case 'blue': return 'bg-gradient-to-br from-blue-400 to-blue-700';
        case 'green': return 'bg-gradient-to-br from-green-500 to-green-700';
        case 'yellow': return 'bg-gradient-to-br from-yellow-400 to-orange-500';
        case 'black': return 'bg-gradient-to-br from-gray-700 to-gray-900';
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
            nameContainer.innerHTML += `<input type="text" id="playerNameInput${i}" placeholder="${i+1}. Oyuncu" class="border-2 border-gray-300 p-2 rounded-lg text-black font-bold text-center shadow-inner focus:ring-2 focus:ring-blue-500 outline-none transition-all">`;
        }
        
        startGameBtn.disabled = false;
        startGameBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        startGameBtn.innerText = `${selectedPlayerCount} Oyuncu ile Başlat`;
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const endTurnBtn = document.getElementById('endTurnBtn');
    
    if (endTurnBtn && !document.getElementById('unoBtn')) {
        const actionWrapper = document.createElement('div');
        actionWrapper.className = 'w-full flex flex-col gap-3 mt-4 px-2';
        
        endTurnBtn.parentNode.insertBefore(actionWrapper, endTurnBtn);
        
        const unoBtn = document.createElement('button');
        unoBtn.id = 'unoBtn';
        unoBtn.className = 'w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-black py-3 rounded-xl shadow-lg border-2 border-white transition-all transform active:scale-95 text-lg tracking-widest';
        unoBtn.innerText = 'UNO!';
        
        unoBtn.onclick = () => {
            const currentPlayer = players[currentPlayerIndex];
            if (currentPlayer.hand.length > 2) {
                alert("Henüz çok fazla kartın var, UNO diyemezsin!");
                return;
            }
            hasSaidUno = true;
            unoBtn.classList.add('opacity-50', 'cursor-not-allowed');
            unoBtn.innerText = 'UNO Dendi!';
        };
        
        actionWrapper.appendChild(unoBtn);
        actionWrapper.appendChild(endTurnBtn);
        endTurnBtn.className = "w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 text-lg";
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

function playCard(originalIndex) {
    if (hasPlayedThisTurn) {
        alert("Bu elde zaten bir kart oynadınız! Hamleyi tamamlamak için 'Hamleyi Bitir' butonuna basın.");
        return;
    }

    const currentPlayer = players[currentPlayerIndex];
    const cardToPlay = currentPlayer.hand[originalIndex];
    const topCard = discardPile[discardPile.length - 1];

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

            currentPlayer.hand.splice(originalIndex, 1);
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

    if (cardToPlay.color === topCard.color || cardToPlay.value === topCard.value || cardToPlay.color === 'black') {
        if (cardToPlay.color === 'black') {
            let secilenRenk = prompt("Rengi değiştirin: 'red', 'blue', 'green', 'yellow' yazın.").toLowerCase().trim();
            const gecerliRenkler = ['red', 'blue', 'green', 'yellow'];
            cardToPlay.color = gecerliRenkler.includes(secilenRenk) ? secilenRenk : 'red';
        }

        currentPlayer.hand.splice(originalIndex, 1);
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
        activePenalty = 0; 
        expectedPenaltyType = null;
        hasDrawnThisTurn = true;
        hasPlayedThisTurn = true; 
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

// --- 4. EKRAN YÖNETİMİ VE DÜZELTİLMİŞ TASARIM ---

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

function createCardHTML(cardData, isPlayed) {
    // KESİN PİKSEL DEĞERLERİ: Tailwind sınıf hatalarını önlemek için sabit piksel (64x96) kullanıldı.
    let baseClasses = `relative w-[64px] h-[96px] flex-shrink-0 rounded-lg border-[2px] border-white shadow-md flex items-center justify-center text-white transition-all transform ${getTailwindColor(cardData.color)}`;
    
    if (isPlayed) {
        baseClasses += ' opacity-50 cursor-not-allowed'; 
    } else {
        baseClasses += ' cursor-pointer hover:-translate-y-2 hover:shadow-xl z-10 hover:z-50'; 
    }

    const shortVal = cardData.value === 'Joker' ? '★' : cardData.value;
    
    return `
        <div class="${baseClasses}" onclick="${isPlayed ? '' : `playCard(${cardData.originalIndex})`}">
            <span class="absolute top-1 left-1.5 text-[10px] font-black drop-shadow-md">${shortVal}</span>
            <div class="w-[45px] h-[70px] rounded-[50%] border-[1.5px] border-white/30 flex items-center justify-center bg-black/10 transform -rotate-12 shadow-inner">
                <span class="transform rotate-12 drop-shadow-md text-xl font-black">${cardData.value}</span>
            </div>
            <span class="absolute bottom-1 right-1.5 text-[10px] font-black drop-shadow-md rotate-180">${shortVal}</span>
        </div>
    `;
}

function renderGameArea() {
    const currentPlayer = players[currentPlayerIndex];
    document.getElementById('currentPlayerName').innerText = currentPlayer.id;

    // Ortadaki kart (80x120 Piksel Sabit)
    const topCard = discardPile[discardPile.length - 1];
    const topCardDiv = document.getElementById('topCard');
    topCardDiv.className = `relative w-[80px] h-[120px] rounded-xl border-[3px] border-white shadow-[4px_4px_10px_rgba(0,0,0,0.3)] flex items-center justify-center text-white transform -rotate-3 transition-all ${getTailwindColor(topCard.color)}`;
    const topShortVal = topCard.value === 'Joker' ? '★' : topCard.value;
    topCardDiv.innerHTML = `
        <span class="absolute top-1.5 left-2 text-xs font-black drop-shadow-md">${topShortVal}</span>
        <div class="w-[60px] h-[90px] rounded-[50%] border-[2px] border-white/30 flex items-center justify-center bg-black/10 transform -rotate-12 shadow-inner">
            <span class="transform rotate-12 drop-shadow-lg text-3xl font-black">${topCard.value}</span>
        </div>
        <span class="absolute bottom-1.5 right-2 text-xs font-black drop-shadow-md rotate-180">${topShortVal}</span>
    `;

    // Deste / Kart Çekme Butonu (80x120 Piksel Sabit)
    const drawBtn = document.getElementById('drawCardBtn');
    if (activePenalty > 0 && !hasPlayedThisTurn) {
        drawBtn.innerHTML = `<span class="text-white font-black text-center text-[10px] drop-shadow-md">CEZAYI ÇEK<br>(+${activePenalty})</span>`;
        drawBtn.className = 'relative w-[80px] h-[120px] rounded-xl border-[3px] border-white shadow-xl flex items-center justify-center cursor-pointer bg-red-600 animate-pulse';
    } else {
        drawBtn.innerHTML = `
            <div class="w-[60px] h-[90px] rounded-[50%] border-[2px] border-red-500/50 flex items-center justify-center bg-black/30 transform -rotate-12">
                <span class="text-yellow-400 font-black transform rotate-[-30deg] text-lg tracking-widest drop-shadow-[2px_2px_0_rgba(255,0,0,1)]">UNO</span>
            </div>
        `;
        drawBtn.className = 'w-[80px] h-[120px] bg-gray-900 rounded-xl border-[3px] border-white shadow-lg flex items-center justify-center cursor-pointer hover:-translate-y-1 transition-transform';
    }

    // Eldeki kartların düzenlenmesi
// Eldeki kartların düzenlenmesi
    const handContainer = document.getElementById('playerHand');
    
    const handWithOriginalIndices = currentPlayer.hand.map((card, index) => ({ ...card, originalIndex: index }));
    
    const normalCards = [];
    const specialCards = [];

    handWithOriginalIndices.forEach(card => {
        if (specialValues.includes(card.value)) specialCards.push(card);
        else normalCards.push(card);
    });

    const sortLogic = (a, b) => {
        if (colorOrder[a.color] !== colorOrder[b.color]) return colorOrder[a.color] - colorOrder[b.color];
        return valOrder[a.value] - valOrder[b.value];
    };

    normalCards.sort(sortLogic);
    specialCards.sort(sortLogic);

    // DÜZELTME 1: Kapsayıcılara 'max-w-full' ve 'min-w-0' eklendi.
    handContainer.innerHTML = `
        <div class="w-full max-w-full min-w-0 flex flex-col gap-4 mb-8">
            ${normalCards.length > 0 ? `
                <div class="w-full max-w-full min-w-0">
                    <p class="text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-wider text-left pl-1">SAYI KARTLARI (${normalCards.length})</p>
                    <div id="normalCardsRow" class="flex flex-row overflow-x-auto overflow-y-visible pt-2 pb-4 px-1 w-full max-w-full items-center justify-start min-h-[120px] scroll-smooth hide-scrollbar"></div>
                </div>
            ` : ''}
            
            ${specialCards.length > 0 ? `
                <div class="w-full max-w-full min-w-0">
                    <p class="text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-wider text-left pl-1">ÖZEL KARTLAR (${specialCards.length})</p>
                    <div id="specialCardsRow" class="flex flex-row overflow-x-auto overflow-y-visible pt-2 pb-4 px-1 w-full max-w-full items-center justify-start min-h-[120px] scroll-smooth hide-scrollbar"></div>
                </div>
            ` : ''}
        </div>
    `;

    const normalRow = document.getElementById('normalCardsRow');
    const specialRow = document.getElementById('specialCardsRow');

    if (normalRow) {
        normalCards.forEach((card, i) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = createCardHTML(card, hasPlayedThisTurn);
            const cardElement = tempDiv.firstElementChild;
            if (i > 0) cardElement.classList.add('-ml-6'); 
            normalRow.appendChild(cardElement);
        });
        
        // DÜZELTME 2: Tarayıcının sağ tarafı kesmemesi için sona görünmez esnek boşluk (spacer) eklendi
        const spacer = document.createElement('div');
        spacer.className = "w-8 h-1 flex-shrink-0";
        normalRow.appendChild(spacer);
    }

    if (specialRow) {
        specialCards.forEach((card, i) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = createCardHTML(card, hasPlayedThisTurn);
            const cardElement = tempDiv.firstElementChild;
            if (i > 0) cardElement.classList.add('-ml-6'); 
            specialRow.appendChild(cardElement);
        });
        
        // Aynı boşluk özel kartlar için de eklendi
        const spacer = document.createElement('div');
        spacer.className = "w-8 h-1 flex-shrink-0";
        specialRow.appendChild(spacer);
    }
}

document.getElementById('showCardsBtn').addEventListener('click', showGameScreen);

document.getElementById('endTurnBtn').addEventListener('click', () => {
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
