// background service worker for webtoolkit
// handles popup and content script comms
// handles storage for captured entries

// setup storage when extension starts
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(["capturing", "entries"]);
  if (result.capturing === undefined) {
    await chrome.storage.local.set({ capturing: false });
  }
  if (!result.entries) {
    await chrome.storage.local.set({ entries: [] });
  }
});

// setup on install
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    capturing: false,
    entries: [],
  });
});

// auto capture listents to tab updates when active
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log(
    "🔄 Tab event - ID:",
    tabId,
    "ChangeInfo:",
    changeInfo,
    "Tab URL:",
    tab?.url
  );

  // wait until page fully loads
  if (changeInfo.status !== "complete") {
    console.log("⏭️ Skipping - page not complete, status:", changeInfo.status);
    return;
  }

  // need a valid tab with url
  if (!tab || !tab.url) {
    console.log("⏭️ Skipping - no tab or URL");
    return;
  }

  console.log("🔄 Processing tab update for:", tab.url);

  try {
    // check if capture mode is on
    const result = await chrome.storage.local.get("capturing");
    const isCapturing = result.capturing || false;

    console.log("📸 Auto-capture enabled:", isCapturing);

    if (!isCapturing) {
      console.log("⏭️ Skipping - capturing not active");
      return;
    }

    // check if url is valid for content scripts
    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("extension://") ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("moz-extension://") ||
      tab.url.startsWith("file://")
    ) {
      console.log("⏭️ Skipping auto-capture for restricted URL:", tab.url);
      return;
    }

    console.log("🚀 Starting auto-capture for:", tab.url);

    // wait a bit so page is fully loaded
    setTimeout(() => {
      console.log("⏰ Auto-capture timeout triggered for:", tab.url);
      handleCaptureContent(tab, (response) => {
        if (response.success) {
          console.log("✅ Auto-capture successful for:", tab.url);
        } else {
          console.log("❌ Auto-capture failed for:", tab.url, response.error);
        }
      });
    }, 2000); // wait 2 seconds
  } catch (error) {
    console.error("❌ Auto-capture error:", error);
  }
});

// handles messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Background received message:", message.action, message);

  switch (message.action) {
    case "getCaptureStatus":
      console.log("🔍 Handling getCaptureStatus");
      handleGetCaptureStatus(sendResponse);
      return true; // keep channel open for async

    case "setCaptureStatus":
      console.log("🔧 Handling setCaptureStatus:", message.capturing);
      handleSetCaptureStatus(message.capturing, sendResponse);
      return true;

    case "captureContent":
      console.log("📸 Handling captureContent, sender:", sender);
      // get active tab manually for popup calls
      if (!sender.tab) {
        console.log("🔍 No sender.tab, getting active tab manually...");
        handleCaptureContentFromPopup(sendResponse);
      } else {
        handleCaptureContent(sender.tab, sendResponse);
      }
      return true;

    case "saveEntry":
      console.log("💾 Handling saveEntry");
      handleSaveEntry(message.entry, sendResponse);
      return true;

    case "getEntries":
      console.log("📋 Handling getEntries");
      handleGetEntries(sendResponse);
      return true;

    case "deleteEntry":
      console.log("🗑️ Handling deleteEntry:", message.entryId);
      handleDeleteEntry(message.entryId, sendResponse);
      return true;

    case "clearAllEntries":
      handleClearAllEntries(sendResponse);
      return true;

    case "getSettings":
      console.log("⚙️ Handling getSettings");
      handleGetSettings(sendResponse);
      return true;

    case "saveSettings":
      console.log("⚙️ Handling saveSettings:", message.settings);
      handleSaveSettings(message.settings, sendResponse);
      return true;

    case "answerGForm":
      console.log("📝 Handling answerGForm");
      handleAnswerGForm(message.tabId, sendResponse);
      return true;
  }
});

// get capture status
async function handleGetCaptureStatus(sendResponse) {
  console.log("🔍 Getting capture status from storage...");
  try {
    const result = await chrome.storage.local.get("capturing");
    console.log("✅ Capture status retrieved:", result.capturing);
    sendResponse({ success: true, capturing: result.capturing || false });
  } catch (error) {
    console.error("❌ Error getting capture status:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// set capture status
async function handleSetCaptureStatus(capturing, sendResponse) {
  console.log("🔧 Setting capture status to:", capturing);
  try {
    await chrome.storage.local.set({ capturing });
    console.log("✅ Capture status saved successfully");
    sendResponse({ success: true });
  } catch (error) {
    console.error("❌ Error setting capture status:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// capture content from tab
async function handleCaptureContent(tab, sendResponse) {
  console.log("📸 Starting capture for tab:", tab);
  try {
    // check if capturing is turned on
    console.log("🔍 Checking if capturing is enabled...");
    const result = await chrome.storage.local.get("capturing");
    console.log("📋 Capturing status:", result.capturing);

    if (!result.capturing) {
      console.log("❌ Capturing is not enabled");
      sendResponse({ success: false, error: "Capturing is not enabled" });
      return;
    }

    console.log("📡 Sending message to content script on tab:", tab.id);

    // send message to content script instead of injecting it
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "capturePageContent",
      });

      console.log("📡 Content script response:", response);

      if (response && response.success && response.content) {
        const capturedData = response.content;
        console.log(
          "✅ Content captured, text length:",
          capturedData.text.length
        );

        // download images as base64
        let images = [];
        if (capturedData.images && capturedData.images.length > 0) {
          console.log(`📷 Downloading ${capturedData.images.length} images...`);
          images = await downloadImagesAsBase64(capturedData.images);
          console.log(`📷 Successfully downloaded ${images.length} images`);
        }

        // create entry object
        const entry = {
          id: Date.now().toString(),
          url: tab.url,
          title: tab.title || "Untitled Page",
          excerptText: capturedData.text.substring(0, 200),
          fullText: capturedData.text.substring(0, 100000), // keep under 100kb
          htmlOptional: capturedData.html
            ? capturedData.html.substring(0, 100000)
            : null,
          images: images,
          timestamp: new Date().toISOString(),
          trimmed:
            capturedData.text.length > 100000 ||
            (capturedData.html && capturedData.html.length > 100000),
        };

        console.log("💾 Saving entry:", entry);
        // save this entry
        await saveEntryToStorage(entry);
        console.log("✅ Entry saved successfully");
        sendResponse({ success: true, entry });
      } else {
        console.log("❌ No response from content script");
        sendResponse({ success: false, error: "Failed to capture content" });
      }
    } catch (contentScriptError) {
      console.log(
        "❌ Content script failed, trying fallback injection:",
        contentScriptError
      );

      // use function injection if content script breaks
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: captureMainContent,
        });

        if (results && results[0] && results[0].result) {
          const capturedData = results[0].result;
          console.log(
            "✅ Fallback capture successful, text length:",
            capturedData.text.length
          );

          const entry = {
            id: Date.now().toString(),
            url: tab.url,
            title: tab.title || "Untitled Page",
            excerptText: capturedData.text.substring(0, 200),
            fullText: capturedData.text.substring(0, 100000),
            htmlOptional: capturedData.html
              ? capturedData.html.substring(0, 100000)
              : null,
            timestamp: new Date().toISOString(),
            trimmed:
              capturedData.text.length > 100000 ||
              (capturedData.html && capturedData.html.length > 100000),
          };

          await saveEntryToStorage(entry);
          console.log("✅ Fallback entry saved successfully");
          sendResponse({ success: true, entry });
        } else {
          console.log("❌ Fallback injection also failed");
          sendResponse({
            success: false,
            error: "Both content script and injection failed",
          });
        }
      } catch (injectionError) {
        console.error("❌ Both capture methods failed:", injectionError);
        sendResponse({
          success: false,
          error: "Both capture methods failed: " + injectionError.message,
        });
      }
    }
  } catch (error) {
    console.error("❌ Capture error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// handle capture from popup
async function handleCaptureContentFromPopup(sendResponse) {
  console.log("📸 Handling capture from popup, getting active tab...");
  try {
    // find active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("🔍 Found tabs:", tabs);

    if (!tabs || tabs.length === 0) {
      console.log("❌ No active tab found");
      sendResponse({ success: false, error: "No active tab found" });
      return;
    }

    const tab = tabs[0];
    console.log("✅ Using active tab:", tab);

    // use normal capture function
    await handleCaptureContent(tab, sendResponse);
  } catch (error) {
    console.error("❌ Error getting active tab:", error);
    sendResponse({
      success: false,
      error: "Failed to get active tab: " + error.message,
    });
  }
}

// content capture function to inject
function captureMainContent() {
  // how to find main content
  const selectors = [
    "main",
    '[role="main"]',
    "#content",
    ".content",
    "#main",
    ".main",
    "article",
    ".article",
    "#post",
    ".post",
    ".entry-content",
    ".post-content",
    ".article-content",
  ];

  let mainElement = null;

  // try selectors one by one
  for (const selector of selectors) {
    mainElement = document.querySelector(selector);
    if (mainElement && mainElement.innerText.trim().length > 50) {
      break;
    }
  }

  // use body if main content is missing
  if (!mainElement || mainElement.innerText.trim().length < 50) {
    mainElement = document.body;
  }

  // get text and html
  const text = mainElement.innerText || mainElement.textContent || "";
  const html = mainElement.innerHTML || "";

  return {
    text: text.trim(),
    html: html.trim(),
  };
}

// save this entry to storage with limit handling
async function saveEntryToStorage(entry) {
  console.log("💾 Saving entry to storage:", entry.id);
  const result = await chrome.storage.local.get("entries");
  let entries = result.entries || [];
  console.log("📋 Current entries count:", entries.length);

  // add new entry
  entries.unshift(entry);

  // max 200 entries
  if (entries.length > 200) {
    entries = entries.slice(0, 200);
    console.log("✂️ Trimmed entries to 200 limit");
  }

  await chrome.storage.local.set({ entries });
  console.log("✅ Entry saved, total entries:", entries.length);
}

// download images from URLs and convert to base64 data URLs
async function downloadImagesAsBase64(imageInfos) {
  const results = [];
  const maxImages = 20; // limit to avoid storage issues

  for (let i = 0; i < Math.min(imageInfos.length, maxImages); i++) {
    const info = imageInfos[i];
    try {
      console.log(`📷 Downloading image ${i + 1}: ${info.src.substring(0, 80)}...`);

      const response = await fetch(info.src, {
        credentials: "include", // include cookies for authenticated images (LMS)
      });

      if (!response.ok) {
        console.log(`⚠️ Image fetch failed: ${response.status}`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "image/png";

      // skip non-image responses
      if (!contentType.startsWith("image/")) {
        console.log(`⚠️ Not an image: ${contentType}`);
        continue;
      }

      const blob = await response.blob();

      // skip tiny images (< 1KB likely icons)
      if (blob.size < 1024) {
        console.log(`⚠️ Image too small (${blob.size} bytes), skipping`);
        continue;
      }

      // convert blob to base64 data URL
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      results.push({
        src: info.src,
        alt: info.alt || "",
        dataUrl: dataUrl,
        size: blob.size,
        type: contentType,
      });

      console.log(`✅ Image ${i + 1} downloaded (${blob.size} bytes)`);
    } catch (error) {
      console.log(`❌ Failed to download image ${i + 1}:`, error.message);
    }
  }

  return results;
}

// resolve save entry message
async function handleSaveEntry(entry, sendResponse) {
  console.log("💾 Handling save entry request");
  try {
    await saveEntryToStorage(entry);
    console.log("✅ Save entry successful");
    sendResponse({ success: true });
  } catch (error) {
    console.error("❌ Save entry failed:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// fetch all entries
async function handleGetEntries(sendResponse) {
  console.log("📋 Getting all entries from storage...");
  try {
    const result = await chrome.storage.local.get("entries");
    const entries = result.entries || [];
    console.log("✅ Retrieved entries:", entries.length);
    sendResponse({ success: true, entries });
  } catch (error) {
    console.error("❌ Error getting entries:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// delete one entry
async function handleDeleteEntry(entryId, sendResponse) {
  try {
    const result = await chrome.storage.local.get("entries");
    let entries = result.entries || [];
    entries = entries.filter((entry) => entry.id !== entryId);
    await chrome.storage.local.set({ entries });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// delete all entries
async function handleClearAllEntries(sendResponse) {
  try {
    await chrome.storage.local.set({ entries: [] });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// get current settings
async function handleGetSettings(sendResponse) {
  try {
    const result = await chrome.storage.local.get("settings");
    const settings = result.settings || {
      includeTitle: true,
      includeURL: true,
      includeTime: true,
    };
    sendResponse({ success: true, settings });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// save new settings
async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.local.set({ settings });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// handle google form auto answer
async function handleAnswerGForm(tabId, sendResponse) {
  console.log("📝 Starting GForm auto-answer for tab:", tabId);
  try {
    // find target tab
    let targetTab;
    if (tabId) {
      targetTab = await chrome.tabs.get(tabId);
    } else {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: "No active tab found" });
        return;
      }
      targetTab = tabs[0];
    }

    console.log("📝 Target tab:", targetTab.url);

    // check if it is a google form
    if (!targetTab.url || !targetTab.url.includes("docs.google.com/forms")) {
      sendResponse({ success: false, error: "This page is not a Google Form" });
      return;
    }

    // try messaging content script
    try {
      const response = await chrome.tabs.sendMessage(targetTab.id, {
        action: "answerGForm",
      });

      console.log("📝 GForm content script response:", response);

      if (response && response.success) {
        sendResponse({
          success: true,
          answeredCount: response.answeredCount || 0,
        });
      } else {
        sendResponse({
          success: false,
          error: response?.error || "Failed to process Google Form",
        });
      }
    } catch (contentScriptError) {
      console.log("❌ Content script failed, trying injection:", contentScriptError);

      // fallback inject gform script directly
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: gformAutoAnswer,
          world: "MAIN",
        });

        if (results && results[0] && results[0].result) {
          const result = results[0].result;
          sendResponse(result);
        } else {
          sendResponse({
            success: false,
            error: "Failed to inject GForm script",
          });
        }
      } catch (injectionError) {
        console.error("❌ GForm injection failed:", injectionError);
        sendResponse({
          success: false,
          error: "Failed to access the Google Form page: " + injectionError.message,
        });
      }
    }
  } catch (error) {
    console.error("❌ GForm error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// injected function for gform auto answer
function gformAutoAnswer() {
  try {
    // look for form data in page
    const scripts = document.querySelectorAll("script");
    let fbData = null;

    // check global variable first
    if (typeof FB_PUBLIC_LOAD_DATA_ !== "undefined") {
      fbData = FB_PUBLIC_LOAD_DATA_;
    }

    // search in script tags if missing
    if (!fbData) {
      for (const script of scripts) {
        const text = script.textContent || script.innerText || "";
        if (text.includes("FB_PUBLIC_LOAD_DATA_")) {
          const match = text.match(
            /var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);/
          );
          if (match) {
            try {
              fbData = JSON.parse(match[1]);
            } catch (e) {
              // use eval as backup for complex data
              try {
                fbData = eval("(" + match[1] + ")");
              } catch (e2) {
                console.error("Failed to parse FB_PUBLIC_LOAD_DATA_:", e2);
              }
            }
          }
          break;
        }
      }
    }

    if (!fbData) {
      return {
        success: false,
        error:
          "Could not detect answers. This form may not be a quiz or answers are not available.",
      };
    }

    // get questions and answers from form data
    let answeredCount = 0;
    const formData = fbData[1];

    if (!formData || !formData[1]) {
      return {
        success: false,
        error: "Form data structure not recognized. This may not be a quiz form.",
      };
    }

    const questions = formData[1];

    for (const question of questions) {
      if (!question || !question[1]) continue;

      const questionTitle = question[1];
      const questionId = question[4]?.[0]?.[0];
      const questionType = question[3];

      // find the correct answers
      let correctAnswers = [];

      // answer key location for choices
      // correct answer location
      const answerData = question[4]?.[0];

      if (!answerData) continue;

      // find answers in grading data
      const gradingData = answerData[4];
      if (gradingData && gradingData[0]) {
        // array of correct answers in grading data
        for (const answerInfo of gradingData[0]) {
          if (answerInfo && answerInfo[1]) {
            correctAnswers.push(answerInfo[1]);
          }
        }
      }

      if (correctAnswers.length === 0) continue;

      console.log(
        "📝 Question:",
        questionTitle,
        "| Answers:",
        correctAnswers,
        "| Type:",
        questionType
      );

      // find question wrapper in dom
      const entryId = `entry.${questionId}`;
      const questionContainers = document.querySelectorAll(
        '[data-params*="' + questionId + '"]'
      );

      let container = null;
      if (questionContainers.length > 0) {
        container = questionContainers[0];
      } else {
        // try finding by entry name
        const inputs = document.querySelectorAll(
          `[name="${entryId}"], [name="entry.${questionId}"]`
        );
        if (inputs.length > 0) {
          container = inputs[0].closest('[role="listitem"], .freebirdFormviewerViewItemsItemItem, [data-item-id]');
        }
      }

      if (!container) {
        // try searching by question text  
        const allContainers = document.querySelectorAll(
          '[role="listitem"], .freebirdFormviewerViewItemsItemItem, [data-item-id]'
        );
        for (const c of allContainers) {
          if (c.textContent.includes(questionTitle)) {
            container = c;
            break;
          }
        }
      }

      if (!container) continue;

      // fill answer by question type
      // handle different question types
      if (questionType === 2 || questionType === 4) {
        // handle multiple choice or checkbox
        const labels = container.querySelectorAll(
          '[role="radio"], [role="checkbox"], label, .docssharedWizToggleLabeledContainer'
        );

        for (const label of labels) {
          const labelText = (label.textContent || label.innerText || "").trim();
          for (const answer of correctAnswers) {
            if (labelText === answer || labelText.includes(answer)) {
              label.click();
              answeredCount++;
              break;
            }
          }
        }
      } else if (questionType === 0 || questionType === 1) {
        // handle short or long text answer
        const input = container.querySelector(
          'input[type="text"], textarea, [role="textbox"], .quantumWizTextinputPaperinputInput, .quantumWizTextinputPapertextareaInput'
        );

        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set || Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value"
          )?.set;

          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(input, correctAnswers[0]);
          } else {
            input.value = correctAnswers[0];
          }

          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new Event("blur", { bubbles: true }));
          answeredCount++;
        }
      }
    }

    if (answeredCount === 0) {
      return {
        success: false,
        error:
          "Found form data but could not fill any answers. The form structure may have changed.",
      };
    }

    return { success: true, answeredCount };
  } catch (error) {
    return { success: false, error: "Error processing form: " + error.message };
  }
}
