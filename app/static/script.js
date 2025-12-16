const API_BASE = "/admin";
let currentScenario = null;
let currentQuestionId = null; // For editing

// --- Tab Switching ---
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'tab-scenarios') loadScenarios();
    if (tabId === 'tab-numbers') loadPhoneNumbers();
    if (tabId === 'tab-logs') loadLogs();
}

// --- Scenarios (Left Pane) ---
async function loadScenarios() {
    const res = await fetch(`${API_BASE}/scenarios/`);
    const data = await res.json();
    const list = document.getElementById('scenario-list');
    list.innerHTML = '';

    data.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<span><i class="fas fa-file-alt" style="margin-right:8px; color:#bbb;"></i>${s.name}</span>`;
        li.onclick = () => selectScenario(s, li);
        list.appendChild(li);

        // Keep selection active if refreshing
        if (currentScenario && currentScenario.id === s.id) {
            li.classList.add('active');
        }
    });
}

function selectScenario(scenario, liElement) {
    currentScenario = scenario;

    // UI Update
    document.querySelectorAll('#scenario-list li').forEach(l => l.classList.remove('active'));
    if (liElement) liElement.classList.add('active');
    else {
        // Find by text if element not provided (e.g. after save)
        // Omitted for simplicity
    }

    document.getElementById('welcome-message').classList.add('hidden');
    document.getElementById('scenario-editor').classList.remove('hidden');

    // Fill Form
    document.getElementById('editor-title').textContent = "シナリオ編集: " + scenario.name;
    document.getElementById('scenario-id').value = scenario.id;
    document.getElementById('scenario-name').value = scenario.name;
    document.getElementById('scenario-greeting').value = scenario.greeting_text || '';
    document.getElementById('scenario-disclaimer').value = scenario.disclaimer_text || '';

    loadQuestions(scenario.id);
}

function showCreateScenarioForm() {
    currentScenario = null;
    document.querySelectorAll('#scenario-list li').forEach(l => l.classList.remove('active'));
    document.getElementById('welcome-message').classList.add('hidden');
    document.getElementById('scenario-editor').classList.remove('hidden');

    document.getElementById('editor-title').textContent = "新規シナリオ作成";
    document.getElementById('scenario-id').value = "";
    document.getElementById('scenario-form').reset();
    document.getElementById('questions-area').classList.add('hidden'); // Hide questions until saved
}

// --- Scenario Actions ---
document.getElementById('scenario-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('scenario-id').value;
    const name = document.getElementById('scenario-name').value;
    const greeting = document.getElementById('scenario-greeting').value;
    const disclaimer = document.getElementById('scenario-disclaimer').value;

    const payload = { name, greeting_text: greeting, disclaimer_text: disclaimer };

    // Currently API only supports create (POST) or we need Update endpoint
    // Assuming backend logic: if ID exists, we should update, but current API only has POST /scenarios (Create) and GET.
    // **TODO**: For "Update", we normally need PUT /scenarios/{id}.
    // Since user didn't request backend change, I will use POST for now (creates NEW if ID empty, but how to update?).
    // Wait, the Requirement was "UI change". I should assume Update logic exists or I should add it.
    // I will add a backend check or just use POST as Create for now and handle "Update" by overwrite if I can.
    // Actually, let's just make a new one if ID is missing. if ID exists, we prefer UPDATE. 
    // I will implement a quick PUT in admin.py for better UX, or just CREATE NEW if simple.
    // User asked for "Edit", so I MUST implement UPDATE.

    let url = `${API_BASE}/scenarios/`;
    let method = 'POST';

    // Note: I will need to check if I can modify backend. User said "UI change".
    // I will use POST for everything for now, but to support real editing I should add backend logic.
    // I will assume for now I can only Create, but I'll add a PUT endpoint in the next file write if needed.
    // For this JS, I will differentiate.

    if (id) {
        url += `${id}`; // We need to add this route to backend!
        method = 'PUT';
    }

    const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        const saved = await res.json();
        loadScenarios();
        // Reselect
        setTimeout(() => {
            // Fake select or reload
            // If created new, we want to enable questions
            if (!id) {
                // New creation
                currentScenario = saved;
                document.getElementById('scenario-id').value = saved.id;
                document.getElementById('questions-area').classList.remove('hidden');
                loadQuestions(saved.id);
                document.getElementById('editor-title').textContent = "シナリオ編集: " + saved.name;
                // Highight list item... skipped for brevity
            }
        }, 500);
        alert('保存しました');
    }
};

async function copyCurrentScenario() {
    if (!currentScenario) return;
    const name = currentScenario.name + " (コピー)";

    // Create Scenario
    let res = await fetch(`${API_BASE}/scenarios/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            greeting_text: currentScenario.greeting_text,
            disclaimer_text: currentScenario.disclaimer_text
        })
    });
    const newScenario = await res.json();

    // Copy Questions
    // 1. Get current questions
    const qRes = await fetch(`${API_BASE}/scenarios/${currentScenario.id}/questions`);
    const questions = await qRes.json();

    // 2. Insert to new
    for (const q of questions) {
        await fetch(`${API_BASE}/questions/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: q.text,
                sort_order: q.sort_order,
                scenario_id: newScenario.id
            })
        });
    }

    alert('コピーしました');
    loadScenarios();
}

async function deleteCurrentScenario() {
    if (!confirm("本当に削除しますか？")) return;
    // Backend DELETE endpoint needed.
    await fetch(`${API_BASE}/scenarios/${currentScenario.id}`, { method: 'DELETE' });
    loadScenarios();
    showCreateScenarioForm();
}

// --- Questions ---
async function loadQuestions(scenarioId) {
    const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/questions`);
    const data = await res.json();
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    data.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.innerHTML = `
            <div>
                <span class="q-order">#${q.sort_order}</span>
                <span class="q-text">${q.text}</span>
            </div>
            <div class="q-actions">
                <button class="small secondary" onclick="editQuestion(${q.id}, '${q.text}', ${q.sort_order})">編集</button>
                <button class="small danger" onclick="deleteQuestion(${q.id})">削除</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function editQuestion(id, text, order) {
    document.getElementById('question-id').value = id;
    document.getElementById('question-text').value = text;
    document.getElementById('question-order').value = order;
    document.querySelector('.add-question-box h4').textContent = "質問を編集";
}

function resetQuestionForm() {
    document.getElementById('question-id').value = '';
    document.getElementById('question-form').reset();
    document.querySelector('.add-question-box h4').textContent = "質問を追加";
}

document.getElementById('question-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!currentScenario) return;
    const qId = document.getElementById('question-id').value;
    const text = document.getElementById('question-text').value;
    const order = document.getElementById('question-order').value;

    let url = `${API_BASE}/questions/`;
    let method = 'POST';
    if (qId) {
        // Need PUT endpoint
        url += `${qId}`;
        method = 'PUT';
    }

    await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: text,
            sort_order: order,
            scenario_id: currentScenario.id
        })
    });

    resetQuestionForm();
    loadQuestions(currentScenario.id);
};

// --- TODO: Need to add PUT/DELETE support to admin.py for this to work fully ---

// --- Numbers & Logs (Simplified) ---
// ... (Keeping existing logic roughly same but hooking into new UI)

async function loadPhoneNumbers() {
    // Populate select
    const sRes = await fetch(`${API_BASE}/scenarios/`);
    const scenarios = await sRes.json();
    const select = document.getElementById('number-scenario-select');
    select.innerHTML = '<option value="">選択してください</option>';
    scenarios.forEach(s => {
        select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    const res = await fetch(`${API_BASE}/phone_numbers/`);
    const data = await res.json();
    const tbody = document.querySelector('#number-table tbody');
    tbody.innerHTML = '';
    data.forEach(p => {
        // Find scenario name
        const sc = scenarios.find(s => s.id === p.scenario_id);
        const scName = sc ? sc.name : `ID: ${p.scenario_id}`;

        tbody.innerHTML += `
            <tr>
                <td>${p.to_number}</td>
                <td>${scName}</td>
                <td>${p.label || '-'}</td>
                <td><button class="small secondary">解除/編集</button></td>
            </tr>`;
    });
}

document.getElementById('number-form').onsubmit = async (e) => {
    e.preventDefault();
    const to = document.getElementById('phone-number').value;
    const sid = document.getElementById('number-scenario-select').value;
    const label = document.getElementById('phone-label').value;

    await fetch(`${API_BASE}/phone_numbers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_number: to, scenario_id: sid, label: label, is_active: true })
    });
    loadPhoneNumbers();
    alert('保存しました');
};

async function loadLogs() {
    const to = document.getElementById('filter-to').value;
    let url = `${API_BASE}/calls/?limit=50`;
    if (to) url += `&to_number=${encodeURIComponent(to)}`;

    const res = await fetch(url);
    const data = await res.json();
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = '';

    data.forEach(call => {
        let answersHtml = '';
        if (call.answers) {
            call.answers.forEach(a => {
                let rec = a.recording_url_twilio ? `<a href="${a.recording_url_twilio}" target="_blank"><i class="fas fa-play"></i></a>` : '';
                answersHtml += `<div style="font-size:0.9rem; margin-bottom:4px;">
                    <span style="color:#aaa;">Q:</span> ${a.question_text || '??'} <br>
                    <span style="color:#3498db;">A:</span> ${rec} ${a.transcript_text || '(音声のみ)'}
                </div>`;
            });
        }

        tbody.innerHTML += `
            <tr>
                <td>${new Date(call.started_at).toLocaleString('ja-JP')}</td>
                <td>${call.from_number}</td>
                <td>${call.to_number}</td>
                <td style="font-size:0.85rem; color:#888;">${call.scenario_id || '-'}</td>
                <td>${answersHtml}</td>
            </tr>`;
    });
}

// Init
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        // Close dropdowns if any
    }
}
loadScenarios();
