// ===================================================================
// PHARMAHR AI - ASSISTANT INTELLIGENT RH POUR PHARMACIE
// VERSION 2.0 - AGENT D├ëCISIONNEL R├ëEL AVEC GROQ
// ===================================================================

// ===== DONN├ëES SIMUL├ëES =====
const employees = [
    { id: 1, name: "Dr. Sophie Martin", role: "pharmacien", diplome: true, maxHours: 35 },
    { id: 2, name: "Dr. Pierre Dubois", role: "pharmacien", diplome: true, maxHours: 35 },
    { id: 3, name: "Dr. Marie Laurent", role: "pharmacien", diplome: true, maxHours: 40 },
    { id: 4, name: "Dr. Jean Moreau", role: "pharmacien", diplome: true, maxHours: 32 },
    { id: 5, name: "Alice Bernard", role: "preparateur", diplome: false, maxHours: 35 },
    { id: 6, name: "Thomas Petit", role: "preparateur", diplome: false, maxHours: 35 },
    { id: 7, name: "Clara Roux", role: "preparateur", diplome: false, maxHours: 40 },
    { id: 8, name: "Lucas Garcia", role: "preparateur", diplome: false, maxHours: 35 },
    { id: 9, name: "Emma Leroy", role: "preparateur", diplome: false, maxHours: 30 },
    { id: 10, name: "Julie Bonnet", role: "administratif", diplome: false, maxHours: 35 },
    { id: 11, name: "Marc Simon", role: "administratif", diplome: false, maxHours: 35 },
    { id: 12, name: "Sarah Blanc", role: "administratif", diplome: false, maxHours: 28 }
];

const absences = [
    { employeeId: 3, date: "2026-03-02", reason: "Cong├®" },
    { employeeId: 7, date: "2026-03-03", reason: "Formation" }
];

let currentSchedule = [];
let currentAlerts = [];
let activityLevel = "normal";

// ===== CONFIGURATION GROQ =====
const GROQ_PROXY_URL = 'http://localhost:3000/groq';

// ===== PERSISTENCE =====
function saveState() {
    try {
        localStorage.setItem('pharmahr_state_v1', JSON.stringify({
            absences, currentSchedule, currentAlerts,
            leaveRequests, announcements, conversations, messages
        }));
    } catch (e) { console.error('Erreur sauvegarde', e); }
}

function loadState() {
    try {
        const raw = localStorage.getItem('pharmahr_state_v1');
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.absences) absences.splice(0, absences.length, ...s.absences);
        if (s.currentSchedule) currentSchedule = s.currentSchedule;
        if (s.currentAlerts) currentAlerts = s.currentAlerts;
        if (s.leaveRequests) leaveRequests = s.leaveRequests;
        if (s.announcements) announcements = s.announcements;
        if (s.conversations) conversations = s.conversations;
        if (s.messages) messages = s.messages;
    } catch (e) { console.error('Erreur chargement', e); }
}

// ===== APPEL GROQ =====
async function callGroqLLM(userMessage, opts = {}) {
    const systemPrompt = opts.systemPrompt || buildAgentSystemPrompt();
    const body = {
        model: "llama-3.1-8b-instant",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ],
        max_tokens: opts.maxTokens || 600,
        temperature: 0.3
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const res = await fetch(GROQ_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`Groq error: ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

// ===== PROMPT SYST├êME AGENT D├ëCISIONNEL =====
function buildAgentSystemPrompt() {
    const pharmaciens = employees.filter(e => e.role === 'pharmacien');
    const absentsAujourdHui = absences.filter(a => a.date === new Date().toISOString().slice(0,10));
    const pharmaciensAbsents = absentsAujourdHui.filter(a => pharmaciens.find(p => p.id === a.employeeId));
    const pharmaciensPresents = pharmaciens.length - pharmaciensAbsents.length;
    const totalPresents = employees.length - absentsAujourdHui.length;
    const couverture = Math.round((totalPresents / employees.length) * 100);

    return `Tu es PharmaHR AI, un agent d├®cisionnel intelligent sp├®cialis├® RH pour pharmacies.

├ëTAT ACTUEL DE LA PHARMACIE :
- Total employ├®s : ${employees.length}
- Pharmaciens dipl├┤m├®s disponibles : ${pharmaciensPresents}/${pharmaciens.length}
- Employ├®s pr├®sents aujourd'hui : ${totalPresents}/${employees.length}
- Taux de couverture : ${couverture}%
- Absences enregistr├®es : ${absences.length}
- Niveau d'activit├® : ${activityLevel}
- Planning g├®n├®r├® : ${currentSchedule.length > 0 ? 'Oui (' + new Set(currentSchedule.map(s=>s.day)).size + ' jours)' : 'Non'}

R├êGLES R├ëGLEMENTAIRES OBLIGATOIRES :
1. Au moins 1 pharmacien dipl├┤m├® par shift (LOI)
2. Maximum 8h de travail par jour par employ├®
3. Taux de couverture minimum : 60%
4. Demande de cong├® : 14 jours minimum ├á l'avance

TON R├öLE D'AGENT D├ëCISIONNEL :
- Tu PRENDS des d├®cisions, tu ne te contentes pas de r├®pondre
- Tu JUSTIFIES chaque d├®cision avec des donn├®es chiffr├®es
- Tu ANTICIPES les probl├¿mes avant qu'ils arrivent
- Tu PROPOSES des actions concr├¿tes
- Tu ALERTES proactivement si tu d├®tectes un risque
- Tes r├®ponses sont en fran├ºais, professionnelles et concises
- Tu cites toujours les chiffres exacts (nombre d'employ├®s, taux, etc.)

FORMAT DE R├ëPONSE :
- Commence par une d├®cision ou observation claire
- Justifie avec les donn├®es disponibles
- Propose toujours une action suivante concr├¿te
- Si risque d├®tect├® : signale-le explicitement avec ­ƒÜ¿`;
}

// ===================================================================
// ===== AGENT D├ëCISIONNEL PROACTIF =====
// ===================================================================

const decisionAgent = {

    // Analyse automatique au d├®marrage
    async analyzeOnStartup() {
        const issues = [];
        const pharmaciens = employees.filter(e => e.role === 'pharmacien');
        const today = new Date().toISOString().slice(0,10);
        const absentsToday = absences.filter(a => a.date === today);
        const pharmaciensAbsents = absentsToday.filter(a => pharmaciens.find(p => p.id === a.employeeId));

        if (pharmaciensAbsents.length > 0) {
            issues.push(`­ƒÜ¿ ${pharmaciensAbsents.length} pharmacien(s) absent(s) aujourd'hui`);
        }
        if (absences.length >= 3) {
            issues.push(`ÔÜá´©Å ${absences.length} absences enregistr├®es cette semaine`);
        }
        if (currentSchedule.length === 0) {
            issues.push(`­ƒôà Aucun planning g├®n├®r├® pour la semaine`);
        }

        if (issues.length === 0) return null;

        const prompt = `En tant qu'agent d├®cisionnel, analyse cette situation et donne une recommandation imm├®diate en 3-4 phrases maximum :
${issues.join('\n')}
Donne une d├®cision claire et actionnable.`;

        try {
            return await callGroqLLM(prompt, { maxTokens: 200 });
        } catch {
            return issues.join('\n') + '\n\nÔåÆ V├®rifiez la couverture de l\'├®quipe imm├®diatement.';
        }
    },

    // D├®cision justifi├®e pour une demande de cong├®
    async decideLeave(employeeId, dateStr, dateLabel) {
        const employee = employees.find(e => e.id === employeeId);
        const pharmaciens = employees.filter(e => e.role === 'pharmacien' && e.diplome);
        const absentsJour = absences.filter(a => a.date === dateStr);
        const pharmaciensAbsents = absentsJour.filter(a => pharmaciens.find(p => p.id === a.employeeId)).length;
        const pharmaciensRestants = pharmaciens.length - pharmaciensAbsents;
        const totalPresents = employees.length - absentsJour.length - 1;
        const couverture = Math.round((totalPresents / employees.length) * 100);

        // R├¿gles dures
        let decision = 'APPROUV├ë';
        let motifRefus = '';
        if (pharmaciensRestants < 1) {
            decision = 'REFUS├ë';
            motifRefus = 'aucun pharmacien dipl├┤m├® disponible';
        } else if (couverture < 60) {
            decision = 'REFUS├ë';
            motifRefus = `taux de couverture insuffisant (${couverture}%)`;
        }

        // Demande justification ├á Groq
        const prompt = `Tu es l'agent RH d├®cisionnel. Voici une demande de cong├® :
- Employ├® : ${employee.name} (${employee.role})
- Date demand├®e : ${dateLabel}
- Pharmaciens disponibles ce jour si approuv├® : ${pharmaciensRestants}
- Taux de couverture si approuv├® : ${couverture}%
- Absents d├®j├á ce jour : ${absentsJour.length}
- D├ëCISION AUTOMATIQUE : ${decision}${motifRefus ? ' - Raison : ' + motifRefus : ''}

R├®dige une justification professionnelle de 2-3 phrases expliquant cette d├®cision ├á l'employ├®.`;

        let justification = '';
        try {
            justification = await callGroqLLM(prompt, { maxTokens: 150 });
        } catch {
            justification = decision === 'APPROUV├ë'
                ? `La demande est approuv├®e. L'├®quipe maintient une couverture de ${couverture}% avec ${pharmaciensRestants} pharmacien(s) disponible(s).`
                : `La demande est refus├®e car ${motifRefus}. Veuillez choisir une autre date.`;
        }

        return { decision, pharmaciensRestants, couverture, absentsJour: absentsJour.length, justification };
    },

    // Justification du planning g├®n├®r├®
    async justifySchedule(schedule, activityLevel) {
        const totalShifts = schedule.length;
        const shiftsAvecPharmacien = schedule.filter(s => s.pharmacistPresent).length;
        const jours = new Set(schedule.map(s => s.day)).size;
        const staffParShift = Math.round(schedule.reduce((sum, s) => sum + s.staff.length, 0) / totalShifts);

        const prompt = `Tu es l'agent d├®cisionnel RH. Tu viens de g├®n├®rer ce planning :
- ${jours} jours de travail planifi├®s
- ${totalShifts} shifts au total
- ${shiftsAvecPharmacien}/${totalShifts} shifts avec pharmacien dipl├┤m├® (${Math.round(shiftsAvecPharmacien/totalShifts*100)}%)
- Moyenne ${staffParShift} employ├®s par shift
- Niveau d'activit├® : ${activityLevel}

Justifie ce planning en 3 phrases : pourquoi ces choix sont optimaux, et s'il y a un point de vigilance.`;

        try {
            return await callGroqLLM(prompt, { maxTokens: 200 });
        } catch {
            return `Planning g├®n├®r├® sur ${jours} jours avec ${shiftsAvecPharmacien}/${totalShifts} shifts conformes. Adapt├® au niveau d'activit├® "${activityLevel}".`;
        }
    },

    // Analyse de surcharge avec recommandation Groq
    async analyzeSurchargeWithGroq(ordonnances, employeesPresent) {
        const ratio = (ordonnances / employeesPresent).toFixed(1);
        let classification = ordonnances <= 120 ? 'Normal' : ordonnances <= 180 ? 'Attention' : 'Critique';

        const prompt = `Tu es l'agent d├®cisionnel RH d'une pharmacie. Analyse cette situation de charge :
- Ordonnances pr├®vues : ${ordonnances}/jour
- Employ├®s pr├®sents : ${employeesPresent}
- Ratio : ${ratio} ordonnances/employ├®
- Classification : ${classification}

En tant qu'agent d├®cisionnel, donne :
1. Une d├®cision imm├®diate (que faire maintenant)
2. Une recommandation ├á court terme (cette semaine)
Sois pr├®cis et chiffr├®. Maximum 4 phrases.`;

        try {
            return await callGroqLLM(prompt, { maxTokens: 250 });
        } catch {
            return `Niveau ${classification} d├®tect├®. Ratio de ${ratio} ordonnances/employ├®. ${classification === 'Critique' ? 'Action imm├®diate requise : renforts n├®cessaires.' : 'Situation surveill├®e.'}`;
        }
    },

    // R├®ponse conversationnelle intelligente
    async chat(userMessage) {
        const contextPrompt = `${buildAgentSystemPrompt()}

L'utilisateur dit : "${userMessage}"

R├®ponds en tant qu'agent d├®cisionnel : analyse la situation, prends une position claire, et propose une action concr├¿te. R├®ponse en fran├ºais, concise (max 5 phrases).`;

        return await callGroqLLM(contextPrompt, { maxTokens: 400 });
    }
};

// ===== NAVIGATION =====
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(`${targetView}-view`).classList.add('active');
        });
    });
}

// ===== CHAT =====
// =======================================================
// INIT CHAT - VERSION CORRIG├ëE ET OPTIMIS├ëE (READY)
// =======================================================

function initChat() {

    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');
    const quickActions = document.querySelectorAll('.quick-action');

    // ÔÜá´©Å ID utilisateur connect├® (IMPORTANT)
    const CURRENT_USER_ID = 5; // exemple : Alice Bernard

    // ===================================================
    // ENVOI MESSAGE
    // ===================================================

    async function sendMessage() {

        const message = chatInput.value.trim();

        if (!message) return;

        addMessage(message, 'user');

        chatInput.value = '';

        // ===============================
        // Typing indicator
        // ===============================

        const typingDiv = document.createElement('div');

        typingDiv.className = 'message bot typing';

        typingDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="message-text">
                    ÔÅ│ Agent en cours d'analyse...
                </div>
            </div>
        `;

        chatMessages.appendChild(typingDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;


        try {

            // ===================================================
            // DETECTION DEMANDE CONGE
            // ===================================================

            const congeMatch = message.match(
                /(\d{1,2})[\s/-]?(janvier|f├®vrier|mars|avril|mai|juin|juillet|ao├╗t|septembre|octobre|novembre|d├®cembre)[\s/-]?(\d{4})?/i
            );


            if (message.toLowerCase().includes('cong├®') || message.toLowerCase().includes('vacance')) {

                // =====================================
                // CAS 1 : PAS DE DATE
                // =====================================

                if (!congeMatch) {

                    typingDiv.remove();

                    addMessage(
                        `­ƒôà <strong>Demande de cong├® d├®tect├®e</strong><br><br>
                        Veuillez pr├®ciser la date souhait├®e.<br><br>
                        Exemple :<br>
                        ÔÇó je veux un cong├® le 20 mars 2026<br>
                        ÔÇó cong├® 15 avril<br>
                        ÔÇó demander cong├® 3 mai`,
                        'bot'
                    );

                    return;
                }


                // =====================================
                // CAS 2 : DATE PRESENTE - SELECTION EMPLOYE
                // =====================================

                typingDiv.remove();

                await handleChatLeaveRequestWithEmployeeSelection(
                    message,
                    congeMatch
                );

                return;

            }


            // ===================================================
            // CHAT NORMAL AVEC AGENT
            // ===================================================

            const response = await decisionAgent.chat(message);

            typingDiv.remove();

            addMessage(response, 'bot');


        } catch (error) {

            console.error(error);

            typingDiv.remove();

            // fallback local intelligent
            const fallback = conversationEngine.generateResponse(message);

            addMessage(fallback, 'bot');

        }

    }


    // ===================================================
    // EVENTS
    // ===================================================

    chatSend.addEventListener('click', sendMessage);

    chatInput.addEventListener('keypress', function(e) {

        if (e.key === 'Enter') {

            sendMessage();

        }

    });


    quickActions.forEach(function(action) {

        action.addEventListener('click', function() {

            const query = action.getAttribute('data-query');

            chatInput.value = getQuickActionMessage(query);

            sendMessage();

        });

    });

}



// =======================================================
// HANDLE LEAVE REQUEST WITH EMPLOYEE SELECTION
// =======================================================

async function handleChatLeaveRequestWithEmployeeSelection(message, match) {

    const moisMap = {
        'janvier': 1,
        'f├®vrier': 2,
        'mars': 3,
        'avril': 4,
        'mai': 5,
        'juin': 6,
        'juillet': 7,
        'ao├╗t': 8,
        'septembre': 9,
        'octobre': 10,
        'novembre': 11,
        'd├®cembre': 12
    };

    const day = match[1];
    const month = moisMap[match[2].toLowerCase()];
    const year = match[3] || new Date().getFullYear();

    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dateLabel = `${day} ${match[2]} ${year}`;

    // Display message asking to select employee
    const chatMessages = document.getElementById('chat-messages');
    
    let html = `<div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 10px; padding: 1rem; margin: 1rem 0;">
        <strong>­ƒæÑ Qui demande un cong├® pour le ${dateLabel} ?</strong><br><br>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">`;
    
    employees.forEach(emp => {
        const btnId = `employee-select-${emp.id}`;
        html += `<button id="${btnId}" class="employee-select-btn" style="padding: 0.75rem; border: 2px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                 onmouseover="this.style.borderColor='#6366F1'; this.style.background='rgba(99,102,241,0.1)';"
                 onmouseout="this.style.borderColor='rgba(99,102,241,0.3)'; this.style.background='rgba(99,102,241,0.05)';">
                ${emp.name}<br><small>${emp.role}</small>
        </button>`;
    });
    
    html += `</div></div>`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-text">
                ${html}
            </div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add click event to each employee button
    const buttonsContainer = messageDiv.querySelector('[style*="display: grid"]');
    
    employees.forEach(emp => {
        const btnId = `employee-select-${emp.id}-${Date.now()}`;
        const btn = messageDiv.querySelector(`#employee-select-${emp.id}`);
        
        if (btn) {
            // Update button ID to make it unique
            btn.id = btnId;
            
            btn.addEventListener('click', async () => {
                // Disable only the buttons in THIS message
                buttonsContainer.querySelectorAll('.employee-select-btn').forEach(b => {
                    b.style.opacity = '0.5';
                    b.style.pointerEvents = 'none';
                });
                
                // Highlight selected employee
                btn.style.borderColor = '#10B981';
                btn.style.background = 'rgba(16,185,129,0.2)';
                
                // Call the main leave request handler
                await handleChatLeaveRequest(message, match, emp.id);
            });
        }
    });
}

// =======================================================
// HANDLE LEAVE REQUEST - VERSION CORRIG├ëE
// =======================================================

async function handleChatLeaveRequest(message, match, userId) {

    const moisMap = {
        'janvier': 1,
        'f├®vrier': 2,
        'mars': 3,
        'avril': 4,
        'mai': 5,
        'juin': 6,
        'juillet': 7,
        'ao├╗t': 8,
        'septembre': 9,
        'octobre': 10,
        'novembre': 11,
        'd├®cembre': 12
    };


    const day = match[1];

    const month = moisMap[match[2].toLowerCase()];

    const year = match[3] || new Date().getFullYear();


    const dateStr =
        `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;


    const dateLabel =
        `${day} ${match[2]} ${year}`;



    // typing
    const typingDiv = document.createElement('div');

    typingDiv.className = 'message bot';

    typingDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-text">
                ­ƒñû Analyse d├®cisionnelle en cours...
            </div>
        </div>
    `;

    document.getElementById('chat-messages').appendChild(typingDiv);



    try {

        const result =
            await decisionAgent.decideLeave(
                userId,
                dateStr,
                dateLabel
            );


        // Ajouter absence si approuv├®
        if (result.decision === 'APPROUV├ë') {

            absences.push({
                employeeId: userId,
                date: dateStr,
                reason: 'cong├®'
            });

            saveState();

        }


        typingDiv.remove();


        const icon =
            result.decision === 'APPROUV├ë'
                ? 'Ô£à'
                : 'ÔØî';


        const response =
            `­ƒôØ <strong>Demande de cong├® ÔÇö ${dateLabel}</strong><br><br>
            ­ƒæ¿ÔÇìÔÜò´©Å Pharmaciens disponibles : ${result.pharmaciensRestants}<br>
            ­ƒôè Taux de couverture : ${result.couverture}%<br>
            ­ƒæÑ Absents ce jour : ${result.absentsJour}<br><br>
            ${icon} <strong>D├®cision : ${result.decision}</strong><br><br>
            ${result.justification}`;


        addMessage(response, 'bot');


    }
    catch(error){

        console.error(error);

        typingDiv.remove();

        addMessage(
            "ÔØî Erreur lors de l'analyse. R├®essayez.",
            "bot"
        );

    }

}

function getQuickActionMessage(query) {
    return {
        'planning': "Quel est l'├®tat du planning et quelles sont tes recommandations ?",
        'conges': "Quelle est la situation des cong├®s et que recommandes-tu ?",
        'equipe': "Analyse l'├®tat actuel de l'├®quipe et identifie les risques.",
        'conformite': "V├®rifie la conformit├® r├®glementaire et signale les probl├¿mes."
    }[query] || '';
}

function addMessage(text, type) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'bot'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    const content = document.createElement('div');
    content.className = 'message-content';
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

    content.appendChild(textDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== FALLBACK CONVERSATIONNEL =====
const conversationEngine = {
    analyzeIntents(msg) {
        const intents = [];
        if (msg.match(/planning|horaire|shift|semaine|travail|travaille/)) intents.push('planning');
        if (msg.match(/je veux (un )?cong├®|demander (un )?cong├®/)) intents.push('demander_conge');
        else if (msg.match(/cong├®|conges|vacance|repos/)) intents.push('info_conges');
        if (msg.match(/├®quipe|team|personnel|combien|qui|pr├®sent/)) intents.push('equipe');
        if (msg.match(/conformit├®|conforme|r├®gle|l├®gal|alerte/)) intents.push('conformite');
        if (msg.match(/surcharge|activit├®|ordonnance|charge|critique/)) intents.push('surcharge');
        return intents.length > 0 ? intents : ['general'];
    },
    generateResponse(message) {
        const msg = message.toLowerCase();
        const intents = this.analyzeIntents(msg);
        const presentCount = employees.length - absences.length;
        const pharmaciens = employees.filter(e => e.role === 'pharmacien').length;

        if (intents.includes('equipe')) {
            return `­ƒæÑ **├ëquipe** : ${presentCount}/${employees.length} pr├®sents\nÔÇó ${pharmaciens} pharmaciens dipl├┤m├®s\nÔÇó Couverture : ${Math.round(presentCount/employees.length*100)}%`;
        }
        if (intents.includes('planning')) {
            return currentSchedule.length > 0
                ? `­ƒôà Planning actif sur ${new Set(currentSchedule.map(s=>s.day)).size} jours. Consultez l'onglet Planning.`
                : `­ƒôà Aucun planning g├®n├®r├®. Allez dans l'onglet **Planning** pour en cr├®er un.`;
        }
        if (intents.includes('conformite')) {
            const audit = complianceChecker.performAudit();
            return `ÔÜû´©Å Conformit├® : **${audit.percentage}%** ${audit.allPassed ? 'Ô£à' : 'ÔÜá´©Å'}`;
        }
        return "Je suis votre assistant RH PharmaHR AI. Posez-moi vos questions sur le planning, les cong├®s, l'├®quipe ou la conformit├®.";
    }
};

// ===== PLANNING =====
const schedulingEngine = {
    constraints: { maxHoursPerDay: 8, minPharmacistPerShift: 1, shiftsPerDay: ['matin', 'apres-midi'] },

    generateSchedule(week, level) {
        currentSchedule = [];
        currentAlerts = [];
        const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const pharmacists = employees.filter(e => e.role === 'pharmacien' && e.diplome);
        const assistants = employees.filter(e => e.role === 'preparateur');
        let staffPerShift = level === 'normal' ? 3 : level === 'eleve' ? 4 : 5;

        weekDays.forEach((day, dayIndex) => {
            this.constraints.shiftsPerDay.forEach(shift => {
                const pharmacist = pharmacists[dayIndex % pharmacists.length];
                const selectedAssistants = [...assistants].sort(() => 0.5 - Math.random()).slice(0, staffPerShift - 1);
                currentSchedule.push({
                    day, shift,
                    hours: shift === 'matin' ? '09:00 - 13:00' : '14:00 - 18:00',
                    staff: [pharmacist, ...selectedAssistants],
                    pharmacistPresent: true,
                    totalHours: 4
                });
            });
        });

        this.validateSchedule();
        try { saveState(); } catch(e) {}
        return currentSchedule;
    },

    validateSchedule() {
        const shiftsWithout = currentSchedule.filter(s => !s.pharmacistPresent);
        if (shiftsWithout.length > 0) {
            currentAlerts.push({ type: 'danger', title: 'Non-conformit├®', message: `${shiftsWithout.length} shift(s) sans pharmacien`, time: 'Maintenant' });
        } else {
            currentAlerts.push({ type: 'success', title: 'Planning conforme', message: 'Toutes les contraintes respect├®es', time: 'Maintenant' });
        }
    }
};

function initPlanning() {
    const generateBtn = document.getElementById('generate-planning');
    const weekInput = document.getElementById('planning-week');
    const activitySelect = document.getElementById('planning-activity');
    const resultDiv = document.getElementById('planning-result');
    const alertsDiv = document.getElementById('planning-alerts');

    if (!generateBtn || !weekInput || !activitySelect) {
        console.warn('ÔÜá´©Å ├ël├®ments de planning non trouv├®s');
        return;
    }

    const today = new Date();
    const currentWeek = `${today.getFullYear()}-W${getWeekNumber(today).toString().padStart(2, '0')}`;
    weekInput.value = currentWeek;
    // Emp├¬cher la s├®lection de semaines pass├®es
    weekInput.setAttribute('min', currentWeek);

    generateBtn.addEventListener('click', async () => {
        const selectedWeek = weekInput.value;
        
        // V├®rifier que la semaine s├®lectionn├®e n'est pas dans le pass├®
        if (selectedWeek < currentWeek) {
            showNotification('ÔØî Impossible de g├®n├®rer un planning pour une semaine pass├®e', 'danger');
            return;
        }
        
        activityLevel = activitySelect.value;
        showNotification('­ƒñû Agent en cours de planification...', 'info');

        const schedule = schedulingEngine.generateSchedule(weekInput.value, activityLevel);
        displaySchedule(schedule, resultDiv);
        displayAlerts(currentAlerts, alertsDiv);

        // Justification par l'agent d├®cisionnel
        try {
            const justification = await decisionAgent.justifySchedule(schedule, activityLevel);
            const justifDiv = document.createElement('div');
            justifDiv.className = 'agent-justification';
            justifDiv.innerHTML = `
                <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 10px; padding: 1rem; margin-top: 1rem;">
                    <strong>­ƒºá Analyse de l'agent d├®cisionnel :</strong><br><br>
                    ${justification.replace(/\n/g, '<br>')}
                </div>`;
            resultDiv.appendChild(justifDiv);
        } catch(e) {}

        updateDashboard();
        showNotification('Ô£à Planning g├®n├®r├® et analys├® par l\'agent !', 'success');
    });
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function displaySchedule(schedule, container) {
    if (!schedule || schedule.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Aucun planning g├®n├®r├®</p></div>';
        return;
    }
    let html = `<div class="result-header"><h3>Planning Optimis├®</h3><span class="result-badge success">Ô£ô G├®n├®r├® par l'Agent</span></div>
    <table class="planning-table"><thead><tr><th>Jour</th><th>P├®riode</th><th>Horaires</th><th>Personnel</th><th>Pharmacien</th></tr></thead><tbody>`;
    schedule.forEach(shift => {
        const pharmacist = shift.staff.find(s => s.role === 'pharmacien');
        const shiftClass = shift.shift === 'matin' ? 'shift-matin' : 'shift-apres-midi';
        html += `<tr>
            <td><strong>${shift.day}</strong></td>
            <td><span class="shift-badge ${shiftClass}">${shift.shift === 'matin' ? 'Matin' : 'Apr├¿s-midi'}</span></td>
            <td>${shift.hours}</td>
            <td>${shift.staff.map(s => `<div>${s.name} <small>(${s.role})</small></div>`).join('')}</td>
            <td>${pharmacist ? 'Ô£ô ' + pharmacist.name : 'Ô£ù Aucun'}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayAlerts(alerts, container) {
    if (!alerts || alerts.length === 0) { container.innerHTML = ''; return; }
    let html = '<div class="alerts-list">';
    alerts.forEach(alert => {
        const type = { success: 'success', warning: 'warning', danger: 'danger', info: 'success' }[alert.type] || 'success';
        const icon = { success: 'Ô£ô', warning: 'ÔÜá', danger: 'Ô£ù', info: 'Ôä╣' }[alert.type] || 'Ô£ô';
        html += `<div class="alert-item ${type}"><div class="alert-icon">${icon}</div><div class="alert-text"><div class="alert-title">${alert.title}</div><div class="alert-time">${alert.message}</div></div></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===== ANALYSE SURCHARGE =====
const surchargeAnalyzer = {
    thresholds: { normal: 120, attention: 180 },
    analyze(ordonnances, employeesPresent) {
        const ratio = ordonnances / employeesPresent;
        let classification = ordonnances <= 120 ? 'Normal' : ordonnances <= 180 ? 'Attention' : 'Surcharge Critique';
        let color = ordonnances <= 120 ? 'success' : ordonnances <= 180 ? 'warning' : 'danger';
        return { classification, color, ratio: ratio.toFixed(1) };
    }
};

function initSurchargeAnalysis() {
    const analyzeBtn = document.getElementById('analyze-surcharge');

    if (!analyzeBtn) {
        console.warn('ÔÜá´©Å Bouton analyze-surcharge non trouv├®');
        return;
    }
    const activityInput = document.getElementById('activity-input');
    const employeesInput = document.getElementById('employees-input');
    const resultDiv = document.getElementById('surcharge-result');
    const recommendationsDiv = document.getElementById('surcharge-recommendations');

    analyzeBtn.addEventListener('click', async () => {
        const ordonnances = parseInt(activityInput.value);
        const employeesCount = parseInt(employeesInput.value);
        if (!ordonnances || ordonnances <= 0) { showNotification('Entrez un nombre valide', 'warning'); return; }

        showNotification('­ƒñû Agent en analyse...', 'info');
        const analysis = surchargeAnalyzer.analyze(ordonnances, employeesCount);

        resultDiv.innerHTML = `
            <div class="result-header">
                <h3>Analyse de l'Agent D├®cisionnel</h3>
                <span class="result-badge ${analysis.color}">${analysis.classification}</span>
            </div>
            <div class="quick-stats">
                <div class="quick-stat-item"><span class="quick-label">Ordonnances/jour:</span><span class="quick-value">${ordonnances}</span></div>
                <div class="quick-stat-item"><span class="quick-label">Employ├®s pr├®sents:</span><span class="quick-value">${employeesCount}</span></div>
                <div class="quick-stat-item"><span class="quick-label">Ratio:</span><span class="quick-value">${analysis.ratio}</span></div>
            </div>`;

        recommendationsDiv.innerHTML = '<div style="padding:1rem; color: var(--text-muted);">­ƒñû Agent en cours d\'analyse d├®cisionnelle...</div>';

        try {
            const groqAnalysis = await decisionAgent.analyzeSurchargeWithGroq(ordonnances, employeesCount);
            recommendationsDiv.innerHTML = `
                <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 10px; padding: 1.5rem;">
                    <h3 style="margin-bottom:1rem;">­ƒºá D├®cision de l'Agent</h3>
                    <p style="color: var(--text-secondary); line-height: 1.8;">${groqAnalysis.replace(/\n/g, '<br>')}</p>
                </div>`;
        } catch(e) {
            recommendationsDiv.innerHTML = `<div class="recommendation-item"><div class="recommendation-text">Classification : ${analysis.classification}. Ratio : ${analysis.ratio} ord/employ├®.</div></div>`;
        }

        showNotification('Ô£à Analyse d├®cisionnelle termin├®e !', 'success');
    });
}

// ===== CONFORMIT├ë =====
const complianceChecker = {
    rules: [
        {
            id: 'pharmacist_presence', title: 'Pr├®sence Pharmacien Dipl├┤m├®', description: 'Au moins 1 pharmacien dipl├┤m├® par shift',
            check: () => {
                if (currentSchedule.length === 0) return { passed: true, details: 'Aucun planning ├á v├®rifier' };
                const v = currentSchedule.filter(s => !s.pharmacistPresent);
                return { passed: v.length === 0, details: v.length === 0 ? 'Tous les shifts conformes' : `${v.length} shift(s) sans pharmacien` };
            }
        },
        {
            id: 'max_hours', title: 'Dur├®e Maximale', description: 'Maximum 8h/jour',
            check: () => {
                if (currentSchedule.length === 0) return { passed: true, details: 'Aucun planning ├á v├®rifier' };
                const daily = {};
                currentSchedule.forEach(s => s.staff.forEach(e => {
                    const k = `${e.id}_${s.day}`;
                    daily[k] = (daily[k] || 0) + s.totalHours;
                }));
                const v = Object.values(daily).filter(h => h > 8);
                return { passed: v.length === 0, details: v.length === 0 ? 'Toutes les dur├®es conformes' : `${v.length} d├®passement(s)` };
            }
        },
        {
            id: 'weekly_hours', title: 'Heures Hebdomadaires', description: 'Respect des contrats',
            check: () => {
                if (currentSchedule.length === 0) return { passed: true, details: 'Aucun planning ├á v├®rifier' };
                const weekly = {};
                currentSchedule.forEach(s => s.staff.forEach(e => { weekly[e.id] = (weekly[e.id] || { e, h: 0 }); weekly[e.id].h += s.totalHours; }));
                const v = Object.values(weekly).filter(w => w.h > (employees.find(e => e.id === w.e?.id)?.maxHours || 40));
                return { passed: v.length === 0, details: v.length === 0 ? 'Toutes les heures conformes' : `${v.length} d├®passement(s)` };
            }
        },
        {
            id: 'coverage', title: 'Couverture des Shifts', description: 'Minimum 2 personnes/shift',
            check: () => {
                if (currentSchedule.length === 0) return { passed: true, details: 'Aucun planning ├á v├®rifier' };
                const v = currentSchedule.filter(s => s.staff.length < 2);
                return { passed: v.length === 0, details: v.length === 0 ? 'Tous les shifts couverts' : `${v.length} shift(s) insuffisant(s)` };
            }
        }
    ],
    performAudit() {
        const results = this.rules.map(r => ({ ...r, ...r.check() }));
        const passed = results.filter(r => r.passed).length;
        return { results, percentage: Math.round(passed / results.length * 100), allPassed: passed === results.length };
    }
};

function checkCompliance() {
    const checkBtn = document.getElementById('check-conformite');

    if (!checkBtn) {
        console.warn('ÔÜá´©Å Bouton check-conformite non trouv├®');
        return;
    }
    const resultDiv = document.getElementById('conformite-result');
    checkBtn.addEventListener('click', () => {
        showNotification('Audit de conformit├®...', 'info');
        setTimeout(() => {
            const audit = complianceChecker.performAudit();
            displayComplianceResults(audit, resultDiv);
            updateDashboard();
            showNotification('Audit termin├® !', 'success');
        }, 1500);
    });
}

function displayComplianceResults(audit, container) {
    const badgeClass = audit.allPassed ? 'success' : audit.percentage >= 75 ? 'warning' : 'danger';
    let html = `<div class="result-header"><h3>R├®sultats de l'Audit</h3><span class="result-badge ${badgeClass}">${audit.percentage}% Conforme</span></div><div class="conformite-checks">`;
    audit.results.forEach(r => {
        html += `<div class="conformite-check ${r.passed ? 'passed' : 'failed'}">
            <div class="check-info"><div class="check-title">${r.title}</div><div class="check-description">${r.description}</div><div class="check-description" style="margin-top:.5rem;font-weight:500">${r.details}</div></div>
            <div class="check-status ${r.passed ? 'passed' : 'failed'}">${r.passed ? 'Ô£ô Conforme' : 'Ô£ù Non conforme'}</div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===== DASHBOARD =====
function initDashboard() { updateDashboard(); }
function updateDashboard() {
    document.getElementById('stat-employees').textContent = employees.length;
    document.getElementById('stat-activity').textContent = { normal:'Normal', eleve:'├ëlev├®', 'tres-eleve':'Tr├¿s ├ëlev├®' }[activityLevel] || 'Normal';
    if (currentSchedule.length > 0) {
        document.getElementById('stat-hours').textContent = currentSchedule.reduce((s, sh) => s + sh.staff.length * sh.totalHours, 0) + 'h';
        document.getElementById('stat-compliance').textContent = complianceChecker.performAudit().percentage + '%';
    }
    document.getElementById('quick-pharmacists').textContent = employees.filter(e => e.role === 'pharmacien').length;
    document.getElementById('quick-assistants').textContent = employees.filter(e => e.role === 'preparateur').length;
    document.getElementById('quick-admin').textContent = employees.filter(e => e.role === 'administratif').length;

    if (currentAlerts.length > 0) {
        const alertsContainer = document.getElementById('recent-alerts');
        alertsContainer.innerHTML = '';
        currentAlerts.slice(0, 3).forEach(alert => {
            const type = { success:'success', warning:'warning', danger:'danger', info:'success' }[alert.type] || 'success';
            const icon = { success:'Ô£ô', warning:'ÔÜá', danger:'Ô£ù', info:'Ôä╣' }[alert.type] || 'Ô£ô';
            const div = document.createElement('div');
            div.className = `alert-item ${type}`;
            div.innerHTML = `<div class="alert-icon">${icon}</div><div class="alert-text"><div class="alert-title">${alert.title}</div><div class="alert-time">${alert.message}</div></div>`;
            alertsContainer.appendChild(div);
        });
    }
}

function showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.className = 'notification-toast show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== DEMANDES RH =====
let leaveRequests = [];
let leaveCounter = 1;

function initLeaveRequests() {
    const submitBtn = document.getElementById('submit-leave');
    const validationDiv = document.getElementById('leave-validation');
    const leaveStartInput = document.getElementById('leave-start');
    const leaveEndInput = document.getElementById('leave-end');

    if (!submitBtn) {
        console.warn('ÔÜá´©Å Bouton submit-leave non trouv├®');
        return;
    }

    // D├®finir la date minimum ├á aujourd'hui pour emp├¬cher les dates pass├®es
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (leaveStartInput) leaveStartInput.setAttribute('min', todayStr);
    if (leaveEndInput) leaveEndInput.setAttribute('min', todayStr);

    // Synchroniser la date de fin avec la date de d├®but
    if (leaveStartInput) {
        leaveStartInput.addEventListener('change', () => {
            if (leaveEndInput && leaveStartInput.value) {
                leaveEndInput.setAttribute('min', leaveStartInput.value);
            }
        });
    }

    submitBtn.addEventListener('click', async () => {
        const employeeId = parseInt(document.getElementById('leave-employee').value);
        const startDate = document.getElementById('leave-start').value;
        const endDate = document.getElementById('leave-end').value;
        const leaveType = document.getElementById('leave-type').value;
        const comment = document.getElementById('leave-comment').value;

        if (!employeeId || !startDate || !endDate) { showNotification('Remplissez tous les champs', 'warning'); return; }

        const employee = employees.find(e => e.id === employeeId);
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(0,0,0,0);
        const now = new Date(); now.setHours(0,0,0,0);
        const daysLead = Math.round((start - now) / 86400000);

        // V├®rifier que les dates ne sont pas dans le pass├®
        if (start < now) {
            showNotification('ÔØî La date de d├®but ne peut pas ├¬tre dans le pass├®', 'danger');
            return;
        }
        if (end < now) {
            showNotification('ÔØî La date de fin ne peut pas ├¬tre dans le pass├®', 'danger');
            return;
        }
        if (end < start) {
            showNotification('ÔØî La date de fin doit ├¬tre apr├¿s la date de d├®but', 'danger');
            return;
        }

        if (daysLead < 14) { showNotification('D├®lai minimum 14 jours requis', 'warning'); return; }

        validationDiv.innerHTML = '<div style="padding:1rem;color:var(--text-muted)">­ƒñû Agent d├®cisionnel en analyse...</div>';
        showNotification('­ƒñû Agent en cours de d├®cision...', 'info');

        const result = await decisionAgent.decideLeave(employeeId, startDate, `${start.getDate()} ${start.toLocaleString('fr-FR',{month:'long'})} ${start.getFullYear()}`);

        const request = { id: leaveCounter++, employeeId, employeeName: employee.name, startDate, endDate, type: leaveType, comment, status: result.decision === 'APPROUV├ë' ? 'approved' : 'rejected', submittedDate: new Date().toLocaleDateString('fr-FR') };
        leaveRequests.push(request);

        if (result.decision === 'APPROUV├ë') {
            const msPerDay = 86400000;
            for (let d = new Date(start); d <= new Date(endDate); d = new Date(d.getTime() + msPerDay)) {
                const dt = d.toISOString().slice(0,10);
                if (!absences.some(a => a.employeeId === employeeId && a.date === dt)) {
                    absences.push({ employeeId, date: dt, reason: leaveType });
                }
            }
        }

        const icon = result.decision === 'APPROUV├ë' ? 'Ô£à' : 'ÔØî';
        validationDiv.innerHTML = `
            <div class="alert-item ${result.decision === 'APPROUV├ë' ? 'success' : 'warning'}" style="margin-top:1rem">
                <div class="alert-icon">${icon}</div>
                <div class="alert-text">
                    <div class="alert-title">­ƒºá D├®cision de l'Agent : ${result.decision}</div>
                    <div class="alert-time" style="margin-top:.5rem;line-height:1.6">${result.justification}</div>
                    <div class="alert-time" style="margin-top:.5rem">Pharmaciens disponibles : ${result.pharmaciensRestants} | Couverture : ${result.couverture}%</div>
                </div>
            </div>`;

        try { saveState(); } catch(e) {}
        displayMyRequests();
        displayAbsences();
        updateDashboard();
        showNotification(`D├®cision de l'agent : ${result.decision}`, result.decision === 'APPROUV├ë' ? 'success' : 'warning');
    });

    displayMyRequests();
}

function displayMyRequests() {
    const container = document.getElementById('my-requests-list');
    if (leaveRequests.length === 0) { container.innerHTML = '<div class="empty-state"><p>Aucune demande</p></div>'; return; }
    container.innerHTML = leaveRequests.map(req => `
        <div class="request-item ${req.status}">
            <div class="request-header">
                <div><div class="request-title">${req.employeeName}</div><div class="request-period">${req.startDate} ÔåÆ ${req.endDate}</div></div>
                <span class="request-status ${req.status}">${req.status === 'approved' ? 'Approuv├®e' : req.status === 'rejected' ? 'Rejet├®e' : 'En attente'}</span>
            </div>
            <div class="request-comment">Type : ${req.type}${req.comment ? ' | ' + req.comment : ''}</div>
        </div>`).join('');
}

// ===== ABSENCES =====
function initAbsences() {
    const submitBtn = document.getElementById('submit-absence');
    const validationDiv = document.getElementById('absence-validation');
    const absenceDateInput = document.getElementById('absence-date');

    if (!submitBtn) {
        console.warn('ÔÜá´©Å Bouton submit-absence non trouv├®');
        return;
    }

    // D├®finir la date minimum ├á aujourd'hui pour emp├¬cher les dates pass├®es
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (absenceDateInput) absenceDateInput.setAttribute('min', todayStr);

    submitBtn.addEventListener('click', () => {
        const employeeId = parseInt(document.getElementById('absence-employee').value);
        const date = document.getElementById('absence-date').value;
        const reason = document.getElementById('absence-reason').value;
        if (!employeeId || !date || !reason) { showNotification('Remplissez tous les champs', 'warning'); return; }

        // V├®rifier que la date n'est pas dans le pass├®
        const absenceDate = new Date(date);
        absenceDate.setHours(0,0,0,0);
        const now = new Date();
        now.setHours(0,0,0,0);
        if (absenceDate < now) {
            showNotification('ÔØî La date d\'absence ne peut pas ├¬tre dans le pass├®', 'danger');
            return;
        }

        const employee = employees.find(e => e.id === employeeId);
        absences.push({ employeeId, date, reason });
        try { saveState(); } catch(e) {}

        validationDiv.innerHTML = `<div class="alert-item success"><div class="alert-icon">Ô£ô</div><div class="alert-text"><div class="alert-title">Absence enregistr├®e</div><div class="alert-time">${employee.name} - ${date}</div></div></div>`;
        showNotification('Absence enregistr├®e !', 'success');
        displayAbsences();
        updateDashboard();
        checkPharmacistAvailability();
    });

    displayAbsences();
}

function displayAbsences() {
    const container = document.getElementById('current-absences-list');
    if (absences.length === 0) { container.innerHTML = '<div class="empty-state"><p>Aucune absence</p></div>'; return; }
    container.innerHTML = absences.map(abs => {
        const emp = employees.find(e => e.id === abs.employeeId) || { name: `Employ├® (${abs.employeeId})` };
        return `<div class="absence-item"><div class="request-header"><div><div class="request-title">${emp.name}</div><div class="request-period">${abs.date}</div></div><div>${abs.reason}</div></div></div>`;
    }).join('');
}

function checkPharmacistAvailability() {
    const pharmaciens = employees.filter(e => e.role === 'pharmacien' && e.diplome);
    const absentPharm = absences.filter(a => pharmaciens.find(p => p.id === a.employeeId)).length;
    if (absentPharm > 2) {
        currentAlerts.unshift({ type: 'danger', title: '­ƒÜ¿ Alerte Pharmacien', message: `${absentPharm} pharmaciens absents`, time: "├Ç l'instant" });
        showNotification('­ƒÜ¿ ALERTE : Capacit├® pharmacien compromise', 'warning');
    }
}

// ===== TABS =====
function initDemandeTabs() {
    const tabBtns = document.querySelectorAll('#demandes-view .tab-btn');
    const tabContents = document.querySelectorAll('#demandes-view .tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.getAttribute('data-tab')}-tab`).classList.add('active');
        });
    });
}

// ===== COMMUNICATION =====
let conversations = [], messages = [], currentConversationId = null, announcements = [];

function initCommunication() {
    if (!Array.isArray(conversations) || conversations.length === 0) {
        initSampleConversations();
    }
    if (!Array.isArray(announcements) || announcements.length === 0) {
        initSampleAnnouncements();
    }
    initCommunicationTabs();
    setupMessaging();
    setupAnnouncements();
}

function initCommunicationTabs() {
    const view = document.getElementById('communication-view');
    if (!view) return;
    view.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            view.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            view.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.getAttribute('data-tab')}-tab`).classList.add('active');
        });
    });
}

function initSampleConversations() {
    if (Array.isArray(conversations) && conversations.length > 0) return;
    if (Array.isArray(messages) && messages.length > 0) return;

    conversations = [
        { id: 1, participant: { id: 1, name: "Dr. Sophie Martin", role: "Pharmacien Titulaire" }, lastMessage: "Parfait, merci !", lastTime: "Il y a 5 min", unread: 2 },
        { id: 2, participant: { id: 5, name: "Alice Bernard", role: "Pr├®parateur" }, lastMessage: "Stock ibuprof├¿ne bas", lastTime: "Il y a 1h", unread: 0 }
    ];
    messages = [
        { id: 1, conversationId: 1, sender: 'me', text: "Peux-tu valider le planning ?", time: "10:30" },
        { id: 2, conversationId: 1, sender: 'other', text: "Oui, je regarde.", time: "10:32" },
        { id: 3, conversationId: 1, sender: 'other', text: "Parfait, merci !", time: "10:35" },
        { id: 4, conversationId: 2, sender: 'other', text: "Stock ibuprof├¿ne bas", time: "14:21" }
    ];
}

function setupMessaging() {
    const newConvBtn = document.getElementById('new-conversation-btn');
    if (newConvBtn) newConvBtn.addEventListener('click', openNewConversationModal);
    const sendBtn = document.getElementById('send-message-btn');
    const messageInput = document.getElementById('message-input');
    if (sendBtn && messageInput) {
        sendBtn.addEventListener('click', sendCommunicationMessage);
        messageInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendCommunicationMessage(); });
    }
    renderConversationsList();
}

function renderConversationsList() {
    const list = document.getElementById('conversations-list');
    if (!list) return;
    list.innerHTML = '';
    conversations.forEach(conv => {
        const name = conv.participant?.name || 'Utilisateur';
        const initials = name.split(' ').map(n => n[0]).join('');
        const div = document.createElement('div');
        div.className = `conversation-item${currentConversationId === conv.id ? ' active' : ''}`;
        div.innerHTML = `<div class="conversation-avatar">${initials}</div><div class="conversation-details"><div class="conversation-name">${name}</div><div class="conversation-preview">${conv.lastMessage || ''}</div></div><div class="conversation-meta"><div class="conversation-time">${conv.lastTime}</div>${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}</div>`;
        div.addEventListener('click', () => openConversation(conv.id));
        list.appendChild(div);
    });
}

function openConversation(id) {
    currentConversationId = id;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conv.unread = 0;
    renderConversationsList();
    const name = conv.participant?.name || 'Utilisateur';
    const nameEl = document.getElementById('current-conversation-name');
    const statusEl = document.getElementById('current-conversation-status');
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = conv.participant?.role || '';
    renderMessages(id);
    const inputArea = document.getElementById('message-input-area');
    if (inputArea) inputArea.style.display = 'flex';
}

function renderMessages(convId) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    container.innerHTML = '';
    const conv = conversations.find(c => c.id === convId);
    messages.filter(m => m.conversationId === convId).forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msg.sender === 'me' ? 'sent' : 'received'}`;
        bubble.innerHTML = `${msg.sender === 'other' ? `<div class="message-sender">${conv?.participant?.name || ''}</div>` : ''}<div class="message-text">${msg.text}</div><div class="message-time">${msg.time}</div>`;
        container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
}

function buildCommunicationFallbackReply(text, participant) {
    const msg = text.toLowerCase();
    const name = participant?.name || 'Bonjour';

    if (msg.match(/merci|parfait|super|top/)) {
        return `Avec plaisir. Je reste disponible si vous avez besoin d'un autre point, ${name}.`;
    }
    if (msg.match(/planning|horaire|shift|semaine/)) {
        return "Bien re├ºu. Je v├®rifie le planning et je vous confirme les cr├®neaux disponibles dans les prochaines minutes.";
    }
    if (msg.match(/cong├®|absence|repos/)) {
        return "Demande not├®e. Je pr├®pare les informations n├®cessaires pour validation RH (dates, couverture et impact ├®quipe).";
    }
    if (msg.match(/stock|rupture|commande/)) {
        return "Alerte stock re├ºue. Je contr├┤le le niveau actuel et je lance un r├®approvisionnement prioritaire si n├®cessaire.";
    }
    if (msg.match(/urgent|urgence|imm├®diat/)) {
        return "Message urgent re├ºu. Je traite ce point en priorit├® et je reviens vers vous rapidement.";
    }

    return "Message bien re├ºu. Je prends en charge votre demande et je vous fais un retour clair d├¿s que possible.";
}

async function buildCommunicationReply(text, conversation) {
    const participant = conversation?.participant || { name: 'Collaborateur', role: 'Employ├®' };
    const history = messages
        .filter(m => m.conversationId === conversation?.id)
        .slice(-6)
        .map(m => `${m.sender === 'me' ? 'RH' : participant.name}: ${m.text}`)
        .join('\n');

    const prompt = `Tu simules une conversation interne en pharmacie.

Contexte :
- Le message vient du RH
- Tu r├®ponds comme employ├®: ${participant.name} (${participant.role})
- R├®ponse en fran├ºais, naturelle, professionnelle, courte (1-2 phrases)
- Si le RH demande une action, confirme clairement la prochaine ├®tape
- N'invente pas de donn├®es chiffr├®es non demand├®es

Historique r├®cent :
${history || 'Aucun historique'}

Message RH : "${text}"

R├®ponds uniquement avec le message de l'employ├®.`;

    try {
        const aiReply = await callGroqLLM(prompt, {
            systemPrompt: "Tu es un employ├® d'une pharmacie qui r├®pond au RH de mani├¿re claire et professionnelle.",
            maxTokens: 120
        });

        const clean = (aiReply || '').trim();
        if (!clean) {
            return buildCommunicationFallbackReply(text, participant);
        }
        return clean;
    } catch {
        return buildCommunicationFallbackReply(text, participant);
    }
}

function sendCommunicationMessage() {
    const input = document.getElementById('message-input');
    if (!input || !currentConversationId) return;
    const text = input.value.trim();
    if (!text) return;

    const targetConversationId = currentConversationId;
    const targetConversation = conversations.find(c => c.id === targetConversationId);

    const msg = { id: messages.length + 1, conversationId: targetConversationId, sender: 'me', text, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
    messages.push(msg);
    if (targetConversation) { targetConversation.lastMessage = text; targetConversation.lastTime = "├Ç l'instant"; }
    input.value = '';
    renderMessages(targetConversationId);
    renderConversationsList();

    setTimeout(async () => {
        const replyText = await buildCommunicationReply(text, targetConversation);
        const reply = {
            id: messages.length + 1,
            conversationId: targetConversationId,
            sender: 'other',
            text: replyText,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        messages.push(reply);
        if (targetConversation) {
            targetConversation.lastMessage = reply.text;
            targetConversation.lastTime = "├Ç l'instant";
            if (currentConversationId !== targetConversationId) {
                targetConversation.unread = (targetConversation.unread || 0) + 1;
            }
        }
        if (currentConversationId === reply.conversationId) renderMessages(reply.conversationId);
        renderConversationsList();
        try { saveState(); } catch(e) {}
    }, 1200);
}

function openNewConversationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>Nouvelle Conversation</h3><button class="modal-close">&times;</button></div><div class="employee-list">${employees.filter(e => !conversations.find(c => c.participant.id === e.id)).map(e => `<div class="employee-item" data-id="${e.id}"><div class="employee-avatar">${e.name.split(' ').map(n=>n[0]).join('')}</div><div class="employee-info"><div class="employee-name">${e.name}</div><div class="employee-role">${e.role}</div></div></div>`).join('')}</div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('.employee-item').forEach(item => {
        item.addEventListener('click', () => {
            const emp = employees.find(e => e.id === parseInt(item.dataset.id));
            if (emp) {
                const conv = { id: conversations.length + 1, participant: { id: emp.id, name: emp.name, role: emp.role }, lastMessage: "Nouvelle conversation", lastTime: "├Ç l'instant", unread: 0 };
                conversations.unshift(conv);
                renderConversationsList();
                openConversation(conv.id);
                modal.remove();
            }
        });
    });
}

function setupAnnouncements() {
    const btn = document.getElementById('publish-announcement-btn');
    if (btn) btn.addEventListener('click', publishAnnouncement);
    renderAnnouncements();
}

function initSampleAnnouncements() {
    if (Array.isArray(announcements) && announcements.length > 0) return;

    announcements = [
        { id: 1, title: "Nouvelle Proc├®dure S├®curit├®", priority: "urgent", message: "Tous les employ├®s doivent suivre la formation de s├®curit├® avant le 15 mars.", author: "Direction", date: "27 F├®vrier 2026", recipients: "Toute l'├®quipe" },
        { id: 2, title: "Horaires Modifi├®s - 1er Mars", priority: "important", message: "La pharmacie fermera 1h plus t├┤t le mercredi 3 mars.", author: "Dr. Sophie Martin", date: "26 F├®vrier 2026", recipients: "Toute l'├®quipe" }
    ];
}

function renderAnnouncements() {
    const list = document.getElementById('announcements-list');
    if (!list) return;
    if (announcements.length === 0) { list.innerHTML = '<div class="empty-state"><p>Aucune annonce</p></div>'; return; }
    list.innerHTML = '';
    announcements.forEach(a => {
        const card = document.createElement('div');
        card.className = `announcement-card priority-${a.priority}`;
        card.innerHTML = `<div class="announcement-header"><div><h4>${a.title}</h4><span class="announcement-priority ${a.priority}">${a.priority === 'urgent' ? 'Urgent' : a.priority === 'important' ? 'Important' : 'Normal'}</span></div></div><div class="announcement-body">${a.message}</div><div class="announcement-footer"><div class="announcement-author"><span>${a.author} ÔÇó ${a.date}</span></div><div class="announcement-recipients"><span>${a.recipients}</span></div></div>`;
        list.appendChild(card);
    });
}

function publishAnnouncement() {
    const title = document.getElementById('announcement-title').value.trim();
    const priority = document.getElementById('announcement-priority').value;
    const message = document.getElementById('announcement-message').value.trim();
    const recipients = document.getElementById('announcement-recipients').value;
    const validation = document.getElementById('announcement-validation');
    if (!title || !message) { validation.innerHTML = '<div class="alert alert-error">ÔØî Remplissez tous les champs</div>'; return; }
    const recipientsMap = { all: "Toute l'├®quipe", pharmaciens: 'Pharmaciens', preparateurs: 'Pr├®parateurs', administratif: 'Administratif' };
    announcements.unshift({ id: announcements.length + 1, title, priority, message, author: "Direction", date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), recipients: recipientsMap[recipients] });
    renderAnnouncements();
    document.getElementById('announcement-title').value = '';
    document.getElementById('announcement-message').value = '';
    validation.innerHTML = '<div class="alert alert-success">Ô£à Annonce publi├®e !</div>';
    showNotification('Annonce publi├®e !', 'success');
    setTimeout(() => validation.innerHTML = '', 3000);
}

// ===================================================================
// ===== INITIALISATION =====
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('­ƒÜÇ PharmaHR AI v2.0 - Agent D├®cisionnel - D├®marrage');
    loadState();

    initNavigation();
    initChat();
    initPlanning();
    initSurchargeAnalysis();
    checkCompliance();
    initDashboard();
    initLeaveRequests();
    initAbsences();
    initDemandeTabs();
    initCommunication();

    try {
        displayAbsences();
        displayMyRequests();
        renderAnnouncements();
        renderConversationsList();
        if (currentSchedule.length > 0) {
            displaySchedule(currentSchedule, document.getElementById('planning-result'));
            displayAlerts(currentAlerts, document.getElementById('planning-alerts'));
        }
        updateDashboard();
    } catch(e) { console.warn('Erreur rendu', e); }

    showNotification('­ƒñû PharmaHR AI v2.0 - Agent D├®cisionnel activ├® !', 'success');

    // Analyse proactive au d├®marrage
    setTimeout(async () => {
        try {
            const analysis = await decisionAgent.analyzeOnStartup();
            if (analysis) {
                addMessage(`­ƒºá **Analyse proactive de l'agent au d├®marrage :**\n\n${analysis}`, 'bot');
                // Navigation automatique d├®sactiv├®e - l'utilisateur peut naviguer manuellement
                // document.querySelector('[data-view="chat"]').click();
            }
        } catch(e) {
            console.warn('Analyse startup ├®chou├®e', e);
        }
    }, 2000);

    console.log('Ô£à Agent D├®cisionnel PharmaHR AI v2.0 initialis├®');
});
