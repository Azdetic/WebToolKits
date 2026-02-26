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

### <img src="https://img.shields.io/badge/3-GForm_Solver-00897b?style=flat-square" alt="3" /> Google Form Auto-Answer

Detects quiz answers embedded in Google Forms and fills them in automatically

- Reads the hidden `FB_PUBLIC_LOAD_DATA_` variable that Google Forms uses to store answer keys
- Works with **multiple choice**, **checkboxes**, **short answer**, **paragraph**, and **dropdown** question types
- Handles response validation rules (passwords, access codes, number matching)
- Uses a content script isolation workaround (injects into the page's MAIN world via a `<script>` tag, then passes data back through a CustomEvent)

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

### Auto-Answering Google Forms

1. Open any Google Form quiz in your browser
2. Click the WebToolKit icon
3. Press **Answer GForm**
4. WebToolKit reads the embedded answer key and fills in the correct answers
5. A success message tells you how many questions were answered

> This only works on forms that **have an answer key** (typically quiz-mode forms where answers are stored in the page data)

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

### <img src="https://img.shields.io/badge/-GForm_Flow-00897b?style=flat-square" alt="GForm" /> Google Form Data Flow

```
1. content.js injects a <script> tag into the page (MAIN world)
2. The injected script reads FB_PUBLIC_LOAD_DATA_ (the answer key)
3. Data is passed back via CustomEvent ('__gform_data_result__')
4. content.js receives the data in the ISOLATED world
5. Answers are parsed and matched to DOM elements
6. Form fields are filled programmatically using native setters
```

If the injected script approach fails, it falls back to parsing `<script>` tags directly using bracket counting to extract the JSON data

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
- Google Form auto-answer only works when the form has a visible answer key (quiz mode)
- Storage is local only so entries do not sync between devices
- Very large pages may be trimmed to 100KB

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
  <img src="https://img.shields.io/badge/Updated-February_2026-lightgrey?style=flat-square" alt="Updated" />
</p>
