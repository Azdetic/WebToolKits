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

    // create combined text
    let mergedText = "";
    selectedEntryList.forEach((entry, index) => {
      if (index > 0) mergedText += "\n\n";

      mergedText +=
        "=".repeat(14) + ` Page ${index + 1} ` + "=".repeat(14) + "\n";

      // add titles and stuff based on settings
      if (this.settings.includeTitle) {
        mergedText += `Title: ${entry.title}\n`;
      }
      if (this.settings.includeURL) {
        mergedText += `URL: ${entry.url}\n`;
      }
      if (this.settings.includeTime) {
        mergedText += `Time: ${new Date(entry.timestamp).toLocaleString()}\n`;
      }

      // add empty space if we added metadata
      if (
        this.settings.includeTitle ||
        this.settings.includeURL ||
        this.settings.includeTime
      ) {
        mergedText += "\n";
      }

      mergedText += entry.fullText;
    });

    console.log("Merged text length:", mergedText.length, "characters");

    // check if we can copy to clipboard
    const hasModernClipboard = !!(
      navigator.clipboard && navigator.clipboard.writeText
    );
    const hasExecCommand = !!document.execCommand;

    console.log("Clipboard API available:", hasModernClipboard);
    console.log("ExecCommand available:", hasExecCommand);
    console.log("User agent:", navigator.userAgent);
    console.log("Protocol:", window.location.protocol);

    try {
      // try new clipboard api first
      if (hasModernClipboard) {
        console.log("🔥 Attempting modern clipboard API...");
        await navigator.clipboard.writeText(mergedText);
        console.log("✅ Modern clipboard API succeeded!");
        this.showMessage(
          `Merged ${selectedEntryList.length} entries and copied to clipboard!`,
          "success"
        );
      } else {
        throw new Error("Modern clipboard API not available");
      }
    } catch (error) {
      console.log("❌ Modern clipboard failed:", error.message);
      console.log("Full error:", error);

      // backup copy method for older browsers
      try {
        if (hasExecCommand) {
          console.log("🔄 Attempting fallback clipboard method...");
          this.fallbackCopyToClipboard(mergedText);
          console.log("✅ Fallback clipboard method succeeded!");
          this.showMessage(
            `Merged ${selectedEntryList.length} entries and copied to clipboard (fallback)!`,
            "success"
          );
        } else {
          throw new Error("ExecCommand not available");
        }
      } catch (fallbackError) {
        console.error("❌ Both clipboard methods failed:");
        console.error("Modern API error:", error);
        console.error("Fallback error:", fallbackError);

        // show manual copy dialog if all fails
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
          Example: "Title: Quiz Modul 1 (page 1 of 10) | CeLOE LMS"
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
          Example: "URL: https://lms.telkomuniversity.ac.id/..."
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
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new WebToolKit();
});
