// webtoolkit popup javascript
// handles ui and extension features

class WebToolKit {
  constructor() {
    this.capturing = false;
    this.entries = [];
    this.selectedEntries = new Set();
    this.settings = {
      includeTitle: true,
      includeURL: true,
      includeTime: true,
    };
    this.init();
  }

  async init() {
    await this.setupEventListeners();
    await this.loadState();
    this.updateUI();
  }

  setupEventListeners() {
    // buttons to control app
    document
      .getElementById("startBtn")
      .addEventListener("click", () => this.startCapturing());
    document
      .getElementById("stopBtn")
      .addEventListener("click", () => this.stopCapturing());
    document
      .getElementById("captureBtn")
      .addEventListener("click", () => this.captureNow());

    // buttons to select things
    document
      .getElementById("selectAllBtn")
      .addEventListener("click", () => this.selectAll());
    document
      .getElementById("deselectAllBtn")
      .addEventListener("click", () => this.deselectAll());
    document
      .getElementById("mergeBtn")
      .addEventListener("click", () => this.mergeAndCopy());

    // buttons for data stuff
    document
      .getElementById("exportBtn")
      .addEventListener("click", () => this.exportData());
    document
      .getElementById("importBtn")
      .addEventListener("click", () => this.triggerImport());
    document
      .getElementById("importFile")
      .addEventListener("change", (e) => this.importData(e));
    document
      .getElementById("clearAllBtn")
      .addEventListener("click", () => this.clearAll());
    document
      .getElementById("testCopyBtn")
      .addEventListener("click", () => this.testClipboard());
    document
      .getElementById("debugBtn")
      .addEventListener("click", () => this.showDebugInfo());
    document
      .getElementById("settingsBtn")
      .addEventListener("click", () => this.showSettings());
    document
      .getElementById("gformBtn")
      .addEventListener("click", () => this.answerGForm());
    document
      .getElementById("aiAutoBtn")
      .addEventListener("click", () => this.aiAutoAnswer());
    document
      .getElementById("aiSettingsBtn")
      .addEventListener("click", () => this.showAISettings());
  }

  async loadState() {
    console.log("🔄 Loading initial state...");
    try {
      // load current capture status
      console.log("📡 Requesting capture status...");
      const statusResponse = await this.sendMessage({
        action: "getCaptureStatus",
      });
      console.log("📡 Status response:", statusResponse);

      if (statusResponse.success) {
        this.capturing = statusResponse.capturing;
        console.log("✅ Capturing status loaded:", this.capturing);
      } else {
        console.error(
          "❌ Failed to load capture status:",
          statusResponse.error
        );
      }

      // load saved entries
      console.log("📡 Requesting entries...");
      const entriesResponse = await this.sendMessage({ action: "getEntries" });
      console.log("📡 Entries response:", entriesResponse);

      if (entriesResponse.success) {
        this.entries = entriesResponse.entries || [];
        console.log("✅ Entries loaded:", this.entries.length, "entries");
      } else {
        console.error("❌ Failed to load entries:", entriesResponse.error);
      }

      // load current settings
      console.log("📡 Loading settings...");
      const settingsResponse = await this.sendMessage({
        action: "getSettings",
      });
      if (settingsResponse.success && settingsResponse.settings) {
        this.settings = { ...this.settings, ...settingsResponse.settings };
        console.log("✅ Settings loaded:", this.settings);
      } else {
        console.log("📝 Using default settings:", this.settings);
      }
    } catch (error) {
      console.error("❌ Error loading state:", error);
      this.showMessage("Error loading state: " + error.message, "error");
    }
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  async startCapturing() {
    console.log("🚀 Starting capture mode...");
    try {
      const response = await this.sendMessage({
        action: "setCaptureStatus",
        capturing: true,
      });
      console.log("📡 Start capture response:", response);

      if (response.success) {
        this.capturing = true;
        this.updateUI();
        console.log("✅ Capture mode started successfully");
        this.showMessage(
          "Auto-capturing started! Content will be captured automatically when you visit new pages.",
          "success"
        );
      } else {
        console.error("❌ Failed to start capture:", response.error);
        this.showMessage(
          "Failed to start capturing: " + response.error,
          "error"
        );
      }
    } catch (error) {
      console.error("❌ Error starting capture:", error);
      this.showMessage("Error starting capture: " + error.message, "error");
    }
  }

  async stopCapturing() {
    try {
      const response = await this.sendMessage({
        action: "setCaptureStatus",
        capturing: false,
      });

      if (response.success) {
        this.capturing = false;
        this.updateUI();
        this.showMessage("Capturing stopped.", "info");
      } else {
        this.showMessage(
          "Failed to stop capturing: " + response.error,
          "error"
        );
      }
    } catch (error) {
      this.showMessage("Error stopping capture: " + error.message, "error");
    }
  }

  async captureNow() {
    console.log("📸 Capture Now clicked...");
    console.log("Current capturing state:", this.capturing);

    if (!this.capturing) {
      console.log("❌ Capturing not active");
      this.showMessage("Capturing is not active. Press Start first.", "error");
      return;
    }

    try {
      // grab current active tab
      console.log("🔍 Getting active tab...");
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log("📄 Active tab:", tab);

      if (!tab) {
        console.log("❌ No active tab found");
        this.showMessage("No active tab found.", "error");
        return;
      }

      // check if url is okay for content scripts
      console.log("🔍 Checking URL validity:", tab.url);
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("extension://")
      ) {
        console.log("❌ Invalid URL for capture:", tab.url);
        this.showMessage("Cannot capture from this type of page.", "error");
        return;
      }

      console.log("✅ Valid URL, starting capture...");
      this.showMessage("Capturing content...", "info");

      // tell background script to capture
      console.log("📡 Sending capture request to background...");
      const response = await this.sendMessage({ action: "captureContent" });
      console.log("📡 Capture response:", response);

      if (response.success) {
        console.log("✅ Capture successful, adding entry:", response.entry);
        this.entries.unshift(response.entry);
        this.updateUI();
        this.showMessage("Content captured successfully!", "success");
      } else {
        console.error("❌ Capture failed:", response.error);
        this.showMessage("Capture failed: " + response.error, "error");
      }
    } catch (error) {
      console.error("❌ Error during capture:", error);
      this.showMessage("Error during capture: " + error.message, "error");
    }
  }

  async answerGForm() {
    console.log("📝 Answer GForm clicked...");
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        this.showMessage("No active tab found.", "error");
        return;
      }

      // check if page is a google form
      if (
        !tab.url ||
        !tab.url.includes("docs.google.com/forms")
      ) {
        this.showMessage(
          "❌ This page is not a Google Form. Please open a Google Form first.",
          "error"
        );
        return;
      }

      this.showMessage("🔍 Detecting Google Form answers...", "info");

      // ask content script to get and fill answers
      const response = await this.sendMessage({
        action: "answerGForm",
        tabId: tab.id,
      });

      if (response && response.success) {
        this.showMessage(
          `✅ Auto-answered ${response.answeredCount} question(s)!`,
          "success"
        );
      } else {
        const errorMsg =
          response?.error ||
          "Could not detect answers. This form may not be a quiz or answers are not available.";
        this.showMessage(`❌ ${errorMsg}`, "error");
      }
    } catch (error) {
      console.error("❌ GForm error:", error);
      this.showMessage(
        "❌ Error: " + error.message,
        "error"
      );
    }
  }

  updateUI() {
    // update status text
    const statusText = document.getElementById("statusText");
    const captureBtn = document.getElementById("captureBtn");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (this.capturing) {
      statusText.textContent = "Status: Auto-Capturing Active";
      statusText.className = "status capturing";
      captureBtn.disabled = false;
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      statusText.textContent = "Status: Stopped";
      statusText.className = "status stopped";
      captureBtn.disabled = true;
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }

    // update entry numbers
    document.getElementById(
      "entryCount"
    ).textContent = `${this.entries.length} entries`;
    document.getElementById(
      "selectedCount"
    ).textContent = `${this.selectedEntries.size} selected`;

    // update merge button state
    document.getElementById("mergeBtn").disabled =
      this.selectedEntries.size === 0;

    // show entries on screen
    this.renderEntries();
  }

  renderEntries() {
    const entriesList = document.getElementById("entriesList");

    if (this.entries.length === 0) {
      entriesList.innerHTML =
        '<div class="no-entries">No entries captured yet. Press Start to begin capturing.</div>';
      return;
    }

    entriesList.innerHTML = this.entries
      .map((entry) => this.renderEntry(entry))
      .join("");

    // add listeners to checkboxes and delete buttons
    this.entries.forEach((entry) => {
      const checkbox = document.getElementById(`checkbox-${entry.id}`);
      const deleteBtn = document.getElementById(`delete-${entry.id}`);

      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          console.log(
            `Checkbox changed for entry ${entry.id}: ${e.target.checked}`
          );
          if (e.target.checked) {
            this.selectedEntries.add(entry.id);
            console.log(
              `Added entry ${entry.id} to selection. Total selected: ${this.selectedEntries.size}`
            );
          } else {
            this.selectedEntries.delete(entry.id);
            console.log(
              `Removed entry ${entry.id} from selection. Total selected: ${this.selectedEntries.size}`
            );
          }
          console.log(
            `Current selected IDs:`,
            Array.from(this.selectedEntries)
          );
          this.updateSelectionUI();
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => this.deleteEntry(entry.id));
      }

      // images button
      const imagesBtn = document.getElementById(`images-${entry.id}`);
      if (imagesBtn) {
        imagesBtn.addEventListener("click", () => this.showImagesModal(entry));
      }
    });
  }

  renderEntry(entry) {
    const domain = new URL(entry.url).hostname;
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const isSelected = this.selectedEntries.has(entry.id);
    const textSize = this.formatBytes(entry.fullText.length);

    return `
            <div class="entry-item ${isSelected ? "selected" : ""}">
                <div class="entry-header">
                    <input type="checkbox" id="checkbox-${
                      entry.id
                    }" class="entry-checkbox" ${isSelected ? "checked" : ""}>
                    <div class="entry-title">${this.escapeHtml(
                      entry.title
                    )}</div>
                    <button id="delete-${
                      entry.id
                    }" class="entry-delete" title="Delete entry">×</button>
                </div>
                <div class="entry-meta">
                    <span class="entry-domain">${domain}</span>
                    <span class="entry-time">${timestamp}</span>
                </div>
                <div class="entry-preview">${this.escapeHtml(
                  entry.excerptText
                )}</div>
                <div class="entry-info">
                    <span class="entry-size">${textSize}</span>
                    ${entry.images && entry.images.length > 0
                      ? `<button id="images-${entry.id}" class="entry-images-btn" title="View ${entry.images.length} image(s)">📷 ${entry.images.length} image(s)</button>`
                      : ""}
                    ${
                      entry.trimmed
                        ? '<span class="entry-trimmed">Trimmed</span>'
                        : ""
                    }
                </div>
            </div>
        `;
  }

  updateSelectionUI() {
    document.getElementById(
      "selectedCount"
    ).textContent = `${this.selectedEntries.size} selected`;
    document.getElementById("mergeBtn").disabled =
      this.selectedEntries.size === 0;

    // update item style using compatible selector
    this.entries.forEach((entry) => {
      const checkbox = document.getElementById(`checkbox-${entry.id}`);
      if (checkbox) {
        const entryElement = checkbox.closest(".entry-item");
        if (entryElement) {
          entryElement.classList.toggle(
            "selected",
            this.selectedEntries.has(entry.id)
          );
        }
      }
    });
  }

  selectAll() {
    this.selectedEntries.clear();
    this.entries.forEach((entry) => this.selectedEntries.add(entry.id));
    this.updateUI();
  }

  deselectAll() {
    this.selectedEntries.clear();
    this.updateUI();
  }

  async mergeAndCopy() {
    if (this.selectedEntries.size === 0) {
      this.showMessage("No entries selected for merging.", "error");
      return;
    }

    console.log("🔄 Starting merge and copy process...");
    console.log("Selected entries IDs:", Array.from(this.selectedEntries));
    console.log("Total entries available:", this.entries.length);

    // get selected entries in order of time
    const selectedEntryList = this.entries
      .filter((entry) => this.selectedEntries.has(entry.id))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log("Entries to merge:", selectedEntryList.length);
    console.log(
      "Selected entry titles:",
      selectedEntryList.map((e) => e.title)
    );

    // create combined text AND html with embedded images
    let mergedText = "";
    let mergedHtml = "";
    let totalImages = 0;

    selectedEntryList.forEach((entry, index) => {
      if (index > 0) mergedText += "\n\n";

      mergedText +=
        "=".repeat(14) + ` Page ${index + 1} ` + "=".repeat(14) + "\n";
      mergedHtml += `<h3>============== Page ${index + 1} ==============</h3>`;

      // add titles and stuff based on settings
      if (this.settings.includeTitle) {
        mergedText += `Title: ${entry.title}\n`;
        mergedHtml += `<p><b>Title:</b> ${this.escapeHtml(entry.title)}</p>`;
      }
      if (this.settings.includeURL) {
        mergedText += `URL: ${entry.url}\n`;
        mergedHtml += `<p><b>URL:</b> ${this.escapeHtml(entry.url)}</p>`;
      }
      if (this.settings.includeTime) {
        mergedText += `Time: ${new Date(entry.timestamp).toLocaleString()}\n`;
        mergedHtml += `<p><b>Time:</b> ${new Date(entry.timestamp).toLocaleString()}</p>`;
      }

      // add empty space if we added metadata
      if (
        this.settings.includeTitle ||
        this.settings.includeURL ||
        this.settings.includeTime
      ) {
        mergedText += "\n";
      }

      // build text with images replaced by actual <img> tags in HTML
      let entryText = entry.fullText;
      let entryHtml = this.escapeHtml(entry.fullText);

      // replace [IMAGE...] placeholders with actual base64 images in HTML
      if (entry.images && entry.images.length > 0) {
        for (const img of entry.images) {
          if (!img.dataUrl) continue;

          // find the placeholder in HTML that contains this image's src
          // match patterns like [IMAGE | src] or [IMAGE: alt | src]
          const escapedSrc = this.escapeHtml(img.src).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const imgRegex = new RegExp(
            `\\[IMAGE[^\\]]*\\|\\s*${escapedSrc}\\]`,
            'g'
          );

          const imgTag = `<br><img src="${img.dataUrl}" alt="${this.escapeHtml(img.alt || '')}" style="max-width:100%;"><br>`;
          entryHtml = entryHtml.replace(imgRegex, imgTag);
          totalImages++;
        }
      }

      // convert newlines to <br> for HTML
      entryHtml = entryHtml.replace(/\n/g, '<br>');

      mergedText += entryText;
      mergedHtml += `<div>${entryHtml}</div><hr>`;
    });

    console.log("Merged text length:", mergedText.length, "characters");
    console.log("Total images embedded:", totalImages);

    try {
      // try rich clipboard with HTML + images
      if (navigator.clipboard && navigator.clipboard.write && totalImages > 0) {
        console.log("🔥 Attempting rich clipboard with images...");
        const htmlBlob = new Blob([mergedHtml], { type: "text/html" });
        const textBlob = new Blob([mergedText], { type: "text/plain" });

        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);

        console.log("✅ Rich clipboard API succeeded!");
        this.showMessage(
          `Merged ${selectedEntryList.length} entries with ${totalImages} image(s) and copied to clipboard! 📷`,
          "success"
        );
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // no images, just copy text
        console.log("🔥 Attempting text-only clipboard...");
        await navigator.clipboard.writeText(mergedText);
        console.log("✅ Text clipboard succeeded!");
        this.showMessage(
          `Merged ${selectedEntryList.length} entries and copied to clipboard!`,
          "success"
        );
      } else {
        throw new Error("Modern clipboard API not available");
      }
    } catch (error) {
      console.log("❌ Modern clipboard failed:", error.message);

      // backup copy method
      try {
        if (document.execCommand) {
          console.log("🔄 Attempting fallback clipboard method...");
          this.fallbackCopyToClipboard(mergedText);
          console.log("✅ Fallback clipboard method succeeded!");
          this.showMessage(
            `Merged ${selectedEntryList.length} entries and copied to clipboard (text only)!`,
            "success"
          );
        } else {
          throw new Error("ExecCommand not available");
        }
      } catch (fallbackError) {
        console.error("❌ Both clipboard methods failed");
        this.showMessage(
          "Clipboard failed - showing manual copy dialog",
          "info"
        );
        this.showManualCopyModal(mergedText, selectedEntryList.length);
      }
    }
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.width = "1px";
    textArea.style.height = "1px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);

    try {
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999); // specifically for mobile devices

      const successful = document.execCommand("copy");
      if (!successful) {
        throw new Error("execCommand copy returned false");
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
      throw err;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  async deleteEntry(entryId) {
    if (confirm("Delete this entry?")) {
      try {
        const response = await this.sendMessage({
          action: "deleteEntry",
          entryId,
        });

        if (response.success) {
          this.entries = this.entries.filter((entry) => entry.id !== entryId);
          this.selectedEntries.delete(entryId);
          this.updateUI();
          this.showMessage("Entry deleted.", "success");
        } else {
          this.showMessage(
            "Failed to delete entry: " + response.error,
            "error"
          );
        }
      } catch (error) {
        this.showMessage("Error deleting entry: " + error.message, "error");
      }
    }
  }

  async clearAll() {
    if (confirm("Delete all entries? This cannot be undone.")) {
      try {
        const response = await this.sendMessage({ action: "clearAllEntries" });

        if (response.success) {
          this.entries = [];
          this.selectedEntries.clear();
          this.updateUI();
          this.showMessage("All entries cleared.", "success");
        } else {
          this.showMessage(
            "Failed to clear entries: " + response.error,
            "error"
          );
        }
      } catch (error) {
        this.showMessage("Error clearing entries: " + error.message, "error");
      }
    }
  }

  exportData() {
    try {
      const data = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        capturing: this.capturing,
        entries: this.entries,
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `webtoolkit-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      link.click();

      URL.revokeObjectURL(url);
      this.showMessage("Data exported successfully!", "success");
    } catch (error) {
      this.showMessage("Export failed: " + error.message, "error");
    }
  }

  triggerImport() {
    document.getElementById("importFile").click();
  }

  async importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error("Invalid file format");
      }

      if (
        confirm(
          `Import ${data.entries.length} entries? This will replace current entries.`
        )
      ) {
        // save to local storage
        await chrome.storage.local.set({ entries: data.entries });

        this.entries = data.entries;
        this.selectedEntries.clear();
        this.updateUI();
        this.showMessage(
          `Imported ${data.entries.length} entries successfully!`,
          "success"
        );
      }
    } catch (error) {
      this.showMessage("Import failed: " + error.message, "error");
    }

    // reset the file input
    event.target.value = "";
  }

  showMessage(text, type = "info") {
    const messageArea = document.getElementById("messageArea");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;

    messageArea.appendChild(messageDiv);

    // remove message after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // test copy to clipboard for debugging
  async testClipboard() {
    if (this.selectedEntries.size === 0) {
      this.showMessage(
        "Please select some entries first, then use 'Merge + Copy' button instead of Test Copy.",
        "error"
      );
      return;
    }

    // redirect to the real merge function
    await this.mergeAndCopy();
  }

  // show debugging info
  async showDebugInfo() {
    try {
      // get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // get info from storage
      const storageData = await chrome.storage.local.get([
        "capturing",
        "entries",
      ]);

      const debugInfo = `
=== WebToolKit Debug Info ===

Current Time: ${new Date().toISOString()}

Extension State:
- Capturing: ${this.capturing}
- Storage Capturing: ${storageData.capturing}
- Entries Count: ${this.entries.length}
- Storage Entries: ${storageData.entries?.length || 0}

Active Tab:
- URL: ${tab?.url || "No tab"}
- Title: ${tab?.title || "No title"}
- ID: ${tab?.id || "No ID"}

Valid for Auto-Capture:
- Has Tab: ${!!tab}
- Valid URL: ${
        tab?.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("edge://") &&
        !tab.url.startsWith("extension://") &&
        !tab.url.startsWith("chrome-extension://")
      }

Background Service Worker:
- Check console at edge://extensions/ → WebToolKit Details → Inspect views: background page

Manual Test Auto-Capture:
1. Check background console logs
2. Navigate to new page (wikipedia, github)
3. Wait 2-3 seconds
4. Check for auto-capture logs

Console Commands:
// run this in background console
chrome.storage.local.get(['capturing', 'entries'], console.log)
      `;

      this.showManualCopyModal(debugInfo, 0, "Debug Information");
    } catch (error) {
      this.showMessage("Error getting debug info: " + error.message, "error");
    }
  }

  // Show settings modal
  async showSettings() {
    // Remove existing modal if any
    const existing = document.getElementById("settingsModal");
    if (existing) {
      existing.remove();
    }

    // Create modal
    const modal = document.createElement("div");
    modal.id = "settingsModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    modalContent.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">Copy Format Settings</h3>
      <p style="color: #666; margin-bottom: 20px;">
        Choose what metadata to include when copying entries:
      </p>
      
      <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="includeTitle" ${
            this.settings.includeTitle ? "checked" : ""
          } 
                 style="margin-right: 8px;">
          <span>Include Title</span>
        </label>
        <small style="color: #666; margin-left: 24px; display: block;">
          Example: "Title: Quiz Modul 1 (page 1 of 10) | Test"
        </small>
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="includeURL" ${
            this.settings.includeURL ? "checked" : ""
          } 
                 style="margin-right: 8px;">
          <span>Include URL</span>
        </label>
        <small style="color: #666; margin-left: 24px; display: block;">
          Example: "URL: https://lms.ac.id/..."
        </small>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="includeTime" ${
            this.settings.includeTime ? "checked" : ""
          } 
                 style="margin-right: 8px;">
          <span>Include Time</span>
        </label>
        <small style="color: #666; margin-left: 24px; display: block;">
          Example: "Time: 07/10/2025, 17.33.33"
        </small>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button 
          id="cancelSettingsBtn" 
          style="padding: 8px 16px; border: 1px solid #6c757d; 
                 background: #6c757d; color: white; border-radius: 4px; cursor: pointer;"
        >
          Cancel
        </button>
        <button 
          id="saveSettingsBtn" 
          style="padding: 8px 16px; border: 1px solid #28a745; 
                 background: #28a745; color: white; border-radius: 4px; cursor: pointer;"
        >
          Save Settings
        </button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Event listeners
    document
      .getElementById("saveSettingsBtn")
      .addEventListener("click", async () => {
        const includeTitle = document.getElementById("includeTitle").checked;
        const includeURL = document.getElementById("includeURL").checked;
        const includeTime = document.getElementById("includeTime").checked;

        this.settings = {
          includeTitle,
          includeURL,
          includeTime,
        };

        // Save settings to storage
        try {
          const response = await this.sendMessage({
            action: "saveSettings",
            settings: this.settings,
          });

          if (response.success) {
            this.showMessage("Settings saved successfully!", "success");
          } else {
            this.showMessage(
              "Failed to save settings: " + response.error,
              "error"
            );
          }
        } catch (error) {
          this.showMessage("Error saving settings: " + error.message, "error");
        }

        modal.remove();
      });

    document
      .getElementById("cancelSettingsBtn")
      .addEventListener("click", () => {
        modal.remove();
      });

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Show modal for manual copy when clipboard fails
  showManualCopyModal(text, entryCount, customTitle = null) {
    // Remove existing modal if any
    const existing = document.getElementById("manualCopyModal");
    if (existing) {
      existing.remove();
    }

    // Create modal
    const modal = document.createElement("div");
    modal.id = "manualCopyModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 80%;
      overflow: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    const title = customTitle || "Manual Copy Required";
    const subtitle = customTitle
      ? "Debug information for troubleshooting:"
      : `Clipboard access failed. Please copy the text below manually:`;

    modalContent.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">${title}</h3>
      <p style="color: #666; margin-bottom: 15px;">
        ${subtitle}
      </p>
      <p style="color: #28a745; font-weight: bold; margin-bottom: 10px;">
        ✅ ${entryCount} entries merged successfully
      </p>
      <textarea 
        id="manualCopyText" 
        readonly 
        style="width: 100%; height: 300px; font-family: monospace; font-size: 12px; 
               border: 1px solid #ccc; padding: 10px; border-radius: 4px; 
               resize: vertical; margin-bottom: 15px;"
      >${text}</textarea>
      <div style="text-align: right;">
        <button 
          id="selectAllBtn" 
          style="padding: 8px 16px; margin-right: 10px; border: 1px solid #007bff; 
                 background: #007bff; color: white; border-radius: 4px; cursor: pointer;"
        >
          Select All
        </button>
        <button 
          id="downloadBtn" 
          style="padding: 8px 16px; margin-right: 10px; border: 1px solid #6c757d; 
                 background: #6c757d; color: white; border-radius: 4px; cursor: pointer;"
        >
          Download
        </button>
        <button 
          id="closeModalBtn" 
          style="padding: 8px 16px; border: 1px solid #dc3545; 
                 background: #dc3545; color: white; border-radius: 4px; cursor: pointer;"
        >
          Close
        </button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Event listeners
    document.getElementById("selectAllBtn").addEventListener("click", () => {
      const textarea = document.getElementById("manualCopyText");
      textarea.select();
      textarea.setSelectionRange(0, 99999);

      // Try one more time to copy
      try {
        document.execCommand("copy");
        this.showMessage("Text selected and copied!", "success");
      } catch (e) {
        this.showMessage("Text selected. Press Ctrl+C to copy.", "info");
      }
    });

    document.getElementById("downloadBtn").addEventListener("click", () => {
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webtoolkit-merge-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.showMessage("Content downloaded as text file!", "success");
    });

    document.getElementById("closeModalBtn").addEventListener("click", () => {
      modal.remove();
    });

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Auto-select text for easy copying
    setTimeout(() => {
      const textarea = document.getElementById("manualCopyText");
      textarea.focus();
      textarea.select();
    }, 100);
  }

  // Show modal with captured images for preview and download
  showImagesModal(entry) {
    // Remove existing modal
    const existing = document.getElementById("imagesModal");
    if (existing) existing.remove();

    const images = entry.images || [];
    if (images.length === 0) {
      this.showMessage("No images found in this entry.", "info");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "imagesModal";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: white; padding: 16px; border-radius: 8px;
      max-width: 95%; max-height: 90%; overflow-y: auto;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    `;

    // header
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #333;">📷 Captured Images (${images.length})</h3>
        <div>
          <button id="downloadAllImagesBtn" style="
            padding: 6px 14px; background: #28a745; color: white;
            border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;
            font-size: 12px;
          ">⬇️ Download All</button>
          <button id="closeImagesBtn" style="
            padding: 6px 14px; background: #dc3545; color: white;
            border: none; border-radius: 4px; cursor: pointer; font-size: 12px;
          ">Close</button>
        </div>
      </div>
      <p style="color: #666; font-size: 12px; margin-bottom: 12px;">
        Right-click an image to copy it, or use download buttons below each image.
      </p>
    `;

    // images grid
    images.forEach((img, index) => {
      const filename = img.alt || `image-${index + 1}`;
      html += `
        <div style="border: 1px solid #ddd; border-radius: 6px; padding: 10px; margin-bottom: 10px; background: #fafafa;">
          <img src="${img.dataUrl}" alt="${this.escapeHtml(img.alt || "")}"
               style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; cursor: pointer;"
               title="Right-click to copy image">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span style="font-size: 11px; color: #888;">${this.escapeHtml(filename)} • ${this.formatBytes(img.size)}</span>
            <button class="download-single-img" data-index="${index}" style="
              padding: 4px 10px; background: #007bff; color: white;
              border: none; border-radius: 3px; cursor: pointer; font-size: 11px;
            ">⬇️ Download PNG</button>
          </div>
        </div>
      `;
    });

    modalContent.innerHTML = html;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // close button
    document.getElementById("closeImagesBtn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    // download all
    document.getElementById("downloadAllImagesBtn").addEventListener("click", () => {
      images.forEach((img, index) => {
        this.downloadImage(img, index);
      });
      this.showMessage(`Downloading ${images.length} image(s)...`, "success");
    });

    // individual download buttons
    modalContent.querySelectorAll(".download-single-img").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        this.downloadImage(images[idx], idx);
      });
    });
  }

  // Download a single image as PNG file
  downloadImage(img, index) {
    const link = document.createElement("a");
    link.href = img.dataUrl;
    const filename = img.alt
      ? img.alt.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50)
      : `question-image-${index + 1}`;
    link.download = `${filename}.png`;
    link.click();
  }

  // Show AI Settings modal
  async showAISettings() {
    const existing = document.getElementById("aiSettingsModal");
    if (existing) existing.remove();

    const settingsResp = await this.sendMessage({ action: "getAISettings" });
    const modelsResp = await this.sendMessage({ action: "getAIModels" });

    const s = settingsResp?.aiSettings || {
      provider: "auto", apiKey: "", model: "", customEndpoint: "",
      delayMin: 1000, delayMax: 3000, autoNextPage: false,
    };
    const allModels = modelsResp?.models || {};
    const providers = modelsResp?.providers || [];

    const modal = document.createElement("div");
    modal.id = "aiSettingsModal";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `;

    const mc = document.createElement("div");
    mc.style.cssText = `
      background: white; padding: 18px; border-radius: 8px;
      max-width: 420px; width: 95%; max-height: 90%; overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    const buildModelOptions = (provider) => {
      const models = allModels[provider] || [{ id: "default", name: "Default" }];
      return models.map(m =>
        `<option value="${m.id}" ${s.model === m.id ? "selected" : ""}>${m.name}</option>`
      ).join("");
    };

    const providerOptions = providers.map(p =>
      `<option value="${p.id}" ${s.provider === p.id ? "selected" : ""}>${p.name}</option>`
    ).join("");

    const sliderStyle = `
      -webkit-appearance: none; width: 100%; height: 6px;
      background: #ddd; border-radius: 3px; outline: none;
      cursor: pointer;
    `;

    mc.innerHTML = `
      <h3 style="margin-top:0; color:#333;">🤖 AI Auto-Answer Settings</h3>

      <div style="margin-bottom:12px;">
        <label style="font-size:11px; font-weight:600; color:#555;">API Key</label>
        <input type="password" id="aiApiKey" value="${this.escapeHtml(s.apiKey)}"
               placeholder="Paste API key — provider auto-detected..."
               style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px; box-sizing:border-box;">
        <div id="aiDetectedProvider" style="margin-top:4px; font-size:10px; color:#28a745;"></div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:11px; font-weight:600; color:#555;">Provider</label>
        <select id="aiProvider" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
          <option value="auto" ${!s.provider || s.provider === "auto" ? "selected" : ""}>🔍 Auto-detect from API key</option>
          ${providerOptions}
          <option value="custom" ${s.provider === "custom" ? "selected" : ""}>Custom (OpenAI-compatible)</option>
        </select>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:11px; font-weight:600; color:#555;">Model</label>
        <select id="aiModel" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
          ${buildModelOptions(s.provider === "auto" ? "gemini" : s.provider)}
        </select>
      </div>

      <div id="customEndpointDiv" style="margin-bottom:12px; ${s.provider === "custom" ? "" : "display:none;"}">
        <label style="font-size:11px; font-weight:600; color:#555;">Custom Endpoint URL</label>
        <input type="text" id="aiCustomEndpoint" value="${this.escapeHtml(s.customEndpoint)}"
               placeholder="https://api.example.com/v1"
               style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px; box-sizing:border-box;">
      </div>

      <div style="margin-bottom:8px;">
        <label style="font-size:11px; font-weight:600; color:#555;">Delay Min: <span id="delayMinLabel">${(s.delayMin / 1000).toFixed(1)}s</span></label>
        <input type="range" id="aiDelayMin" min="0" max="10000" step="100" value="${s.delayMin}"
               style="${sliderStyle}">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:11px; font-weight:600; color:#555;">Delay Max: <span id="delayMaxLabel">${(s.delayMax / 1000).toFixed(1)}s</span></label>
        <input type="range" id="aiDelayMax" min="0" max="10000" step="100" value="${s.delayMax}"
               style="${sliderStyle}">
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:flex; align-items:center; cursor:pointer; font-size:12px;">
          <input type="checkbox" id="aiAutoNextPage" ${s.autoNextPage ? "checked" : ""}
                 style="margin-right:8px;">
          <span>Auto navigate to next page</span>
        </label>
        <small style="color:#888; margin-left:24px; display:block;">Auto-click 'Next page' after answering</small>
      </div>

      <div style="display:flex; gap:8px; justify-content:space-between;">
        <button id="aiTestBtn" style="padding:6px 14px; background:#17a2b8; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
          🔌 Test API
        </button>
        <div style="display:flex; gap:8px;">
          <button id="aiCancelBtn" style="padding:6px 14px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">Cancel</button>
          <button id="aiSaveBtn" style="padding:6px 14px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">💾 Save</button>
        </div>
      </div>
      <div id="aiTestResult" style="margin-top:10px; font-size:11px;"></div>
    `;

    modal.appendChild(mc);
    document.body.appendChild(modal);

    // === slider labels live update ===
    document.getElementById("aiDelayMin").addEventListener("input", (e) => {
      document.getElementById("delayMinLabel").textContent = (e.target.value / 1000).toFixed(1) + "s";
      // enforce min <= max
      const maxSlider = document.getElementById("aiDelayMax");
      if (parseInt(e.target.value) > parseInt(maxSlider.value)) {
        maxSlider.value = e.target.value;
        document.getElementById("delayMaxLabel").textContent = (e.target.value / 1000).toFixed(1) + "s";
      }
    });
    document.getElementById("aiDelayMax").addEventListener("input", (e) => {
      document.getElementById("delayMaxLabel").textContent = (e.target.value / 1000).toFixed(1) + "s";
      const minSlider = document.getElementById("aiDelayMin");
      if (parseInt(e.target.value) < parseInt(minSlider.value)) {
        minSlider.value = e.target.value;
        document.getElementById("delayMinLabel").textContent = (e.target.value / 1000).toFixed(1) + "s";
      }
    });

    // === API key auto-detect ===
    const detectFromKey = () => {
      const key = document.getElementById("aiApiKey").value;
      const detectDiv = document.getElementById("aiDetectedProvider");
      const providerSelect = document.getElementById("aiProvider");

      if (!key) {
        detectDiv.innerHTML = "";
        return;
      }

      // simple client-side detection by key prefix
      let detected = null;
      if (key.startsWith("AIza")) detected = { id: "gemini", name: "Google Gemini" };
      else if (key.startsWith("gsk_")) detected = { id: "groq", name: "Groq" };
      else if (key.startsWith("sk-")) detected = { id: "openai", name: "OpenAI / DeepSeek" };

      if (detected) {
        detectDiv.innerHTML = `<span style="color:#28a745;">🔍 Detected: <b>${detected.name}</b></span>`;
        // auto-update provider select and models if on auto
        if (providerSelect.value === "auto") {
          const modelSelect = document.getElementById("aiModel");
          const models = allModels[detected.id] || [{ id: "default", name: "Default" }];
          modelSelect.innerHTML = models.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
        }
      } else {
        detectDiv.innerHTML = `<span style="color:#ffc107;">⚠️ Unknown key format — set provider manually</span>`;
      }
    };

    document.getElementById("aiApiKey").addEventListener("input", detectFromKey);
    detectFromKey(); // run once on load

    // === provider change ===
    document.getElementById("aiProvider").addEventListener("change", (e) => {
      const provider = e.target.value;
      const modelSelect = document.getElementById("aiModel");
      if (provider === "auto") {
        detectFromKey(); // re-detect from key
      } else {
        const models = allModels[provider] || [{ id: "default", name: "Default" }];
        modelSelect.innerHTML = models.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
      }
      document.getElementById("customEndpointDiv").style.display = provider === "custom" ? "" : "none";
    });

    // === test button ===
    document.getElementById("aiTestBtn").addEventListener("click", async () => {
      const resultDiv = document.getElementById("aiTestResult");
      resultDiv.innerHTML = `<span style="color:#17a2b8;">⏳ Testing connection...</span>`;

      const testSettings = {
        provider: document.getElementById("aiProvider").value,
        apiKey: document.getElementById("aiApiKey").value,
        customEndpoint: document.getElementById("aiCustomEndpoint").value,
      };

      const result = await this.sendMessage({ action: "testAI", aiSettings: testSettings });
      if (result && result.success) {
        resultDiv.innerHTML = `<span style="color:#28a745;">✅ ${result.message || "Connection valid!"}</span>`;
      } else {
        resultDiv.innerHTML = `<span style="color:#dc3545;">❌ ${result?.error || "Connection failed"}</span>`;
      }
    });

    // === save button ===
    document.getElementById("aiSaveBtn").addEventListener("click", async () => {
      const aiSettings = {
        provider: document.getElementById("aiProvider").value,
        apiKey: document.getElementById("aiApiKey").value,
        model: document.getElementById("aiModel").value,
        customEndpoint: document.getElementById("aiCustomEndpoint").value,
        delayMin: parseInt(document.getElementById("aiDelayMin").value) || 1000,
        delayMax: parseInt(document.getElementById("aiDelayMax").value) || 3000,
        autoNextPage: document.getElementById("aiAutoNextPage").checked,
      };

      const result = await this.sendMessage({ action: "saveAISettings", aiSettings });
      if (result && result.success) {
        this.showMessage("AI settings saved! ✅", "success");
        modal.remove();
      } else {
        this.showMessage("Failed to save: " + (result?.error || "unknown"), "error");
      }
    });

    // cancel + close
    document.getElementById("aiCancelBtn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  }

  // Trigger AI auto-answer
  async aiAutoAnswer() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        this.showMessage("No active tab found.", "error");
        return;
      }

      this.showMessage("🤖 AI Auto-Answer starting... Please wait.", "info");

      const response = await this.sendMessage({
        action: "aiAutoAnswer",
        tabId: tab.id,
      });

      if (response && response.success) {
        // show results modal
        let resultsHtml = `<h3 style="margin-top:0; color:#333;">🤖 Auto-Answer Results</h3>`;
        resultsHtml += `<p style="color:#28a745; font-weight:bold;">✅ ${response.answeredCount}/${response.totalQuestions} questions answered</p>`;

        if (response.skippedCount > 0) {
          resultsHtml += `<p style="color:#ffc107;">⚠️ ${response.skippedCount} skipped</p>`;
        }

        if (response.results && response.results.length > 0) {
          resultsHtml += `<div style="max-height:200px; overflow-y:auto; border:1px solid #ddd; border-radius:4px; padding:8px; margin-top:10px;">`;
          response.results.forEach((r, i) => {
            const icon = r.status === "answered" || r.status === "answered (retry)" ? "✅" :
                         r.status === "skipped" ? "⏭️" : "❌";
            const color = r.status.includes("answered") ? "#28a745" : r.status === "skipped" ? "#ffc107" : "#dc3545";
            resultsHtml += `
              <div style="font-size:11px; margin-bottom:6px; padding:4px; border-bottom:1px solid #eee;">
                <span style="color:${color}; font-weight:bold;">${icon} Q${i + 1}</span>
                ${r.answer ? `<span style="background:#e91e63; color:white; padding:1px 6px; border-radius:3px; font-size:10px; margin-left:4px;">${r.answer}</span>` : ""}
                <span style="color:#666;"> ${r.question}...</span>
                ${r.explanation ? `<br><small style="color:#888; margin-left:20px;">${r.explanation}</small>` : ""}
                ${r.reason ? `<br><small style="color:#dc3545; margin-left:20px;">${r.reason}</small>` : ""}
              </div>`;
          });
          resultsHtml += `</div>`;
        }

        this.showManualCopyModal("", 0, "Auto-Answer Results");
        // replace the manual copy modal content
        const existingModal = document.getElementById("manualCopyModal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.id = "aiResultsModal";
        modal.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.7); z-index: 10000;
          display: flex; align-items: center; justify-content: center;
        `;
        const mc = document.createElement("div");
        mc.style.cssText = `
          background: white; padding: 18px; border-radius: 8px;
          max-width: 400px; width: 95%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        mc.innerHTML = resultsHtml + `
          <div style="text-align:right; margin-top:12px;">
            <button id="closeAiResultsBtn" style="padding:6px 14px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">Close</button>
          </div>`;
        modal.appendChild(mc);
        document.body.appendChild(modal);

        document.getElementById("closeAiResultsBtn").addEventListener("click", () => modal.remove());
        modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

        this.showMessage(
          `🤖 Auto-answered ${response.answeredCount}/${response.totalQuestions} question(s)!`,
          "success"
        );
      } else {
        this.showMessage(`❌ ${response?.error || "Auto-answer failed"}`, "error");
      }
    } catch (error) {
      console.error("❌ AI auto-answer error:", error);
      this.showMessage("❌ Error: " + error.message, "error");
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new WebToolKit();
});
