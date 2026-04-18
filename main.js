// Helper: escape HTML per prevenire XSS quando interpoliamo input utente in innerHTML
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Helper: POST JSON a Formspree con gestione errori.
// Lancia un errore se la richiesta fallisce, così il chiamante può mostrare feedback adeguato.
async function postFormspree(endpoint, payload) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error('HTTP ' + response.status);
    }
    return response;
}

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

// Contact form — presente solo in index.html
const contactFormEl = document.getElementById('contactForm');
if (contactFormEl) {
    contactFormEl.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = {
            nome: formData.get('nome'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            servizio: formData.get('servizio'),
            messaggio: formData.get('messaggio'),
            _subject: 'Nuova richiesta dal sito - ' + (formData.get('servizio') || 'Contatto generico')
        };

        try {
            const response = await fetch('https://formspree.io/f/mrblgoob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Richiesta inviata con successo! Ti contatteremo entro 24 ore.');
                this.reset();
            } else {
                alert('Errore nell\'invio. Contattare lo Studio al 089 2868938.');
            }
        } catch (error) {
            alert('Errore nell\'invio. Contattare lo Studio al 089 2868938.');
        }
    });
}

// Chatbot rimosso (brief sessione 1). Il backend /api/chat resta in server.js per ricostruzione futura.

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
        'amministrativo': 'Contenzioso Amministrativo',
        'civile-penale': 'Contenzioso Civile e Penale',
        'energia-tech': "Diritto dell'Energia e Nuove Tecnologie",
        'fondi-pubblici': 'Fondi Pubblici e Revisione Legale e Contabile',
        'consulenza-generale': 'Consulenza Generale',
        // Compatibilità con i 2 quiz rimasti in index.html (conformity-check e verifica-pnrr)
        'conformity-check': 'Controllo Atti Amministrativi',
        'verifica-pnrr': 'Verifica Requisiti PNRR'
    };
    return serviceNames[service] || 'Consulenza generale';
}

window.submitConsultation = async function(event, service) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = {
        service: service,
        nome: formData.get('nome'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        descrizione: formData.get('descrizione'),
        timestamp: new Date().toISOString()
    };

    // Un unico endpoint Formspree per tutte le richieste di consulenza delle 4 aree.
    const formEndpoint = 'https://formspree.io/f/meokvzra';

    // Disabilita submit durante l'invio
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Invio in corso...';
    }

    try {
        await postFormspree(formEndpoint, {
            email: data.email,
            nome: data.nome,
            telefono: data.telefono,
            servizio: getServiceName(service),
            descrizione: data.descrizione,
            _subject: `Nuova prenotazione: ${getServiceName(service)}`,
            _autoresponse: 'Grazie per la tua richiesta. Ti contatteremo entro 24 ore.'
        });

        form.parentElement.innerHTML = `
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
    } catch (err) {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
        alert('Invio non riuscito. Riprova o contattaci al 089 2868938.');
    }
}

// Diagnostico 231 rimosso (brief sessione 1 — lo Studio non eroga servizio 231).

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
        
        window.collectEmailAndShow = async function(e){
            if(e)e.preventDefault();
            const email=document.getElementById('emailPA').value;
            if(!email)return;
            try {
                await postFormspree('https://formspree.io/f/xyzjonjl', {
                    email: email,
                    _subject: 'Conformity Check PA - Score: ' + score + '%',
                    messaggio: `Score: ${score}%\nAree mancanti: ${missing.join(', ')}`,
                    _autoresponse: 'Report Conformity Check ricevuto. La contatteremo per supporto specialistico.'
                });
            } catch (err) {
                alert('Report non inviato per email (problema di rete). Il risultato è comunque visibile.');
            }
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
        
        window.showPnrrResults = async function(e){
            if(e) e.preventDefault();
            const email = document.getElementById('emailPNRR').value;
            if(!email) return;
            try {
                await postFormspree('https://formspree.io/f/mwpbyrye', {
                    email: email,
                    _subject: 'Verifica PNRR - Punteggio: ' + scorePnrr + '%',
                    messaggio: `Punteggio: ${scorePnrr}%\nAree critiche: ${missingPnrr.join(', ')}`,
                    _autoresponse: 'Rapporto conformità PNRR ricevuto. La contatteremo per assistenza specialistica.'
                });
            } catch (err) {
                alert('Report non inviato per email (problema di rete). Il risultato è comunque visibile.');
            }
            
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

// ==========================================================================
// Orientamento giuridico — chatbot nella homepage (sezione #assistente)
// ==========================================================================

const CHAT_LIMIT = 10;
let chatCount = 0;

window.handleChat = async function(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const message = input.value.trim();
    if (!message) return;

    appendChatMessage(message, 'user');
    input.value = '';
    input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    const typingEl = showChatTyping();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaggio: message })
        });

        if (typingEl) typingEl.remove();

        if (response.status === 429) {
            const data = await response.json().catch(() => ({}));
            const msg = data.message || 'Limite giornaliero raggiunto. Contatta lo Studio al 089 2868938.';
            appendChatMessage(msg, 'assistant');
            const form = document.getElementById('chat-form');
            if (form) form.style.display = 'none';
            const counter = document.getElementById('chat-counter');
            if (counter) { counter.textContent = 'Limite giornaliero raggiunto'; counter.style.color = '#dc2626'; }
            return;
        }

        const data = await response.json();

        if (response.ok && data.choices && data.choices[0]) {
            chatCount++;
            appendChatMessage(data.choices[0].message.content, 'assistant');
            updateChatCounter();
        } else {
            appendChatMessage('Si è verificato un errore. Contattare lo Studio al 089 2868938.', 'assistant');
        }
    } catch (err) {
        if (typingEl) typingEl.remove();
        appendChatMessage('Si è verificato un errore di rete. Contattare lo Studio al 089 2868938.', 'assistant');
    } finally {
        input.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        input.focus();
    }
};

function appendChatMessage(text, role) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    if (role === 'user') {
        div.style.cssText = 'background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%); color: white; padding: 12px 16px; border-radius: 12px; max-width: 80%; margin-left: auto; margin-bottom: 12px; white-space: pre-wrap; word-wrap: break-word;';
    } else {
        div.style.cssText = 'background: #f4f5f7; color: #1a1a1a; padding: 12px 16px; border-radius: 12px; max-width: 80%; margin-bottom: 12px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;';
    }
    // textContent previene XSS su input utente e su output modello
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showChatTyping() {
    const container = document.getElementById('chat-messages');
    if (!container) return null;
    const div = document.createElement('div');
    div.style.cssText = 'color: #999; padding: 8px 4px; font-size: 0.9rem; font-style: italic;';
    div.textContent = 'In elaborazione...';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
}

function updateChatCounter() {
    const counter = document.getElementById('chat-counter');
    if (!counter) return;
    const remaining = CHAT_LIMIT - chatCount;
    if (remaining <= 3 && remaining > 0) {
        counter.textContent = remaining + ' domande rimanenti oggi';
        counter.style.color = '#f59e0b';
    } else if (remaining <= 0) {
        counter.textContent = 'Limite giornaliero raggiunto';
        counter.style.color = '#dc2626';
    }
}

// ==========================================================================
// Cookie banner tecnico (cookie_consent, 12 mesi, prima visita)
// ==========================================================================
(function cookieBanner() {
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }
    function setCookie(name, value, days) {
        const maxAge = days * 24 * 60 * 60;
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = name + '=' + encodeURIComponent(value) + '; Max-Age=' + maxAge + '; Path=/; SameSite=Lax' + secure;
    }

    if (getCookie('cookie_consent') === 'accepted') return;

    function renderBanner() {
        if (document.getElementById('site-cookie-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'site-cookie-banner';
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Informativa cookie');
        banner.innerHTML =
            '<div class="cookie-banner-inner">' +
                '<p class="cookie-banner-text">Questo sito utilizza esclusivamente cookie tecnici necessari al funzionamento. Nessun cookie di profilazione o marketing. Consulta la <a href="cookie-policy.html">Cookie Policy</a> per maggiori informazioni.</p>' +
                '<div class="cookie-banner-actions">' +
                    '<a href="cookie-policy.html" class="cookie-banner-btn cookie-banner-btn-secondary">Cookie Policy</a>' +
                    '<button type="button" class="cookie-banner-btn cookie-banner-btn-primary" id="cookie-banner-accept">Accetta</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(banner);
        document.getElementById('cookie-banner-accept').addEventListener('click', function () {
            setCookie('cookie_consent', 'accepted', 365);
            banner.remove();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderBanner);
    } else {
        renderBanner();
    }
})();