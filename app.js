/* ============================================================
   StudyAI — Main Application
   Organised into small functions / modules:
     • Settings & Theme
     • Prompt Builder
     • API Caller
     • Response Parser
     • UI Renderers (Summary, Quiz, Flashcards)
     • History Manager
     • Utilities (copy, download, TTS, toast)
   ============================================================ */

// ─── DOM References ──────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  // Settings
  settingsToggle:  $('#settings-toggle'),
  settingsPanel:   $('#settings-panel'),
  apiKeyInput:     $('#api-key-input'),
  toggleKeyVis:    $('#toggle-key-vis'),
  saveKeyBtn:      $('#save-key-btn'),
  keyStatus:       $('#key-status'),

  // Input
  notesInput:      $('#notes-input'),
  charCounter:     $('#char-counter'),
  charWarning:     $('#char-warning'),
  difficulty:      $('#difficulty'),
  style:           $('#style'),
  generateBtn:     $('#generate-btn'),

  // Loading
  loadingSection:  $('#loading-section'),

  // Output
  outputSection:   $('#output-section'),
  summaryContent:  $('#summary-content'),
  quizContent:     $('#quiz-content'),
  submitQuiz:      $('#submit-quiz'),
  quizScore:       $('#quiz-score'),
  flashcardsContainer: $('#flashcards-container'),
  knownCount:      $('#known-count'),
  remainingCount:  $('#remaining-count'),
  resetCardsBtn:   $('#reset-cards-btn'),

  // Summary actions
  copyBtn:         $('#copy-btn'),
  downloadBtn:     $('#download-btn'),
  ttsBtn:          $('#tts-btn'),
  ttsStopBtn:      $('#tts-stop-btn'),

  // Theme
  themeToggle:     $('#theme-toggle'),

  // History
  historyList:     $('#history-list'),
  historySearch:   $('#history-search'),
  clearHistory:    $('#clear-history'),

  // Toast
  toastContainer:  $('#toast-container'),
};

// ─── Constants ───────────────────────────────────────────────
const MAX_CHARS     = 10000;
const WARN_CHARS    = 8000;
const STORAGE_KEYS  = {
  apiKey:   'studyai_api_key',
  theme:    'studyai_theme',
  history:  'studyai_history',
  scores:   'studyai_scores',
};
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─── State ───────────────────────────────────────────────────
let currentData     = null;   // The latest parsed AI response
let isGenerating    = false;
let knownCards      = new Set();
let quizSubmitted   = false;

// =============================================================
//  1. TOAST NOTIFICATIONS
// =============================================================

/** Show a toast message.  type: 'success' | 'error' | 'info' | 'warning' */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);
  // Remove after animation finishes
  setTimeout(() => toast.remove(), 4000);
}

// =============================================================
//  2. THEME MANAGEMENT
// =============================================================

/** Initialise theme from localStorage or system preference */
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved) {
    setTheme(saved);
  } else {
    // Respect OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }
}

/** Apply and persist the chosen theme */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

/** Toggle between light and dark */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// =============================================================
//  3. SETTINGS (API KEY)
// =============================================================

/** Load saved API key and show status */
function initSettings() {
  const key = getApiKey();
  if (key) {
    dom.apiKeyInput.value = key;
    setKeyStatus('✅ Key saved', 'saved');
  } else {
    setKeyStatus('⚠️ No API key set — add one above', 'missing');
  }
}

/** Get the API key from localStorage */
function getApiKey() {
  return localStorage.getItem(STORAGE_KEYS.apiKey) || '';
}

/** Save API key to localStorage */
function saveApiKey() {
  const key = dom.apiKeyInput.value.trim();
  if (!key) {
    setKeyStatus('❌ Please enter a valid key', 'error');
    return;
  }
  localStorage.setItem(STORAGE_KEYS.apiKey, key);
  setKeyStatus('✅ Key saved successfully!', 'saved');
  showToast('API key saved', 'success');
}

/** Update the key status indicator */
function setKeyStatus(text, cls) {
  dom.keyStatus.textContent = text;
  dom.keyStatus.className = `key-status ${cls}`;
}

/** Toggle API key visibility */
function toggleKeyVisibility() {
  const isPassword = dom.apiKeyInput.type === 'password';
  dom.apiKeyInput.type = isPassword ? 'text' : 'password';
  dom.toggleKeyVis.textContent = isPassword ? '🙈' : '👁️';
}

/** Toggle settings panel open/close */
function toggleSettings() {
  dom.settingsPanel.classList.toggle('hidden');
}

// =============================================================
//  4. CHARACTER COUNTER
// =============================================================

/** Update the character counter below the textarea */
function updateCharCounter() {
  const len = dom.notesInput.value.length;
  dom.charCounter.textContent = `${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;

  if (len >= MAX_CHARS) {
    dom.charCounter.style.color = 'var(--error)';
    dom.charWarning.textContent = '🚫 Character limit reached';
    dom.charWarning.classList.remove('hidden');
  } else if (len >= WARN_CHARS) {
    dom.charCounter.style.color = 'var(--warning)';
    dom.charWarning.textContent = '⚠️ Approaching limit';
    dom.charWarning.classList.remove('hidden');
  } else {
    dom.charCounter.style.color = '';
    dom.charWarning.classList.add('hidden');
  }
}

// =============================================================
//  5. PROMPT BUILDER
// =============================================================

/**
 * Build the AI prompt from user inputs.
 * We ask the AI to respond ONLY in JSON with a strict schema.
 */
function buildPrompt(notes, difficulty, style) {
  const styleMap = {
    standard: 'in a clear, standard academic style',
    eli10:    'as if explaining to a 10-year-old, using simple words and fun analogies',
    exam:     'in an exam-focused style with key facts, definitions, and likely exam questions',
    detailed: 'in a thorough, detailed style with in-depth explanations',
  };

  const difficultyMap = {
    easy:   'easy (basic recall, simple concepts)',
    medium: 'medium (understanding and application)',
    hard:   'hard (analysis, critical thinking, tricky edge cases)',
  };

  return `You are a study assistant. The student has provided the following notes or topic:

---
${notes}
---

Create study material ${styleMap[style] || styleMap.standard}.

Generate:
1. A clear SUMMARY of the topic (3–6 paragraphs).
2. A QUIZ with exactly 5 multiple-choice questions at ${difficultyMap[difficulty] || difficultyMap.medium} difficulty. Each question must have exactly 4 options labeled A, B, C, D. Include the correct answer letter and a brief explanation.
3. Exactly 8 FLASHCARDS with a front (question/term) and back (answer/definition).

⚠️ RESPOND ONLY WITH VALID JSON — no markdown, no code fences, no extra text.
Use this exact structure:

{
  "summary": "The summary text here...",
  "quiz": [
    {
      "question": "Question text?",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer": "A",
      "explanation": "Brief explanation"
    }
  ],
  "flashcards": [
    { "front": "Term or question", "back": "Definition or answer" }
  ]
}`;
}

// =============================================================
//  6. API CALLER
// =============================================================

/**
 * Call the Google Gemini API with the user's prompt.
 * Handles: missing key, network failure, HTTP errors (401, 429, etc.).
 * Returns the raw response JSON on success, or throws with a user-friendly message.
 */
async function callGeminiAPI(prompt, apiKey) {
  // Build the request URL with the API key as query parameter
  const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`;

  // Build the request body per Gemini API spec
  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    }
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    // Network failure (offline, DNS issues, etc.)
    throw new Error('Network error — check your internet connection and try again.');
  }

  // Handle HTTP errors with specific messages
  if (!response.ok) {
    switch (response.status) {
      case 400:
        throw new Error('Bad request — the prompt may be too long or malformed. Try shorter notes.');
      case 401:
        throw new Error('Invalid API key — please check your key in Settings.');
      case 403:
        throw new Error('Access denied — your API key may not have the Gemini API enabled.');
      case 429:
        throw new Error('Rate limit exceeded — you\'ve made too many requests. Wait a minute and try again.');
      case 500:
      case 503:
        throw new Error('The AI service is temporarily unavailable. Please try again in a moment.');
      default:
        throw new Error(`API error (HTTP ${response.status}) — something went wrong. Try again.`);
    }
  }

  // Parse the response body
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Failed to read the AI response. Please try again.');
  }

  return data;
}

// =============================================================
//  7. RESPONSE PARSER & VALIDATOR
// =============================================================

/**
 * Extract and validate the AI's JSON response.
 * The Gemini API wraps the answer in candidates[0].content.parts[0].text.
 * The text should be valid JSON matching our schema.
 */
function parseAIResponse(apiResponse) {
  // Navigate the Gemini response structure
  if (!apiResponse?.candidates?.length) {
    throw new Error('The AI returned an empty response. Please try again.');
  }

  const candidate = apiResponse.candidates[0];
  if (!candidate?.content?.parts?.length) {
    throw new Error('The AI response was malformed. Please try again.');
  }

  let rawText = candidate.content.parts[0].text;

  if (!rawText || typeof rawText !== 'string') {
    throw new Error('The AI returned no text. Please try again with different notes.');
  }

  // Strip markdown code fences if the AI wrapped its JSON in them
  rawText = rawText.trim();
  rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  rawText = rawText.trim();

  // Attempt to parse the JSON
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseError) {
    console.error('JSON parse failed. Raw text:', rawText);
    throw new Error('The AI did not reply in valid JSON. Please try again — this sometimes happens.');
  }

  // Validate required fields
  if (!parsed.summary || typeof parsed.summary !== 'string') {
    throw new Error('The AI response is missing the summary. Please try again.');
  }

  if (!Array.isArray(parsed.quiz) || parsed.quiz.length === 0) {
    throw new Error('The AI response is missing quiz questions. Please try again.');
  }

  // Validate each quiz question
  for (let i = 0; i < parsed.quiz.length; i++) {
    const q = parsed.quiz[i];
    if (!q.question || !q.options || !q.answer) {
      throw new Error(`Quiz question ${i + 1} is incomplete. Please try again.`);
    }
  }

  if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
    throw new Error('The AI response is missing flashcards. Please try again.');
  }

  // Validate each flashcard
  for (let i = 0; i < parsed.flashcards.length; i++) {
    const fc = parsed.flashcards[i];
    if (!fc.front || !fc.back) {
      throw new Error(`Flashcard ${i + 1} is incomplete. Please try again.`);
    }
  }

  return parsed;
}

// =============================================================
//  8. UI RENDERERS
// =============================================================

// ---- 8a. Summary ----

/** Render the summary text, converting basic markdown-like text to HTML */
function renderSummary(summary) {
  // Simple text-to-HTML conversion: paragraphs, bold, lists
  const html = summary
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '';
      // Bold: **text**
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return `<li>${line.slice(2)}</li>`;
      }
      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        return `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
      }
      return `<p>${line}</p>`;
    })
    .join('\n');

  dom.summaryContent.innerHTML = html;
}

// ---- 8b. Quiz ----

/** Render the quiz questions with radio button options */
function renderQuiz(quiz) {
  quizSubmitted = false;
  dom.submitQuiz.classList.remove('hidden');
  dom.submitQuiz.disabled = false;
  dom.quizScore.classList.add('hidden');

  dom.quizContent.innerHTML = quiz.map((q, idx) => {
    const optionsHTML = Object.entries(q.options).map(([letter, text]) => `
      <label class="quiz-option" data-question="${idx}" data-letter="${letter}">
        <input type="radio" name="q${idx}" value="${letter}" />
        <span><strong>${letter}.</strong> ${text}</span>
      </label>
    `).join('');

    return `
      <div class="quiz-question" data-index="${idx}">
        <h4><span class="q-num">Q${idx + 1}.</span> ${q.question}</h4>
        <div class="quiz-options">${optionsHTML}</div>
        <div class="quiz-explanation hidden">${q.explanation || ''}</div>
      </div>
    `;
  }).join('');
}

/** Submit the quiz: score it, highlight correct/incorrect */
function submitQuiz() {
  if (quizSubmitted || !currentData) return;
  quizSubmitted = true;

  const quiz = currentData.quiz;
  let score = 0;

  quiz.forEach((q, idx) => {
    const questionEl = $(`.quiz-question[data-index="${idx}"]`);
    const selected = questionEl.querySelector(`input[name="q${idx}"]:checked`);
    const selectedLetter = selected ? selected.value : null;
    const correctLetter = q.answer.toUpperCase();

    // Highlight the correct option
    const correctOpt = questionEl.querySelector(`[data-letter="${correctLetter}"]`);
    if (correctOpt) correctOpt.classList.add('correct-answer');

    if (selectedLetter === correctLetter) {
      score++;
      questionEl.classList.add('correct');
    } else {
      questionEl.classList.add('incorrect');
      // Highlight wrong selection
      if (selected) {
        selected.closest('.quiz-option').classList.add('wrong-answer');
      }
    }

    // Show explanation
    const explEl = questionEl.querySelector('.quiz-explanation');
    if (explEl && q.explanation) {
      explEl.classList.remove('hidden');
    }

    // Disable all radios
    questionEl.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
  });

  // Show score
  dom.quizScore.textContent = `Score: ${score} / ${quiz.length}`;
  dom.quizScore.className = `quiz-score ${score >= Math.ceil(quiz.length / 2) ? 'good' : 'bad'}`;
  dom.quizScore.classList.remove('hidden');
  dom.submitQuiz.disabled = true;

  // Save score to history
  saveQuizScore(score, quiz.length);

  showToast(`Quiz complete! You scored ${score}/${quiz.length}`, score >= Math.ceil(quiz.length / 2) ? 'success' : 'warning');
}

// ---- 8c. Flashcards ----

/** Render the flashcards with 3D flip animation */
function renderFlashcards(flashcards) {
  knownCards = new Set();
  updateFlashcardStats(flashcards.length);

  dom.flashcardsContainer.innerHTML = flashcards.map((fc, idx) => `
    <div class="flashcard" data-index="${idx}" onclick="window.__flipCard(this)">
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <p>${fc.front}</p>
          <span class="card-hint">Click to flip</span>
        </div>
        <div class="flashcard-back">
          <p>${fc.back}</p>
          <div class="flashcard-actions">
            <button onclick="event.stopPropagation(); window.__markKnown(${idx})">✅ Know it</button>
            <button onclick="event.stopPropagation(); window.__flipCard(this.closest('.flashcard'))">🔄 Flip</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Expose flashcard functions to onclick handlers
window.__flipCard = function(cardEl) {
  cardEl.classList.toggle('flipped');
};

window.__markKnown = function(idx) {
  const card = $(`.flashcard[data-index="${idx}"]`);
  if (knownCards.has(idx)) {
    knownCards.delete(idx);
    card.classList.remove('known');
  } else {
    knownCards.add(idx);
    card.classList.add('known');
    card.classList.remove('flipped');
  }
  updateFlashcardStats(currentData.flashcards.length);
};

/** Update flashcard known/remaining stats */
function updateFlashcardStats(total) {
  dom.knownCount.textContent = knownCards.size;
  dom.remainingCount.textContent = total - knownCards.size;
}

/** Reset all flashcards to unknown */
function resetCards() {
  if (!currentData) return;
  knownCards.clear();
  $$('.flashcard').forEach(c => {
    c.classList.remove('known', 'flipped');
  });
  updateFlashcardStats(currentData.flashcards.length);
  showToast('Flashcards reset', 'info');
}

// ---- 8d. Tabs ----

/** Switch between Summary, Quiz, and Flashcards tabs */
function switchTab(tabName) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  $$('.tab-content').forEach(tc => tc.classList.toggle('active', tc.id === `tab-${tabName}`));
}

// =============================================================
//  9. HISTORY MANAGER
// =============================================================

/** Load all history entries from localStorage */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
  } catch {
    return [];
  }
}

/** Save a new entry to history */
function saveToHistory(notes, difficulty, style, data) {
  const history = getHistory();
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    preview: notes.slice(0, 80),
    difficulty,
    style,
    notes,
    data,
  };
  history.unshift(entry);
  // Keep only the last 20 entries
  if (history.length > 20) history.pop();
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  renderHistory();
}

/** Delete a single history entry by ID */
function deleteHistoryItem(id) {
  let history = getHistory();
  history = history.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  renderHistory();
  showToast('History item deleted', 'info');
}

/** Clear all history */
function clearAllHistory() {
  if (!confirm('Delete all history? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEYS.history);
  renderHistory();
  showToast('All history cleared', 'info');
}

/** Load a history entry and display it */
function loadHistoryItem(id) {
  const history = getHistory();
  const entry = history.find(h => h.id === id);
  if (!entry) return;

  currentData = entry.data;
  dom.notesInput.value = entry.notes;
  dom.difficulty.value = entry.difficulty;
  dom.style.value = entry.style;
  updateCharCounter();

  renderSummary(entry.data.summary);
  renderQuiz(entry.data.quiz);
  renderFlashcards(entry.data.flashcards);

  dom.outputSection.classList.remove('hidden');
  switchTab('summary');
  dom.outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Loaded from history', 'info');
}

/** Render the history list UI */
function renderHistory(filter = '') {
  const history = getHistory();
  const filtered = filter
    ? history.filter(h => h.preview.toLowerCase().includes(filter.toLowerCase()))
    : history;

  if (filtered.length === 0) {
    dom.historyList.innerHTML = `<p class="history-empty">${
      filter ? 'No results match your search.' : 'No history yet. Generate your first study material!'
    }</p>`;
    return;
  }

  dom.historyList.innerHTML = filtered.map(entry => {
    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="history-item" data-id="${entry.id}">
        <div class="history-item-info" onclick="window.__loadHistory(${entry.id})">
          <div class="history-item-title">${escapeHTML(entry.preview)}${entry.preview.length >= 80 ? '…' : ''}</div>
          <div class="history-item-meta">${dateStr} at ${timeStr} · ${entry.difficulty} · ${entry.style}</div>
        </div>
        <div class="history-item-actions">
          <button onclick="event.stopPropagation(); window.__regenerate(${entry.id})" title="Regenerate">🔄</button>
          <button onclick="event.stopPropagation(); window.__deleteHistory(${entry.id})" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// Expose history functions
window.__loadHistory = loadHistoryItem;
window.__deleteHistory = deleteHistoryItem;
window.__regenerate = function(id) {
  const history = getHistory();
  const entry = history.find(h => h.id === id);
  if (!entry) return;
  dom.notesInput.value = entry.notes;
  dom.difficulty.value = entry.difficulty;
  dom.style.value = entry.style;
  updateCharCounter();
  handleGenerate();
};

// =============================================================
//  10. QUIZ SCORE TRACKER
// =============================================================

/** Save quiz score for progress tracking */
function saveQuizScore(score, total) {
  try {
    const scores = JSON.parse(localStorage.getItem(STORAGE_KEYS.scores) || '[]');
    scores.push({ date: new Date().toISOString(), score, total });
    // Keep last 50 scores
    if (scores.length > 50) scores.shift();
    localStorage.setItem(STORAGE_KEYS.scores, JSON.stringify(scores));
  } catch { /* silent */ }
}

// =============================================================
//  11. UTILITIES
// =============================================================

/** Escape HTML to prevent XSS */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Copy the summary to clipboard */
async function copySummary() {
  if (!currentData) return;
  try {
    await navigator.clipboard.writeText(currentData.summary);
    showToast('Summary copied to clipboard!', 'success');
  } catch {
    showToast('Failed to copy — try selecting the text manually', 'error');
  }
}

/** Download the summary as a text file */
function downloadSummary() {
  if (!currentData) return;
  const blob = new Blob([currentData.summary], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `StudyAI-Summary-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Summary downloaded!', 'success');
}

/** Read the summary aloud using the Web Speech API */
function readSummaryAloud() {
  if (!currentData) return;

  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech is not supported in your browser', 'warning');
    return;
  }

  // Stop any current speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(currentData.summary);
  utterance.rate = 0.95;
  utterance.pitch = 1;

  utterance.onstart = () => {
    dom.ttsBtn.classList.add('hidden');
    dom.ttsStopBtn.classList.remove('hidden');
  };

  utterance.onend = () => {
    dom.ttsBtn.classList.remove('hidden');
    dom.ttsStopBtn.classList.add('hidden');
  };

  utterance.onerror = () => {
    dom.ttsBtn.classList.remove('hidden');
    dom.ttsStopBtn.classList.add('hidden');
  };

  window.speechSynthesis.speak(utterance);
}

/** Stop text-to-speech */
function stopTTS() {
  window.speechSynthesis.cancel();
  dom.ttsBtn.classList.remove('hidden');
  dom.ttsStopBtn.classList.add('hidden');
}

// =============================================================
//  12. MAIN GENERATE HANDLER
// =============================================================

/** The main flow: validate → build prompt → call API → parse → render */
async function handleGenerate() {
  // ── Validation ──
  const apiKey = getApiKey();
  if (!apiKey) {
    showToast('Please add your API key in Settings first', 'error');
    dom.settingsPanel.classList.remove('hidden');
    dom.apiKeyInput.focus();
    return;
  }

  const notes = dom.notesInput.value.trim();
  if (!notes) {
    showToast('Please enter your notes or a topic to study', 'warning');
    dom.notesInput.focus();
    return;
  }

  if (notes.length > MAX_CHARS) {
    showToast(`Notes are too long (${notes.length.toLocaleString()} chars). Max is ${MAX_CHARS.toLocaleString()}.`, 'warning');
    return;
  }

  const difficulty = dom.difficulty.value;
  const style = dom.style.value;

  // ── UI: Show loading ──
  setGenerating(true);

  try {
    // Build the prompt
    const prompt = buildPrompt(notes, difficulty, style);

    // Call the API
    const rawResponse = await callGeminiAPI(prompt, apiKey);
    console.log('API raw response:', rawResponse);

    // Parse and validate
    const data = parseAIResponse(rawResponse);
    console.log('Parsed data:', data);

    currentData = data;

    // Render all three sections
    renderSummary(data.summary);
    renderQuiz(data.quiz);
    renderFlashcards(data.flashcards);

    // Show output, switch to summary tab
    dom.outputSection.classList.remove('hidden');
    switchTab('summary');
    dom.outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Save to history
    saveToHistory(notes, difficulty, style, data);

    showToast('Study material generated successfully!', 'success');

  } catch (error) {
    console.error('Generation failed:', error);
    showToast(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    setGenerating(false);
  }
}

/** Update UI to reflect generating / idle state */
function setGenerating(generating) {
  isGenerating = generating;
  dom.generateBtn.disabled = generating;
  dom.generateBtn.querySelector('.btn-text').classList.toggle('hidden', generating);
  dom.generateBtn.querySelector('.btn-loading').classList.toggle('hidden', !generating);
  dom.loadingSection.classList.toggle('hidden', !generating);
}

// =============================================================
//  13. EVENT LISTENERS
// =============================================================

function initEventListeners() {
  // Settings
  dom.settingsToggle.addEventListener('click', toggleSettings);
  dom.saveKeyBtn.addEventListener('click', saveApiKey);
  dom.toggleKeyVis.addEventListener('click', toggleKeyVisibility);

  // Also save key on Enter
  dom.apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveApiKey();
  });

  // Theme
  dom.themeToggle.addEventListener('click', toggleTheme);

  // Character counter
  dom.notesInput.addEventListener('input', updateCharCounter);

  // Generate
  dom.generateBtn.addEventListener('click', handleGenerate);

  // Allow Ctrl/Cmd + Enter to generate
  dom.notesInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isGenerating) {
      handleGenerate();
    }
  });

  // Tabs
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Summary actions
  dom.copyBtn.addEventListener('click', copySummary);
  dom.downloadBtn.addEventListener('click', downloadSummary);
  dom.ttsBtn.addEventListener('click', readSummaryAloud);
  dom.ttsStopBtn.addEventListener('click', stopTTS);

  // Quiz
  dom.submitQuiz.addEventListener('click', submitQuiz);

  // Flashcards
  dom.resetCardsBtn.addEventListener('click', resetCards);

  // History
  dom.clearHistory.addEventListener('click', clearAllHistory);
  dom.historySearch.addEventListener('input', (e) => renderHistory(e.target.value));
}

// =============================================================
//  14. INITIALISATION
// =============================================================

function init() {
  initTheme();
  initSettings();
  initEventListeners();
  renderHistory();
  updateCharCounter();
  console.log('🧠 StudyAI initialised');
}

// Run on DOM ready
init();
