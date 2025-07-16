// Mobile menu toggle
const mobileToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileToggle) {
    mobileToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        this.classList.toggle('active');
    });
}

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Contact form
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    fetch('https://formspree.io/f/mrblgoob', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            email: formData.get('Email'),
            nome: formData.get('Nome e Cognome'),
            telefono: formData.get('Telefono'),
            servizio: formData.get('Area di Interesse'),
            messaggio: formData.get('Descrizione del Caso'),
            _subject: 'Nuova richiesta consulenza - Studio Legale Grippo'
        })
    }).then(r => {
        alert('Richiesta inviata con successo! Ti contatteremo entro 24 ore.');
        e.target.reset();
    });
});
// Services Contact Form
document.addEventListener('DOMContentLoaded', function() {
    const servicesLinks = document.querySelectorAll('a[href*="mzzvbkyy"]');
    
    servicesLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const name = prompt('Nome e Cognome:');
            const email = prompt('Email:');
            const message = prompt('Descrivi la tua richiesta:');
            
            if (name && email) {
                fetch('https://formspree.io/f/mzzvbkyy', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        nome: name,
                        email: email,
                        messaggio: message,
                        _subject: 'Richiesta Servizi Integrati - Studio Legale Grippo'
                    })
                }).then(r => {
                    alert('Richiesta inviata! Ti contatteremo presto.');
                });
            }
        });
    });
});
// Chat Widget
window.openChat = function() {
    openAIChat();
}

// Funzione per aprire il chatbot AI
window.openAIChat = function() {
    const modal = document.getElementById('aiChatModal');
    if (modal) {
        modal.style.display = 'block';
        return;
    }

    const modalHTML = document.createElement('div');
    modalHTML.id = 'ai-chat-modal';
    modalHTML.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        height: 600px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease;
    `;
    
    modalHTML.innerHTML = `
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%); color: white; padding: 20px; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-robot" style="color: #ffd700;"></i>
                Assistente AI Legale
            </h3>
            <button onclick="closeModal('ai-chat-modal')" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 20px; background: #f8f9fa;">
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🤖</div>
                <h4 style="color: #0a1628;">Ciao! Sono l'assistente AI dello Studio Grippo</h4>
                <p style="color: #666;">Come posso aiutarti oggi?</p>
                <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    <button onclick="sendQuickQuestion('Quali sono i termini per un risarcimento danni?')" style="background: white; border: 1px solid #ddd; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.9rem;">
                        📅 Termini risarcimento
                    </button>
                    <button onclick="sendQuickQuestion('Come funziona una consulenza legale?')" style="background: white; border: 1px solid #ddd; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.9rem;">
                        💼 Info consulenza
                    </button>
                    <button onclick="sendQuickQuestion('Quali documenti servono per il mio caso?')" style="background: white; border: 1px solid #ddd; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.9rem;">
                        📄 Documenti necessari
                    </button>
                </div>
            </div>
        </div>
        <form onsubmit="handleChatSubmit(event)" style="padding: 20px; border-top: 1px solid #eee; background: white; border-radius: 0 0 20px 20px;">
            <div style="display: flex; gap: 10px;">
                <input type="text" id="chat-input" placeholder="Scrivi la tua domanda..." style="flex: 1; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;" required>
                <button type="submit" style="background: #00a651; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </form>
    `;
    
    document.body.appendChild(modalHTML);
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

window.handleChatSubmit = function(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    input.value = '';
    
    // Aggiungi risposta AI
    setTimeout(() => {
        addAIResponse(message);
    }, 1000);
}

window.sendQuickQuestion = function(question) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.value = question;
        handleChatSubmit(new Event('submit'));
    }
}

window.addUserMessage = function(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 15px;';
    messageDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%); color: white; padding: 15px; border-radius: 15px; max-width: 80%; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="margin: 0;">${message}</p>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.addAIResponse = async function(userMessage) {
    const chatMessages = document.getElementById('chat-messages');
    const responseDiv = document.createElement('div');
    responseDiv.className = 'ai-message';
    responseDiv.style.cssText = 'background: white; padding: 15px; border-radius: 15px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);';
    
    // Genera risposta basata sulla domanda
    let response = await generateAIResponse(userMessage);
    
    responseDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <i class="fas fa-robot" style="color: #ffd700; font-size: 1.2rem;"></i>
            <strong style="color: #0a1628;">Assistente AI</strong>
        </div>
        <div style="margin: 0; line-height: 1.6;">${response}</div>
    `;
    
    chatMessages.appendChild(responseDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.generateAIResponse = async function(message) {
    // PROTEZIONE ANTI-SPAM
    const today = new Date().toDateString();
    const userQuestions = localStorage.getItem('questions_' + today) || 0;
    
    if (userQuestions > 1) {
        return `
            <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; border-left: 4px solid #2196f3;">
                <p>💡 <strong>Grazie per il tuo interesse!</strong></p>
                <p>Hai già ricevuto 1 consulenza preliminare oggi. Per un parere legale approfondito sul tuo caso specifico:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>📞 <strong>Contattaci</strong> per valutare la tua situazione</li>
                    <li>💬 <strong>Descrivi il tuo caso</strong> via WhatsApp</li>
                    <li>📅 <strong>Prenota un appuntamento</strong> presso lo studio</li>
                </ul>
                <div style="text-align: center; margin-top: 15px;">
                    <p style="margin-bottom: 10px;">📞 <strong>Telefono:</strong> 089 2868938</p>
                    <p style="margin-bottom: 15px;">💬 <strong>WhatsApp:</strong> 347 5301151</p>
                    <button onclick="window.location.href='tel:0892868938'" style="background: #2196f3; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-right: 10px;">
                        📞 Chiama per Consulenza
                    </button>
                    <button onclick="window.open('https://wa.me/3475301151?text=Salve, ho consultato il chatbot del sito e vorrei una consulenza legale per il mio caso', '_blank')" style="background: #25d366; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        💬 Scrivi su WhatsApp
                    </button>
                </div>
            </div>
        `;
    }
    
    // Incrementa contatore
    localStorage.setItem('questions_' + today, parseInt(userQuestions) + 1);
    
    const chatMessages = document.getElementById('chat-messages');
    
    // Mostra "sta scrivendo..."
    const typingDiv = document.createElement('div');
    typingDiv.innerHTML = '<div style="padding: 15px; color: #666;"><i class="fas fa-circle-notch fa-spin"></i> Sto analizzando la tua domanda...</div>';
    chatMessages.appendChild(typingDiv);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                messaggio: message 
            })
        });
        
        const data = await response.json();
        typingDiv.remove();
        
        if (data.choices && data.choices[0]) {
            let aiResponse = data.choices[0].message.content;
            
            aiResponse += `
                <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                    <button onclick="window.location.href='tel:0892868938'" style="background: #00a651; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-weight: 600; cursor: pointer;">
                        📞 Consulenza: 089 2868938
                    </button>
                </div>
            `;
            
            return aiResponse;
        }
        
    } catch (error) {
        console.error('Errore:', error);
        typingDiv.remove();
        return 'Mi dispiace, errore tecnico. Chiama direttamente: 089 2868938';
    }
}

// Funzione per aprire consultation form
function openConsultation(service) {
    showConsultationForm(service);
}

function showConsultationForm(service) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 20px; max-width: 500px; position: relative; max-height: 90vh; overflow-y: auto;">
            <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
            
            <h3 style="color: #0a1628; margin-bottom: 20px; text-align: center;">
                📅 Prenota prima consulenza
            </h3>
            
            <p style="margin-bottom: 20px; color: #666; text-align: center;">
                Servizio richiesto: <strong>${getServiceName(service)}</strong>
            </p>
            
            <form onsubmit="submitConsultation(event, '${service}')">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Nome e Cognome *</label>
                    <input type="text" name="nome" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Email *</label>
                    <input type="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Telefono *</label>
                    <input type="tel" name="telefono" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Breve descrizione della questione</label>
                    <textarea name="descrizione" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical; font-size: 14px;" placeholder="Descrivi brevemente la tua situazione..."></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.9rem; color: #333; cursor: pointer;">
                        <input type="checkbox" name="privacy" required style="
                            width: 18px; 
                            height: 18px; 
                            border: 2px solid #0a1628; 
                            border-radius: 3px;
                            background: white;
                            cursor: pointer;
                            margin: 0;
                            flex-shrink: 0;
                            appearance: none;
                            -webkit-appearance: none;
                            position: relative;
                        " onchange="this.style.backgroundColor = this.checked ? '#00a651' : 'white'; this.style.borderColor = this.checked ? '#00a651' : '#0a1628';">
                        <span style="line-height: 1.4;">Accetto l'<a href="#privacy" style="color: #0a1628;">informativa privacy</a> e autorizzo il trattamento dei dati per la finalità richiesta</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 0.9rem; color: #666;">
                    <strong>Informativa:</strong> La prima consulenza è finalizzata alla valutazione preliminare del caso. 
                    Non costituisce parere legale definitivo né garanzia di risultato, come previsto dal Codice Deontologico Forense.
                </div>
                
                <button type="submit" style="width: 100%; background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%); color: white; border: none; padding: 15px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                    📞 Prenota Consulenza
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function getServiceName(service) {
    const serviceNames = {
        'analisi-documenti': 'Analisi documentale',
        'calcolo-risarcimenti': 'Valutazione risarcimenti',
        'ricerca-giurisprudenza': 'Ricerca giurisprudenziale',
        'pianificazione-procedurale': 'Pianificazione procedurale',
        'preventivi-trasparenti': 'Preventivazione trasparente',
        'supporto-documentale': 'Supporto documentale',
        'diagnostico-231': 'Diagnostico Rischio 231',
        'conformity-check': 'Controllo Atti Amministrativi',
        'verifica-pnrr': 'Verifica Requisiti PNRR'
    };
    return serviceNames[service] || 'Consulenza generale';
}

window.submitConsultation = function(event, service) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        service: service,
        nome: formData.get('nome'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        descrizione: formData.get('descrizione'),
        timestamp: new Date().toISOString()
    };
    
    // Determina quale endpoint Formspree usare
    let formEndpoint;
    switch(service) {
        case 'analisi-documenti': 
            formEndpoint = 'https://formspree.io/f/meokvzra'; 
            break;
        case 'calcolo-risarcimenti': 
            formEndpoint = 'https://formspree.io/f/xovwylkd'; 
            break;
        case 'ricerca-giurisprudenza': 
            formEndpoint = 'https://formspree.io/f/mgvyrzny'; 
            break;
        case 'pianificazione-procedurale': 
            formEndpoint = 'https://formspree.io/f/mpwrklyl'; 
            break;
        case 'preventivi-trasparenti': 
            formEndpoint = 'https://formspree.io/f/mvgrdqww'; 
            break;
        default: 
            formEndpoint = 'https://formspree.io/f/meokvzra';
    }

    // Invia email vera tramite Formspree
    fetch(formEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: data.email,
            nome: data.nome,
            telefono: data.telefono,
            servizio: getServiceName(service),
            descrizione: data.descrizione,
            _subject: `Nuova prenotazione: ${getServiceName(service)}`,
            _autoresponse: 'Grazie per la tua richiesta. Ti contatteremo entro 24 ore.'
        })
    }).then(response => {
        if (response.ok) {
            console.log('Email inviata con successo!');
        } else {
            console.error('Errore invio email');
        }
    }).catch(error => {
        console.error('Errore:', error);
    });
    
    event.target.parentElement.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 3rem; color: #4CAF50; margin-bottom: 20px;">&#10003;</div>
            <h3 style="color: #0a1628; margin-bottom: 15px;">Prenotazione ricevuta!</h3>
            <p style="color: #666; margin-bottom: 20px;">
                Ti contatteremo entro <strong>24 ore lavorative</strong> per confermare 
                l'appuntamento e fornirti tutte le informazioni necessarie.
            </p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                <strong>Prossimi passi:</strong><br>
                1. Riceverai email di conferma<br>
                2. Ti contatteremo per fissare data/ora<br>
                3. Ti invieremo promemoria dell'appuntamento
            </div>
            <button onclick="var modal = this.parentElement; while(modal && modal.style.position !== 'fixed') { modal = modal.parentElement; } if(modal) modal.remove();" style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer;">
                Chiudi
            </button>
        </div>
    `;
}

// Diagnostico 231
document.addEventListener('DOMContentLoaded', function() {
    if(document.getElementById('diagnostico-container')){
        const questions=[
            {q:"La sua azienda partecipa a gare d'appalto pubbliche?",y:10,n:0,risk:"Appalti pubblici"},
            {q:"Ha rapporti continuativi con la Pubblica Amministrazione?",y:10,n:0,risk:"Rapporti con PA"},
            {q:"Gestisce fondi pubblici (PNRR, contributi, finanziamenti)?",y:15,n:0,risk:"Gestione fondi pubblici"},
            {q:"L'azienda ha più di 10 dipendenti?",y:8,n:0,risk:"Struttura aziendale complessa"},
            {q:"Il fatturato annuo supera i 2 milioni di euro?",y:8,n:0,risk:"Dimensione aziendale rilevante"},
            {q:"Opera in settori regolamentati (sanità, ambiente, rifiuti)?",y:12,n:0,risk:"Settore regolamentato"},
            {q:"Ha subito ispezioni o controlli negli ultimi 24 mesi?",y:10,n:0,risk:"Controlli delle autorità"},
            {q:"Esistono deleghe e procure formalizzate?",y:0,n:7,risk:"Sistema deleghe da strutturare"},
            {q:"È presente un sistema di controllo interno?",y:0,n:10,risk:"Controlli interni da implementare"},
            {q:"È già dotata di un Modello 231?",y:0,n:10,risk:"Assenza Modello 231"}
        ];
        let score=0,current=0,risks=[];
        const container=document.getElementById('questions-container');
        
        function showQ(){
            if(current<questions.length){
                container.innerHTML=`<p style="color:#666;margin-bottom:10px">Domanda ${current+1} di 10</p>
                <h3 style="color:#0a1628;margin-bottom:20px">${questions[current].q}</h3>
                <div style="display:flex;gap:15px;justify-content:center">
<button onclick="answer(true)" class="btn-primary">Sì</button>
<button onclick="answer(false)" class="btn-secondary">No</button>
<button onclick="answer('dubbio')" style="background:#ff9800;color:white;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer">Non sono sicuro</button>
</div>`;
            }else if(current==questions.length){
                container.innerHTML=`<h3 style="color:#0a1628;margin-bottom:20px">Ricevi l'analisi completa</h3>
                <p style="margin-bottom:15px">Inserisci la tua email per visualizzare il report dettagliato:</p>
                <form onsubmit="showResults(event)" style="display:flex;flex-direction:column;gap:15px">
                <input type="email" id="email231" placeholder="email@azienda.it" required style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px">
                <button type="submit" class="btn-primary" style="width:100%">Visualizza Analisi</button>
                </form>`;
            }
        }
        
        window.answer=function(risposta){
            const q=questions[current];
            if(risposta===true && q.y>0){
                score+=q.y;
                risks.push(q.risk);
            }else if(risposta===false && q.n>0){
                score+=q.n;
                risks.push(q.risk);
            }else if(risposta==='dubbio'){
                score+=(q.y>0 ? q.y/2 : q.n/2);
                risks.push(q.risk + " (da verificare)");
            }
            current++;
            showQ();
        }
        
        window.showResults=function(e){
            if(e)e.preventDefault();
            const email=document.getElementById('email231').value;
            if(!email)return;
            let level,msg;
            if(score<30){level="Basso";msg="Situazione sotto controllo";}
            else if(score<60){level="Medio";msg="Opportuno un approfondimento";}
            else{level="Elevato";msg="Consigliabile intervento tempestivo";}
            
            // Invia email tramite Formspree
            fetch('https://formspree.io/f/xkgbyqrg', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: email,
                    _subject: 'Diagnostico 231 Completato - Score: ' + score,
                    messaggio: `Score: ${score}/100\nLivello: ${level}\nAree: ${risks.join(', ')}`,
                    _autoresponse: 'Grazie per aver completato il diagnostico. La contatteremo entro 24 ore.'
                })
            }).then(r => console.log('Email inviata'));
            
            document.getElementById('diagnostico-container').innerHTML=`
            <div style="text-align:center;padding:20px">
            <h2 style="color:#0a1628">Analisi Completata</h2>
            <div style="background:#f8f9fa;padding:30px;border-radius:10px;margin:20px 0">
            <h3>Livello di Rischio: ${level}</h3>
            <p style="font-size:2rem;font-weight:bold;color:${score>60?'#dc2626':score>30?'#f59e0b':'#059669'}">${score}/100</p>
            <p style="color:#666;margin-top:10px">${msg}</p>
            </div>
            ${risks.length?`<div style="background:#f8f9fa;padding:20px;margin:20px 0;border-radius:8px;text-align:left">
            <h4 style="color:#0a1628;margin-bottom:15px">Aree di attenzione identificate:</h4>
            <ul style="list-style:none;padding:0">${risks.map(r=>`<li style="padding:5px 0">✓ ${r}</li>`).join('')}</ul>
            </div>`:''}
            <button onclick="location.href='#contatti'" class="btn-primary" style="padding:15px 30px;font-size:1.1rem">
            Richiedi Consulenza Specialistica
            </button>
            </div>`;
        }
        showQ();
    }
});

// Conformity Check PA
document.addEventListener('DOMContentLoaded', function() {
    if(document.getElementById('conformity-container')){
        const checks=[
            {q:"L'atto contiene una motivazione completa e dettagliata?",weight:15,area:"Motivazione"},
            {q:"Sono indicati tutti i riferimenti normativi applicabili?",weight:10,area:"Base giuridica"},
            {q:"L'istruttoria procedimentale è documentata?",weight:12,area:"Istruttoria"},
            {q:"I termini del procedimento sono stati rispettati?",weight:10,area:"Tempistica"},
            {q:"Le comunicazioni agli interessati sono complete?",weight:8,area:"Comunicazioni"},
            {q:"Il responsabile del procedimento è chiaramente indicato?",weight:8,area:"Responsabilità"},
            {q:"Sono stati valutati tutti gli interessi pubblici e privati?",weight:12,area:"Bilanciamento interessi"},
            {q:"L'atto rispetta i principi di proporzionalità e ragionevolezza?",weight:10,area:"Principi generali"},
            {q:"La pubblicazione rispetta la normativa trasparenza?",weight:8,area:"Pubblicità"},
            {q:"Sono indicate le modalità di impugnazione?",weight:7,area:"Tutela"}
        ];
        let current=0,score=0,missing=[];
        const container=document.getElementById('conformity-questions');
        
        function showCheck(){
            if(current<checks.length){
                container.innerHTML=`<p style="color:#666;margin-bottom:10px">Verifica ${current+1} di ${checks.length}</p>
                <h3 style="color:#0a1628;margin-bottom:20px">${checks[current].q}</h3>
                <div style="display:flex;gap:15px;justify-content:center">
                <button onclick="checkAnswer(true)" class="btn-primary">Sì</button>
                <button onclick="checkAnswer(false)" class="btn-secondary">No</button>
                <button onclick="checkAnswer('dubbio')" style="background:#ff9800;color:white;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer">Non sono sicuro</button>                
                </div>
                <div style="margin-top:20px;padding:15px;background:#e8f4fd;border-radius:8px">
                <p style="font-size:0.9rem;color:#0a1628"><strong>Area:</strong> ${checks[current].area}</p>
                </div>`;
            }else{
                container.innerHTML=`<h3 style="color:#0a1628;margin-bottom:20px">Ricevi il report di conformità</h3>
                <p style="margin-bottom:15px">Inserisci la tua email per il report completo:</p>
                <form onsubmit="collectEmailAndShow(event)" style="display:flex;flex-direction:column;gap:15px">
                <input type="email" id="emailPA" placeholder="email@ente.it" required style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px">
                <button type="submit" class="btn-primary" style="width:100%">Visualizza Report</button>
                </form>`;
            }
        }
        
        window.collectEmailAndShow=function(e){
            if(e)e.preventDefault();
            const email=document.getElementById('emailPA').value;
            if(!email)return;
            // Invia email tramite Formspree
            fetch('https://formspree.io/f/xyzjonjl', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: email,
                    _subject: 'Conformity Check PA - Score: ' + score + '%',
                    messaggio: `Score: ${score}%\nAree mancanti: ${missing.join(', ')}`,
                    _autoresponse: 'Report Conformity Check ricevuto. La contatteremo per supporto specialistico.'
                })
            }).then(r => console.log('Email PA inviata'));
            showConformityResults();
        }
        
        window.checkAnswer=function(risposta){
            if(risposta===true){
                score+=checks[current].weight;
            }else if(risposta===false){
                missing.push(checks[current].area);
            }else if(risposta==='dubbio'){
                score+=checks[current].weight/2;
                missing.push(checks[current].area + " (da verificare)");
            }
            current++;
            showCheck();
        }
        
        function showConformityResults(){
            let level,msg;
            if(score>=90){level="Ottimale";msg="Atto ben strutturato";}
            else if(score>=70){level="Buono";msg="Margini di miglioramento";}
            else if(score>=50){level="Sufficiente";msg="Alcune criticità da valutare";}
            else{level="Insufficiente";msg="Necessari interventi correttivi";}
            
            document.getElementById('conformity-container').innerHTML=`
            <div style="text-align:center;padding:20px">
            <h2 style="color:#0a1628">Verifica Completata</h2>
            <div style="background:white;padding:30px;border-radius:10px;margin:20px 0;border:2px solid ${score>=70?'#059669':'#f59e0b'}">
            <h3>Indice di Conformità</h3>
            <p style="font-size:3rem;font-weight:bold;color:${score>=70?'#059669':'#f59e0b'}">${score}%</p>
            <p style="color:#666;margin-top:10px">${msg}</p>
            </div>
            ${missing.length?`<div style="background:#fef9c3;padding:20px;margin:20px 0;border-radius:8px;text-align:left">
            <h4 style="color:#0a1628;margin-bottom:15px">Aree di attenzione:</h4>
            <ul style="list-style:none;padding:0">${missing.map(m=>`<li style="padding:5px 0">• ${m}</li>`).join('')}</ul>
            </div>`:''}
            <button onclick="location.href='#contatti'" class="btn-primary" style="padding:15px 30px">
            Richiedi Consulenza Amministrativa
            </button>
            </div>`;
        }
        showCheck();
    }
});

// Verifica PNRR
document.addEventListener('DOMContentLoaded', function() {
    if(document.getElementById('pnrr-container')){
        const pnrrChecks = [
            {q: "Il progetto rispetta i tempi previsti dal cronoprogramma?", weight: 15, area: "Rispetto tempistiche"},
            {q: "La procedura di gara segue il Codice Appalti aggiornato?", weight: 12, area: "Conformità procedure"},
            {q: "Sono stati verificati i requisiti 'non arrecare danno significativo'?", weight: 10, area: "Principio DNSH"},
            {q: "La documentazione include tutti gli indicatori richiesti?", weight: 10, area: "Documentazione"},
            {q: "È presente il codice CUP in tutti gli atti?", weight: 8, area: "Tracciabilità"},
            {q: "I fornitori rispettano i requisiti di parità di genere?", weight: 8, area: "Requisiti sociali"},
            {q: "La rendicontazione segue le linee guida ministeriali?", weight: 12, area: "Rendicontazione"},
            {q: "Sono stati caricati i dati su ReGiS?", weight: 10, area: "Sistema monitoraggio"},
            {q: "Il progetto rispetta gli obiettivi digitali/verdi previsti?", weight: 8, area: "Obiettivi trasversali"},
            {q: "È stata verificata l'assenza di doppio finanziamento?", weight: 7, area: "Controlli antifrode"}
        ];
        
        let currentPnrr = 0, scorePnrr = 0, missingPnrr = [];
        const containerPnrr = document.getElementById('pnrr-questions');
        
        function showPnrrCheck(){
            if(currentPnrr < pnrrChecks.length){
                containerPnrr.innerHTML = `
                    <p style="color:#666;margin-bottom:10px">Controllo ${currentPnrr + 1} di ${pnrrChecks.length}</p>
                    <h3 style="color:#0a1628;margin-bottom:20px">${pnrrChecks[currentPnrr].q}</h3>
                    <div style="display:flex;gap:15px;justify-content:center">
                        <button onclick="pnrrAnswer(true)" class="btn-primary">Sì</button>
                        <button onclick="pnrrAnswer(false)" class="btn-secondary">No</button>
                        <button onclick="pnrrAnswer('dubbio')" style="background:#ff9800;color:white;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer">
                            Non sono sicuro
                        </button>
                    </div>
                    <div style="margin-top:20px;padding:15px;background:#e8f4fd;border-radius:8px">
                        <p style="font-size:0.9rem;color:#0a1628"><strong>Area:</strong> ${pnrrChecks[currentPnrr].area}</p>
                    </div>`;
            } else {
                containerPnrr.innerHTML = `
                    <h3 style="color:#0a1628;margin-bottom:20px">Ricevi il rapporto di conformità PNRR</h3>
                    <p style="margin-bottom:15px">Inserisci la tua email istituzionale:</p>
                    <form onsubmit="showPnrrResults(event)" style="display:flex;flex-direction:column;gap:15px">
                        <input type="email" id="emailPNRR" placeholder="nome@comune.it" required 
                               style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px">
                        <button type="submit" class="btn-primary" style="width:100%">Visualizza Rapporto</button>
                    </form>`;
            }
        }
        
        window.pnrrAnswer = function(answer){
            if(answer === true){
                scorePnrr += pnrrChecks[currentPnrr].weight;
            } else if(answer === false){
                missingPnrr.push(pnrrChecks[currentPnrr].area);
            } else if(answer === 'dubbio'){
                scorePnrr += pnrrChecks[currentPnrr].weight / 2;
                missingPnrr.push(pnrrChecks[currentPnrr].area + " (da verificare)");
            }
            currentPnrr++;
            showPnrrCheck();
        }
        
        window.showPnrrResults = function(e){
            if(e) e.preventDefault();
            const email = document.getElementById('emailPNRR').value;
            if(!email) return;
            // Invia email tramite Formspree
            fetch('https://formspree.io/f/mwpbyrye', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: email,
                    _subject: 'Verifica PNRR - Punteggio: ' + scorePnrr + '%',
                    messaggio: `Punteggio: ${scorePnrr}%\nAree critiche: ${missingPnrr.join(', ')}`,
                    _autoresponse: 'Rapporto conformità PNRR ricevuto. La contatteremo per assistenza specialistica.'
                })
            }).then(r => console.log('Email PNRR inviata'));
            
            let level, msg, color;
            if(scorePnrr >= 85){
                level = "Conformità Alta";
                msg = "Il progetto rispetta i requisiti principali";
                color = "#059669";
            } else if(scorePnrr >= 65){
                level = "Conformità Media"; 
                msg = "Necessarie alcune verifiche";
                color = "#f59e0b";
            } else {
                level = "Conformità Critica";
                msg = "Rischio revoca finanziamento";
                color = "#dc2626";
            }
            
            document.getElementById('pnrr-container').innerHTML = `
                <div style="text-align:center;padding:20px">
                    <h2 style="color:#0a1628">Verifica Completata</h2>
                    <div style="background:white;padding:30px;border-radius:10px;margin:20px 0;border:3px solid ${color}">
                        <h3>Livello Conformità PNRR</h3>
                        <p style="font-size:3rem;font-weight:bold;color:${color}">${scorePnrr}%</p>
                        <p style="color:#666;margin-top:10px;font-size:1.2rem">${msg}</p>
                    </div>
                    ${missingPnrr.length ? `
                        <div style="background:#fef9c3;padding:20px;margin:20px 0;border-radius:8px;text-align:left">
                            <h4 style="color:#0a1628;margin-bottom:15px">
                                <i class="fas fa-exclamation-triangle"></i> Aree che richiedono attenzione:
                            </h4>
                            <ul style="list-style:none;padding:0">
                                ${missingPnrr.map(m => `<li style="padding:8px 0;border-bottom:1px solid #e0e0e0">• ${m}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <div style="background:#e3f2fd;padding:20px;margin:20px 0;border-radius:8px">
                        <p style="color:#0a1628;margin:0">
                            <strong>Importante:</strong> La non conformità può comportare la revoca del finanziamento 
                            e l'obbligo di restituzione delle somme. È consigliabile una verifica legale approfondita 
                            per proteggere l'Ente da responsabilità amministrative e contabili.
                        </p>
                    </div>
                    <button onclick="location.href='#contatti'" class="btn-primary" style="padding:15px 30px;font-size:1.1rem">
                        <i class="fas fa-shield-alt"></i> Richiedi Assistenza Legale PNRR
                    </button>
                </div>`;
        }
        
        showPnrrCheck();
    }
});
