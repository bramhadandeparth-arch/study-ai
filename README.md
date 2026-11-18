# 🧠 StudyAI — Smart Study Assistant

A sleek, AI-powered study tool that transforms your class notes or any topic into structured study material: **summaries**, **quizzes**, and **flashcards** — all generated instantly using Google's Gemini AI.

![StudyAI Screenshot](screenshot.png)

---

## ✨ Features

### Core
- **AI-Powered Generation** — Paste notes or type a topic; AI creates a summary, 5-question quiz, and 8 flashcards
- **Summary** with Copy to Clipboard and Download as Text File
- **Interactive Quiz** — Multiple-choice with scoring, correct answer highlighting, and explanations
- **Flashcards** — Click to flip with smooth 3D animation; mark cards as "Known" and track progress
- **History** — All generations saved to localStorage; click to reload, search, or regenerate
- **Complete Error Handling** — Clear messages for missing API key, empty input, network failure, invalid key (401), rate limits (429), and malformed AI responses
- **Fully Responsive** — Works beautifully on phone, tablet, and desktop

### Extra Features
- 🌙 **Dark / Light Mode** — Toggle with one click; preference remembered across sessions
- 📊 **Difficulty Selector** — Choose Easy, Medium, or Hard quiz questions
- 🎨 **Style Selector** — Standard, "Explain Like I'm 10", Exam-Focused, or Detailed
- 🔊 **Text-to-Speech** — Read the summary aloud using the browser's Speech Synthesis API
- 🃏 **Flashcard Tracking** — Mark cards as known/unknown with a running count
- 🔍 **History Search & Filter** — Find past generations by keyword
- 🔄 **Regenerate** — Re-run generation on any history item for a different answer
- 📏 **Character Counter** — Live count with limit warning for the notes input
- 🔔 **Toast Notifications** — Non-intrusive feedback for all actions and errors

---

## 🚀 Getting Started

### 1. Get a Free API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (it starts with `AIza...`)

> The free tier gives you generous usage — no credit card required.

### 2. Run the App

**Option A — Open directly:**
Just open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

**Option B — Use a local server (recommended):**
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .

# Using VS Code
# Install "Live Server" extension → Right-click index.html → "Open with Live Server"
```

Then open `http://localhost:8000` in your browser.

### 3. Enter Your API Key

1. Click the **⚙️ Settings** button in the header
2. Paste your Gemini API key
3. Click **Save Key**

Your key is stored **only in your browser's localStorage** — it is never sent anywhere except directly to Google's API.

### 4. Generate Study Material

1. Type or paste your notes/topic in the text area
2. Choose a difficulty level and style (optional)
3. Click **✨ Generate**
4. Browse your Summary, Quiz, and Flashcards using the tabs

---

## 🔐 API Key Security

- Your API key is **never hardcoded** in the source code
- It is stored in `localStorage` and only sent to Google's Gemini API endpoint
- Each user enters their **own key** — the app contains no secrets
- **Never commit API keys to Git** — this project has no keys in any commit

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic elements) |
| Styling | CSS3 (custom properties, flexbox, grid, animations) |
| Logic | Vanilla JavaScript (ES6 modules, async/await, Fetch API) |
| AI | Google Gemini 2.0 Flash API |
| Storage | Browser localStorage |
| Speech | Web Speech Synthesis API |

---

## 📁 Project Structure

```
├── index.html          # Main HTML page
├── css/
│   └── style.css       # All styles, theming, responsive design
├── js/
│   └── app.js          # Application logic (modular functions)
└── README.md           # This file
```

---

## 📝 Code Organisation

The JavaScript is organised into clearly separated modules:

1. **Toast Notifications** — Non-blocking user feedback
2. **Theme Management** — Dark/light mode with localStorage persistence
3. **Settings** — API key input, save, and validation
4. **Character Counter** — Live textarea character tracking
5. **Prompt Builder** — Constructs the AI prompt with difficulty and style
6. **API Caller** — `fetch()` with full HTTP error handling
7. **Response Parser** — JSON parsing with `try/catch` and field validation
8. **UI Renderers** — Separate functions for Summary, Quiz, and Flashcards
9. **History Manager** — CRUD operations on localStorage history
10. **Utilities** — Copy, download, text-to-speech

---

## 🧪 Error Handling

| Scenario | User Sees |
|----------|-----------|
| No API key | "Please add your API key in Settings first" |
| Empty notes | "Please enter your notes or a topic to study" |
| Notes too long | Character count warning + error toast |
| Invalid API key (401) | "Invalid API key — please check your key in Settings" |
| Rate limited (429) | "Rate limit exceeded — wait a minute and try again" |
| Network offline | "Network error — check your internet connection" |
| AI returns bad JSON | "The AI did not reply in valid JSON. Please try again" |
| AI missing fields | Specific field-level error message |

---

## 📱 Responsive Design

- **Desktop** (>768px): Full layout with side-by-side options
- **Tablet** (768px): Stacked options, full-width buttons
- **Mobile** (<480px): Compact layout, single-column flashcards

---

## 📄 License

This project is for educational purposes. Feel free to use and modify.
