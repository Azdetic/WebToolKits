<p align="center">
  <img src="https://img.shields.io/badge/WebToolKit-v1.0.0-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="WebToolKit" />
  <img src="https://img.shields.io/badge/Manifest-V3-green?style=for-the-badge" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Edge-Supported-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white" alt="Edge" />
  <img src="https://img.shields.io/badge/Chrome-Supported-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome" />
</p>

<h1 align="center">WebToolKit</h1>

<p align="center">
  <i>A lightweight browser extension that captures web page content, merges multiple pages into one clipboard-ready block, and auto-answers Google Form quizzes, all from a single popup</i>
</p>

---

## <img src="https://img.shields.io/badge/-Features-FF6B6B?style=flat-square" alt="Features" /> What It Does

WebToolKit is built around **three core features**:

### <img src="https://img.shields.io/badge/1-Page_Capture-4A90E2?style=flat-square" alt="1" /> Page Content Capture

Grabs the **main content** of any web page (articles, blog posts, course material, documentation) while automatically filtering out navigation bars, sidebars, ads, footers, and other junk

- Uses a **smart scoring system** that analyzes HTML tags, class names, roles, and text density to find the most relevant content block on the page
- Falls back to progressively broader strategies if the first approach does not find anything meaningful
- Strips scripts, event handlers, and dangerous attributes from captured HTML for safety

### <img src="https://img.shields.io/badge/2-Merge_&_Copy-6f42c1?style=flat-square" alt="2" /> Multi-Page Merge & Copy

Select multiple captured entries, merge them into a single formatted text block, and copy it to your clipboard in one click

- Entries are sorted **chronologically** when merged
- Each page section includes configurable metadata (title, URL, timestamp)
- Supports both the modern Clipboard API and a legacy fallback for older browsers
- If both clipboard methods fail, a manual copy dialog appears as a last resort

### <img src="https://img.shields.io/badge/3-AI_Auto--Answer-00897b?style=flat-square" alt="3" /> AI-Powered Auto-Answer

Detects quiz questions (Google Forms & Moodle) and answers them automatically using Advanced AI models!

- Supports multiple AI providers: **Google Gemini**, **Groq (Llama)**, **OpenAI (ChatGPT)**, and **DeepSeek**
- **Auto-detects API keys** and configures the best model automatically
- **Multimodal (Vision) Support**: Can read and analyze questions that contain images or code screenshots (supported by Gemini, Groq, and OpenAI)
- Features a **human-like delay** system (configurable Min/Max) so answers aren't submitted instantly, avoiding bot detection
- Works with Google Forms (reads hidden `FB_PUBLIC_LOAD_DATA_`) and Moodle Remui LMS (smart DOM extraction)
- Handles complex interactions like selecting radio buttons, checkboxes, and bypassing response validation rules

---

## <img src="https://img.shields.io/badge/-Installation-28a745?style=flat-square" alt="Install" /> How to Install

### <img src="https://img.shields.io/badge/Step_1-Download-lightgrey?style=flat-square" alt="Step 1" /> Get the files

Make sure you have all these files in one folder:

```
WebToolKit/
├── manifest.json       <- extension config (Manifest V3)
├── background.js       <- service worker handling messages & storage
├── content.js          <- injected into every page for capture & form solving
├── popup.html          <- the popup UI structure
├── popup.js            <- popup logic and user interactions
├── popup.css           <- popup styling
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           <- you are here
```

### <img src="https://img.shields.io/badge/Step_2-Load-lightgrey?style=flat-square" alt="Step 2" /> Load it in your browser

<details>
<summary><img src="https://img.shields.io/badge/-Microsoft_Edge-0078D7?style=flat-square&logo=microsoftedge&logoColor=white" alt="Edge" /> <b>Microsoft Edge</b></summary>

1. Open `edge://extensions/` in the address bar
2. Toggle **Developer mode** ON (bottom-left corner)
3. Click **Load unpacked**
4. Select the `WebToolKit` folder
5. Done, you should see the icon in your toolbar

</details>

<details>
<summary><img src="https://img.shields.io/badge/-Google_Chrome-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome" /> <b>Google Chrome</b></summary>

1. Open `chrome://extensions/`
2. Toggle **Developer mode** ON (top-right corner)
3. Click **Load unpacked**
4. Select the `WebToolKit` folder
5. Done, the icon appears in your toolbar

</details>

### <img src="https://img.shields.io/badge/Step_3-Pin-lightgrey?style=flat-square" alt="Step 3" /> Pin it (recommended)

Click the puzzle piece icon in your toolbar, then click the pin next to **WebToolKit** so it is always visible

---

## <img src="https://img.shields.io/badge/-Usage-007bff?style=flat-square" alt="Usage" /> How to Use

### Capturing Pages

1. Click the WebToolKit icon in your toolbar
2. Press **Start** to activate capture mode (status turns green)
3. Browse to any page you want to save
4. Click **Capture Now** to grab the main content
5. The entry appears in your list with a preview, domain, timestamp, and size

> **Auto-capture mode**: When capture mode is active, WebToolKit also automatically captures content whenever you navigate to a new page (with a 2-second delay to let the page fully load)

### Merging & Copying

1. Check the boxes next to entries you want to combine
2. Use **Select All** / **Deselect All** for bulk selection
3. Click **Merge + Copy**
4. The combined text lands in your clipboard, formatted like this:

```
============== Page 1 ==============
Title: Introduction to Algorithms
URL: https://example.com/algorithms
Time: 2/26/2026, 2:30:00 PM

[full page content here]

============== Page 2 ==============
Title: Data Structures Overview
URL: https://example.com/data-structures
Time: 2/26/2026, 2:35:00 PM

[full page content here]
```

You can toggle which metadata fields appear (title, URL, time) in **Settings**

### Auto-Answering Quizzes (Google Forms & Moodle)

1. Open the WebToolKit extension popup and click the **⚙️ AI Settings** gear icon
2. Paste your API Key. You can get a free API key from these providers:
   - **Google Gemini:** [Google AI Studio](https://aistudio.google.com/app/apikey) (Recommended, has Free Tier)
   - **Groq:** [Groq Console](https://console.groq.com/keys) (Super fast, has Free Tier)
   - **OpenAI:** [OpenAI Platform](https://platform.openai.com/api-keys) (Paid)
   - **DeepSeek:** [DeepSeek Platform](https://platform.deepseek.com/api_keys) (Paid)
3. The extension will auto-detect the provider and select the best model (e.g., *Gemini 2.0 Flash* or *Llama 4 Scout* for vision support)
4. Set your preferred **Human-like Delay (Min/Max)** to avoid bot detection (e.g., 2s - 5s per question)
5. Open a Google Form quiz or Moodle quiz page in your browser
6. Open the **⚙️ AI Settings** again and toggle **"Auto navigate to next page"** if you have a multi-page quiz
7. Click the WebToolKit icon and press **🤖 AI Auto Answer**
8. Sit back! The AI will read the questions (including images!), stream the answers, and select the correct choices for you automatically. If the auto-navigate is ON, it will seamlessly jump to the next page and continue solving

> **Note on Providers:** Using models with **Vision capabilities** (like Gemini or Groq) is highly recommended for quizzes that contain images or screenshots. All API communication happens locally from your browser to the provider; we do not store your keys

---

## <img src="https://img.shields.io/badge/-Architecture-6f42c1?style=flat-square" alt="Architecture" /> How It Works Under the Hood

WebToolKit uses the standard **Manifest V3** extension architecture:

```
┌──────────────┐     messages      ┌──────────────────┐
│   popup.js   │ <──────────────>  │  background.js   │
│  (user UI)   │                   │ (service worker)  │
└──────────────┘                   └────────┬─────────┘
                                            │
                                   messages │
                                            v
                                   ┌──────────────────┐
                                   │   content.js     │
                                   │ (runs on pages)  │
                                   └──────────────────┘
```

| Component | Role |
|-----------|------|
| **popup.js** | Renders the UI, handles button clicks, manages entry selection, and communicates with the background script |
| **background.js** | Central message hub that receives commands from the popup, talks to content scripts, manages chrome.storage for entries and settings |
| **content.js** | Injected into every web page to handle content extraction using the scoring algorithm, and handles Google Form answer detection |

### <img src="https://img.shields.io/badge/-Scoring_Algorithm-FF6B6B?style=flat-square" alt="Scoring" /> Content Scoring Algorithm

When capturing a page, `content.js` scores every potential content block using these factors:

| Factor | Points | Example |
|--------|--------|---------|
| `<main>` tag | +50 | Semantic main content area |
| `<article>` tag | +40 | Blog post or news article |
| Class/ID contains "content" | +30 | `.main-content`, `#content` |
| Class/ID contains "article" | +25 | `.article-body` |
| Has paragraphs `<p>` | +2 each (max 20) | Real text content |
| Has headings `<h1>`-`<h6>` | +3 each (max 15) | Structured content |
| Class/ID contains "sidebar" | -40 | Side panel |
| Class/ID contains "nav" | -40 | Navigation menu |
| Class/ID contains "ad" | -50 | Advertisement |
| Too many `<nav>` children | -20 | Navigation-heavy block |

The element with the highest score wins and gets extracted

### <img src="https://img.shields.io/badge/-AI_Auto--Answer_Flow-00897b?style=flat-square" alt="GForm" /> AI Auto-Answer Data Flow

```
1. User configures API Key in popup.js 
2. content.js scans the DOM for supported quiz containers (Moodle or Google Forms)
3. Extracts question text, choices, and any base64/URL images within the block
4. Sends payload to background.js, which delegates to ai-provider.js
5. ai-provider.js formats the prompt (adding multimodal parts if Vision is supported)
6. Calls the respective AI API (Gemini/Groq/OpenAI/DeepSeek)
7. AI responds with the correct choice text or index
8. content.js simulates human clicks (using label[for], aria-labelledby, and Event dispatchers) after a randomized delay
```

For Google Forms, if the answers are already embedded in the page's payload (`FB_PUBLIC_LOAD_DATA_`), WebToolKit can bypass the AI entirely and solve it instantly using a script injection workaround.

---

## <img src="https://img.shields.io/badge/-Data_&_Storage-ffc107?style=flat-square&logoColor=black" alt="Storage" /> Data & Storage

### Entry Format

Each captured page is stored as a JSON object:

```json
{
  "id": "1709012345678",
  "url": "https://example.com/article",
  "title": "Example Article Title",
  "excerptText": "First 200 characters of the content...",
  "fullText": "Full extracted text (up to 100KB)",
  "htmlOptional": "Raw HTML of the content block (up to 100KB)",
  "timestamp": "2026-02-26T06:30:00.000Z",
  "trimmed": false
}
```

### Storage Limits

| Limit | Value |
|-------|-------|
| Max entries | 200 (oldest removed automatically) |
| Max text per entry | 100 KB |
| Max HTML per entry | 100 KB |
| Storage type | `chrome.storage.local` (no sync) |

### Export & Import

- **Export** saves all entries as a `.json` file to your downloads folder
- **Import** reads a `.json` file and replaces current entries (with confirmation)

---

## <img src="https://img.shields.io/badge/-Permissions-dc3545?style=flat-square" alt="Permissions" /> Permissions Explained

| Permission | Why it is needed |
|------------|-----------------|
| `storage` | Save captured entries and user settings locally |
| `scripting` | Inject content scripts and capture functions into web pages |
| `activeTab` | Access the currently active tab when you click Capture Now |
| `clipboardWrite` | Copy merged text to your clipboard |
| `tabs` | Listen for tab navigation events for auto-capture |
| `<all_urls>` | Allow content capture from any website |

<img src="https://img.shields.io/badge/Privacy-All_data_stays_local-28a745?style=flat-square" alt="Privacy" /> Nothing is sent to any external server

---

## <img src="https://img.shields.io/badge/-Debugging-17a2b8?style=flat-square" alt="Debug" /> Debugging

1. **Background script logs**: Go to `edge://extensions/` → find WebToolKit → click "Inspect views: service worker"
2. **Popup logs**: Right-click the popup → Inspect
3. **Content script logs**: Open DevTools (F12) on the target page → Console tab
4. **Built-in debug panel**: Click the **Debug Info** button in the popup to see current state, tab info, and storage stats

After making code changes, go to `edge://extensions/` and click the reload button on WebToolKit to apply them

---

## <img src="https://img.shields.io/badge/-Limitations-FFB347?style=flat-square" alt="Limitations" /> Known Limitations

- Cannot capture `chrome://`, `edge://`, `about:`, or `file://` pages (browser restriction)
- Cannot capture extension pages or pages with strict Content Security Policy
- Storage is local only so entries do not sync between devices
- Very large pages may be trimmed to 100KB
- AI Auto-Answer accuracy highly depends on the selected AI model (Gemini/Groq recommended for image questions)
- DeepSeek API requires a paid balance (Free Tier is not available for API usage)

---

## <img src="https://img.shields.io/badge/-Compatibility-4A90E2?style=flat-square" alt="Compat" /> Browser Compatibility

| Browser | Status |
|---------|--------|
| Microsoft Edge (Chromium) | <img src="https://img.shields.io/badge/-Fully_Supported-28a745?style=flat-square" /> |
| Google Chrome | <img src="https://img.shields.io/badge/-Compatible-28a745?style=flat-square" /> |
| Firefox | <img src="https://img.shields.io/badge/-Not_Compatible-dc3545?style=flat-square" /> |
| Safari | <img src="https://img.shields.io/badge/-Not_Compatible-dc3545?style=flat-square" /> |

---

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Updated-February_2026-lightgrey?style=flat-square" alt="Updated" />
  <br/>
  <a href="https://github.com/Azdetic"><img src="https://img.shields.io/badge/Made_by-Azdetic-4A90E2?style=flat-square&logo=github" alt="Author" /></a>
  <a href="https://github.com/Azdetic/WebToolKits"><img src="https://img.shields.io/badge/Repo-WebToolKits-181717?style=flat-square&logo=github" alt="Repo" /></a>
</p>
