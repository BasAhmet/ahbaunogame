import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCEH0KcvuCJtOuGZrsMit1r9nZ_ZkjxDHU",
    authDomain: "ahbaunogame.firebaseapp.com",
    databaseURL: "https://ahbaunogame-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "ahbaunogame",
    storageBucket: "ahbaunogame.firebasestorage.app",
    messagingSenderId: "477798849645",
    appId: "1:477798849645:web:0510a493393850676eb364",
    measurementId: "G-HR68HHD3SN"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// Global Oyun Değişkenleri Bölümüne Ekle
let myPlayerName = "";
let currentRoomPin = "";
let gameData = null;
let myAvatar = '🐶'; // Varsayılan avatar

// Avatar Seçim Fonksiyonu
window.selectAvatar = function(emoji, btnElement) {
    myAvatar = emoji;
    // Tüm butonların seçim efektini temizle
    document.querySelectorAll('.avatar-btn').forEach(btn => {
        btn.classList.remove('border-yellow-500', 'bg-yellow-50', 'scale-110');
        btn.classList.add('border-gray-200', 'bg-white');
    });
    // Seçileni vurgula
    btnElement.classList.remove('border-gray-200', 'bg-white');
    btnElement.classList.add('border-yellow-500', 'bg-yellow-50', 'scale-110');
};

// --- 1. KART DESTE SİSTEMİ ---
const colors = ['red', 'blue', 'green', 'yellow'];
const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Pas', 'Yön', '+2'];
const specialValues = ['Pas', 'Yön', '+2', '+4', 'Joker'];
const colorOrder = { 'red': 1, 'blue': 2, 'green': 3, 'yellow': 4, 'black': 5 };
const valOrder = { '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'Pas':10, 'Yön':11, '+2':12, '+4':13, 'Joker':14 };

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

// --- 2. GLOBAL OYUN DEĞİŞKENLERİ ---
let myPlayerName = "";
let currentRoomPin = "";
let gameData = null; 

// --- 3. LOBİ VE ODA YÖNETİMİ ---
document.getElementById('createRoomBtn').addEventListener('click', async () => {
    const nameInput = document.getElementById('playerNameInput').value.trim();
    if (!nameInput) return alert("Lütfen önce adınızı girin!");
    
    myPlayerName = nameInput;
    currentRoomPin = Math.floor(10000 + Math.random() * 90000).toString(); // 5 haneli PIN

    let deck = shuffle(createDeck());
    let discardPile = [];
    let firstCard = deck.pop();
    while(firstCard.color === 'black' || specialValues.includes(firstCard.value)) {
        deck.unshift(firstCard);
        firstCard = deck.pop();
    }
    discardPile.push(firstCard);

    const roomRef = ref(db, 'rooms/' + currentRoomPin);
    const initialData = {
        status: 'waiting',
        players: [{ id: myPlayerName, avatar: myAvatar, hand: deck.splice(-7, 7) }],
        deck: deck,
        discardPile: discardPile,
        currentPlayerIndex: 0,
        playDirection: 1,
        activePenalty: 0,
        expectedPenaltyType: null,
        hasDrawnThisTurn: false,
        hasPlayedThisTurn: false,
        hasSaidUno: false,
        lastEventMessage: "Oyun bekleniyor...",
        turnSteps: 1
    };

    await set(roomRef, initialData);
    alert(`Oda Kuruldu! PIN Kodunuz: ${currentRoomPin} \nDiğer oyuncuların katılması bekleniyor...`);
    listenToRoom();
});

document.getElementById('joinRoomBtn').addEventListener('click', async () => {
    const nameInput = document.getElementById('playerNameInput').value.trim();
    currentRoomPin = document.getElementById('roomPinInput').value.trim();
    
    if (!nameInput || !currentRoomPin) return alert("Lütfen adınızı ve Oda PIN kodunu girin!");

    const roomRef = ref(db, 'rooms/' + currentRoomPin);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
        let roomData = snapshot.val();
        if (roomData.status === 'playing') {
            return alert("Bu oyuna başlanmış, katılamazsınız!");
        }

        if (roomData.players.find(p => p.id === nameInput)) {
            return alert("Bu isimde bir oyuncu zaten odada var, farklı bir isim seçin.");
        }

        myPlayerName = nameInput;
        let newPlayerHand = roomData.deck.splice(-7, 7);
        roomData.players.push({ id: myPlayerName, avatar: myAvatar, hand: newPlayerHand });

        await update(roomRef, {
            players: roomData.players,
            deck: roomData.deck
        });
        
        listenToRoom();
    } else {
        alert("Böyle bir oda bulunamadı. PIN kodunu kontrol edin.");
    }
});

function startGameIfCreator() {
    if (gameData && gameData.players[0].id === myPlayerName && gameData.status === 'waiting' && gameData.players.length > 1) {
        if(confirm(`${gameData.players.length} oyuncu katıldı. Oyunu başlatalım mı?`)) {
            update(ref(db, 'rooms/' + currentRoomPin), { status: 'playing', lastEventMessage: "Oyun başladı!" });
        }
    }
}

// --- 4. FIREBASE CANLI DİNLEME (SENKRONİZASYON) ---
function listenToRoom() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('flex');

    const roomRef = ref(db, 'rooms/' + currentRoomPin);
    onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            gameData = snapshot.val();
            if (!gameData.deck) gameData.deck = []; 
            
            renderGameArea();

            if (gameData.status === 'waiting') {
                document.getElementById('currentPlayerName').innerText = `Oda: ${currentRoomPin} | Oyuncu Bekleniyor...`;
                document.getElementById('topCard').innerHTML = `<div class="text-white text-center font-bold">Lobi<br>${gameData.players.length} Kişi</div>`;
                setTimeout(startGameIfCreator, 1000); 
            }
        }
    });
}

// --- 5. OYUN MANTIĞI VE FIREBASE'E VERİ GÖNDERME ---
async function pushGameUpdate() {
    await update(ref(db, 'rooms/' + currentRoomPin), gameData);
}

let colorResolveCallback = null;
function askForColor() {
    return new Promise((resolve) => {
        colorResolveCallback = resolve;
        const modal = document.getElementById('colorModal');
        if(!modal) return resolve('red'); 
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

window.selectColor = function(color) {
    const modal = document.getElementById('colorModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (colorResolveCallback) {
        colorResolveCallback(color);
        colorResolveCallback = null;
    }
};

window.playCard = async function(originalIndex) {
    const isMyTurn = gameData.players[gameData.currentPlayerIndex].id === myPlayerName;
    if (!isMyTurn || gameData.status !== 'playing') return;
    if (gameData.hasPlayedThisTurn) return alert("Bu elde zaten bir kart oynadınız! Hamleyi Bitir'e basın.");

    let me = gameData.players.find(p => p.id === myPlayerName);
    let myIndexInPlayers = gameData.players.findIndex(p => p.id === myPlayerName);
    const cardToPlay = me.hand[originalIndex];
    const topCard = gameData.discardPile[gameData.discardPile.length - 1];

    if (gameData.activePenalty > 0) {
        if (cardToPlay.value === gameData.expectedPenaltyType || cardToPlay.value === '+4') {
            if (cardToPlay.value === '+4') {
                gameData.expectedPenaltyType = '+4';
                gameData.activePenalty += 4;
                cardToPlay.color = await askForColor();
            } else if (cardToPlay.value === '+2') {
                gameData.activePenalty += 2;
            }

            me.hand.splice(originalIndex, 1);
            gameData.discardPile.push(cardToPlay);
            gameData.hasPlayedThisTurn = true;
            gameData.turnSteps = 1;
            gameData.players[myIndexInPlayers] = me;

            if (me.hand.length === 0) {
                gameData.lastEventMessage = `🎉 TEBRİKLER! ${myPlayerName} OYUNU KAZANDI! 🎉`;
                await pushGameUpdate();
                return;
            }
            await pushGameUpdate();
            return;
        } else {
            return alert(`Ceza devrede! Ya üzerine ${gameData.expectedPenaltyType} (veya +4) atmalısın ya da desteden cezanı çekmelisin.`);
        }
    }

    if (cardToPlay.color === topCard.color || cardToPlay.value === topCard.value || cardToPlay.color === 'black') {
        if (cardToPlay.color === 'black') {
            cardToPlay.color = await askForColor();
        }

        me.hand.splice(originalIndex, 1);
        gameData.discardPile.push(cardToPlay);
        gameData.hasPlayedThisTurn = true; 
        gameData.players[myIndexInPlayers] = me;

        if (me.hand.length === 0) {
            gameData.lastEventMessage = `🎉 TEBRİKLER! ${myPlayerName} OYUNU KAZANDI! 🎉`;
            await pushGameUpdate();
            return;
        }

        if (cardToPlay.value === '+2') {
            gameData.activePenalty = 2;
            gameData.expectedPenaltyType = '+2';
        } else if (cardToPlay.value === '+4') {
            gameData.activePenalty = 4;
            gameData.expectedPenaltyType = '+4';
        } else if (cardToPlay.value === 'Yön') {
            if (gameData.players.length === 2) gameData.turnSteps = 2; 
            else gameData.playDirection *= -1; 
        } else if (cardToPlay.value === 'Pas') {
            gameData.turnSteps = 2;
        }

        await pushGameUpdate();
    } else {
        alert("Bu kartı oynayamazsın! Renk veya sayı uyuşmuyor.");
    }
};

document.getElementById('drawCardBtn').addEventListener('click', async () => {
    const isMyTurn = gameData && gameData.players[gameData.currentPlayerIndex].id === myPlayerName;
    if (!isMyTurn || gameData.status !== 'playing') return;

    if (gameData.hasPlayedThisTurn) return alert("Kart oynadıktan sonra desteden çekemezsiniz!");
    
    let me = gameData.players.find(p => p.id === myPlayerName);
    let myIndexInPlayers = gameData.players.findIndex(p => p.id === myPlayerName);

    if (gameData.activePenalty > 0) {
        for (let i = 0; i < gameData.activePenalty; i++) {
            if (gameData.deck.length === 0) recycleDeck();
            me.hand.push(gameData.deck.pop());
        }
        gameData.lastEventMessage = `🚨 ${myPlayerName}, tam ${gameData.activePenalty} kart ceza çekti!`;
        gameData.activePenalty = 0; 
        gameData.expectedPenaltyType = null;
        gameData.hasDrawnThisTurn = true;
        gameData.hasPlayedThisTurn = true; 
    } else {
        if (gameData.hasDrawnThisTurn) return alert("Zaten kart çektiniz!");
        if (gameData.deck.length === 0) recycleDeck();
        me.hand.push(gameData.deck.pop());
        gameData.hasDrawnThisTurn = true; 
    }

    gameData.players[myIndexInPlayers] = me;
    await pushGameUpdate();
});

function recycleDeck() {
    const topCard = gameData.discardPile.pop();
    gameData.deck = shuffle(gameData.discardPile);
    gameData.discardPile = [topCard];
}

document.getElementById('endTurnBtn').addEventListener('click', async () => {
    const isMyTurn = gameData && gameData.players[gameData.currentPlayerIndex].id === myPlayerName;
    if (!isMyTurn || gameData.status !== 'playing') return;

    if (gameData.activePenalty > 0 && !gameData.hasPlayedThisTurn && !gameData.hasDrawnThisTurn) {
        return alert("Ceza aktifken hamleyi geçemezsiniz!");
    }
    if (!gameData.hasPlayedThisTurn && !gameData.hasDrawnThisTurn) {
        return alert("Önce elinizden bir kart atmalı veya desteden çekmelisiniz!");
    }

    let me = gameData.players.find(p => p.id === myPlayerName);
    let myIndexInPlayers = gameData.players.findIndex(p => p.id === myPlayerName);

    if (me.hand.length === 1 && !gameData.hasSaidUno) {
        gameData.lastEventMessage = `⚠️ GÜLME KRİZİ: ${myPlayerName} UNO demeyi unuttuğu için 2 ceza kartı yedi!`;
        for (let i = 0; i < 2; i++) {
            if (gameData.deck.length === 0) recycleDeck();
            me.hand.push(gameData.deck.pop());
        }
        gameData.players[myIndexInPlayers] = me;
    }

    gameData.currentPlayerIndex = (((gameData.currentPlayerIndex + (gameData.playDirection * gameData.turnSteps)) % gameData.players.length) + gameData.players.length) % gameData.players.length;
    
    gameData.hasDrawnThisTurn = false;
    gameData.hasPlayedThisTurn = false;
    gameData.hasSaidUno = false;
    gameData.turnSteps = 1;

    await pushGameUpdate();
});

document.addEventListener("DOMContentLoaded", () => {
    const endTurnBtn = document.getElementById('endTurnBtn');
    if (endTurnBtn && !document.getElementById('unoBtn')) {
        const actionWrapper = document.createElement('div');
        actionWrapper.className = 'w-full max-w-lg mx-auto flex flex-col gap-3 mt-4 px-2';
        endTurnBtn.parentNode.insertBefore(actionWrapper, endTurnBtn);
        
        const unoBtn = document.createElement('button');
        unoBtn.id = 'unoBtn';
        unoBtn.className = 'w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-black py-3 rounded-xl shadow-lg border-2 border-white transition-all transform active:scale-95 text-lg tracking-widest';
        unoBtn.innerText = 'UNO!';
        
        unoBtn.onclick = async () => {
            if (!gameData || gameData.players[gameData.currentPlayerIndex].id !== myPlayerName) return;
            
            let me = gameData.players.find(p => p.id === myPlayerName);
            if (me.hand.length > 2) return alert("Henüz çok fazla kartın var, UNO diyemezsin!");
            
            gameData.hasSaidUno = true;
            gameData.lastEventMessage = `🚨 DİKKAT: ${myPlayerName} UNO dedi! 🚨`;
            unoBtn.classList.add('opacity-50', 'cursor-not-allowed');
            unoBtn.innerText = 'UNO Dendi!';
            await pushGameUpdate();
        };
        
        actionWrapper.appendChild(unoBtn);
        actionWrapper.appendChild(endTurnBtn);
    }
});

// --- 6. ARAYÜZ (RENDER) İŞLEMLERİ ---
function createCardHTML(cardData, isPlayable, index) {
    let baseClasses = `relative w-[64px] min-w-[64px] h-[96px] flex-shrink-0 rounded-lg border-[2px] border-white shadow-md flex items-center justify-center text-white transition-all duration-300 transform ${getTailwindColor(cardData.color)}`;
    
    if (!isPlayable) {
        baseClasses += ' opacity-50 cursor-not-allowed'; 
    } else {
        baseClasses += ' cursor-pointer hover:-translate-y-4 hover:shadow-2xl z-10 hover:z-50'; 
    }

    const shortVal = cardData.value === 'Joker' ? '★' : cardData.value;
    return `
        <div class="${baseClasses}" onclick="${!isPlayable ? '' : `playCard(${index})`}">
            <span class="absolute top-1 left-1.5 text-[10px] font-black drop-shadow-md pointer-events-none">${shortVal}</span>
            <div class="w-[45px] h-[70px] rounded-[50%] border-[1.5px] border-white/30 flex items-center justify-center bg-black/10 transform -rotate-12 shadow-inner pointer-events-none">
                <span class="transform rotate-12 drop-shadow-md text-xl font-black">${cardData.value}</span>
            </div>
            <span class="absolute bottom-1 right-1.5 text-[10px] font-black drop-shadow-md rotate-180 pointer-events-none">${shortVal}</span>
        </div>
    `;
}

function renderGameArea() {
    if (!gameData || gameData.status !== 'playing') return;

    const currentTurnPlayer = gameData.players[gameData.currentPlayerIndex];
    const isMyTurn = currentTurnPlayer.id === myPlayerName;

    // Avatarı da içerecek şekilde güncellendi:
    const avatarToDisplay = currentTurnPlayer.avatar || '👤'; // Eğer eski oyun kaldıysa varsayılan göstersin
    
    const infoText = isMyTurn 
        ? `<div class="flex items-center justify-center gap-2"><span class="text-3xl">${avatarToDisplay}</span> <span class="text-green-500 font-black text-2xl tracking-wide">SENİN SIRAN!</span></div>` 
        : `<div class="flex items-center justify-center gap-2"><span class="text-3xl">${avatarToDisplay}</span> <span class="text-blue-600 font-bold text-xl">Sıra: ${currentTurnPlayer.id}</span></div>`;
        
    document.getElementById('currentPlayerName').innerHTML = infoText;
    
    const infoText = isMyTurn ? `<span class="text-green-400">SENİN SIRAN!</span>` : `<span class="text-yellow-400">Sıra: ${currentTurnPlayer.id}</span>`;
    document.getElementById('currentPlayerName').innerHTML = infoText;

    if (gameData.lastEventMessage) {
        let notifDiv = document.getElementById('globalNotification');
        if (!notifDiv) {
            notifDiv = document.createElement('div');
            notifDiv.id = 'globalNotification';
            notifDiv.className = 'w-full bg-blue-600 text-white font-bold text-center py-2 px-4 shadow-lg mb-4 text-sm animate-pulse';
            const topArea = document.getElementById('currentPlayerName').parentNode;
            topArea.parentNode.insertBefore(notifDiv, topArea);
        }
        notifDiv.innerText = gameData.lastEventMessage;
    }

    const topCard = gameData.discardPile[gameData.discardPile.length - 1];
    const topCardDiv = document.getElementById('topCard');
    topCardDiv.className = `relative w-[90px] h-[135px] rounded-xl border-[3px] border-white shadow-[4px_4px_10px_rgba(0,0,0,0.3)] flex items-center justify-center text-white transform -rotate-3 transition-all ${getTailwindColor(topCard.color)}`;
    const topShortVal = topCard.value === 'Joker' ? '★' : topCard.value;
    topCardDiv.innerHTML = `
        <span class="absolute top-2 left-2.5 text-sm font-black drop-shadow-md">${topShortVal}</span>
        <div class="w-[70px] h-[100px] rounded-[50%] border-[2px] border-white/30 flex items-center justify-center bg-black/10 transform -rotate-12 shadow-inner">
            <span class="transform rotate-12 drop-shadow-lg text-4xl font-black">${topCard.value}</span>
        </div>
        <span class="absolute bottom-2 right-2.5 text-sm font-black drop-shadow-md rotate-180">${topShortVal}</span>
    `;

    const drawBtn = document.getElementById('drawCardBtn');
    if (gameData.activePenalty > 0 && !gameData.hasPlayedThisTurn) {
        drawBtn.innerHTML = `<span class="text-white font-black text-center text-[11px] drop-shadow-md">CEZAYI ÇEK<br>(+${gameData.activePenalty})</span>`;
        drawBtn.className = `relative w-[90px] h-[135px] rounded-xl border-[3px] border-white shadow-xl flex items-center justify-center ${isMyTurn ? 'cursor-pointer bg-red-600 animate-pulse' : 'bg-red-900 opacity-50 cursor-not-allowed'}`;
    } else {
        drawBtn.innerHTML = `
            <div class="w-[70px] h-[100px] rounded-[50%] border-[2px] border-red-500/50 flex items-center justify-center bg-black/30 transform -rotate-12">
                <span class="text-yellow-400 font-black transform rotate-[-30deg] text-xl tracking-widest drop-shadow-[2px_2px_0_rgba(255,0,0,1)]">UNO</span>
            </div>
        `;
        drawBtn.className = `w-[90px] h-[135px] bg-gray-900 rounded-xl border-[3px] border-white shadow-lg flex items-center justify-center transition-transform ${isMyTurn && !gameData.hasPlayedThisTurn && !gameData.hasDrawnThisTurn ? 'cursor-pointer hover:-translate-y-1' : 'opacity-50 cursor-not-allowed'}`;
    }

    const unoBtn = document.getElementById('unoBtn');
    if (unoBtn) {
        if (!isMyTurn || gameData.hasSaidUno) {
            unoBtn.classList.add('opacity-50', 'cursor-not-allowed');
            unoBtn.innerText = gameData.hasSaidUno ? 'UNO Dendi!' : 'UNO!';
        } else {
            unoBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            unoBtn.innerText = 'UNO!';
        }
    }
    
    const endTurnBtn = document.getElementById('endTurnBtn');
    if (endTurnBtn) {
        if (isMyTurn && (gameData.hasPlayedThisTurn || gameData.hasDrawnThisTurn)) {
            endTurnBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            endTurnBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    let me = gameData.players.find(p => p.id === myPlayerName);
    if (!me) return;

    const handContainer = document.getElementById('playerHand');
    const handWithOriginalIndices = me.hand.map((card, index) => ({ ...card, originalIndex: index }));
    const normalCards = [], specialCards = [];

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

    handContainer.innerHTML = `
        <div class="w-full flex flex-col gap-6 mb-4">
            ${normalCards.length > 0 ? `
                <div class="w-full">
                    <p class="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider text-left pl-2">SAYI KARTLARI (${normalCards.length})</p>
                    <div class="w-full overflow-x-auto scroll-smooth py-4"><div id="normalCardsRow" class="flex flex-row flex-nowrap items-center justify-start min-h-[100px] w-max px-2"></div></div>
                </div>
            ` : ''}
            ${specialCards.length > 0 ? `
                <div class="w-full">
                    <p class="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider text-left pl-2">ÖZEL KARTLAR (${specialCards.length})</p>
                    <div class="w-full overflow-x-auto scroll-smooth py-4"><div id="specialCardsRow" class="flex flex-row flex-nowrap items-center justify-start min-h-[100px] w-max px-2"></div></div>
                </div>
            ` : ''}
        </div>
    `;

    const normalRow = document.getElementById('normalCardsRow');
    if (normalRow) normalCards.forEach((card, i) => {
        const div = document.createElement('div');
        div.innerHTML = createCardHTML(card, isMyTurn && !gameData.hasPlayedThisTurn, card.originalIndex);
        if (i > 0) div.firstElementChild.classList.add('-ml-6');
        normalRow.appendChild(div.firstElementChild);
    });

    const specialRow = document.getElementById('specialCardsRow');
    if (specialRow) specialCards.forEach((card, i) => {
        const div = document.createElement('div');
        div.innerHTML = createCardHTML(card, isMyTurn && !gameData.hasPlayedThisTurn, card.originalIndex);
        if (i > 0) div.firstElementChild.classList.add('-ml-6');
        specialRow.appendChild(div.firstElementChild);
    });
}
