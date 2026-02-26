// webtoolkit content script
// handles catching content from web pages
// talks to background script to store data

// wait for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "capturePageContent") {
    const capturedContent = captureMainContent();
    sendResponse({ success: true, content: capturedContent });
  } else if (message.action === "answerGForm") {
    handleGFormAutoAnswer().then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
  }
  return true;
});

// main function to catch content
function captureMainContent() {
  try {
    // how we find the main content block
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
      ".page-content",
      ".single-content",
      ".blog-post",
      ".story-content",
      ".quiz-content",
      ".course-content",
      ".lesson-content",
      ".main-content",
      ".primary-content",
      "#primary",
      ".primary",
      "#container .content",
      ".container .content",
      ".wrapper .content",
      "#wrapper .content",
      "[data-region='content']",
      ".content-area",
      ".site-content",
      ".page-wrapper .content",
      ".quiz-body",
      ".question-content",
      ".course-body",
    ];

    let mainElement = null;
    let bestScore = 0;

    // test selectors and score them by quality
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.innerText || element.textContent || "";
        const score = scoreElement(element, text);

        if (score > bestScore && text.trim().length > 50) {
          mainElement = element;
          bestScore = score;
        }
      }
    }

    // backup plan to find the largest text box
    if (!mainElement || bestScore < 10) {
      const allElements = document.querySelectorAll(
        "div, section, article, main, p"
      );
      for (const element of allElements) {
        const text = element.innerText || element.textContent || "";
        const score = scoreElement(element, text);

        if (score > bestScore && text.trim().length > 100) {
          mainElement = element;
          bestScore = score;
        }
      }
    }

    // last resort to use the body
    if (!mainElement) {
      mainElement = document.body;
    }

    // get the content and clean it up
    const text = extractCleanText(mainElement);
    const html = sanitizeHTML(mainElement.innerHTML);

    return {
      text: text.trim(),
      html: html.trim(),
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
    };
  } catch (error) {
    console.error("Content capture error:", error);
    return {
      text: "",
      html: "",
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      error: error.message,
    };
  }
}

// rate element by how good the content looks
function scoreElement(element, text) {
  let score = 0;

  // score by text length prefer longer content
  const textLength = text.trim().length;
  score += Math.min(textLength / 50, 100); // Max 100 points for length

  // score by html tag prefer meaningful ones
  const tagName = element.tagName.toLowerCase();
  if (tagName === "main") score += 50;
  else if (tagName === "article") score += 40;
  else if (tagName === "section") score += 25;
  else if (tagName === "div") score += 5;
  else if (tagName === "p") score += 10;

  // checking class and id names
  const className = element.className.toLowerCase();
  const id = element.id.toLowerCase();
  const identifiers = className + " " + id;

  // good signs
  if (identifiers.includes("content")) score += 30;
  if (identifiers.includes("main")) score += 30;
  if (identifiers.includes("article")) score += 25;
  if (identifiers.includes("post")) score += 25;
  if (identifiers.includes("story")) score += 20;
  if (identifiers.includes("blog")) score += 20;
  if (identifiers.includes("text")) score += 15;
  if (identifiers.includes("body")) score += 15;
  if (identifiers.includes("entry")) score += 15;
  if (identifiers.includes("page-content")) score += 25;
  if (identifiers.includes("single-content")) score += 25;
  if (identifiers.includes("post-content")) score += 25;

  // signs it is a quiz or course
  if (identifiers.includes("quiz-content")) score += 30;
  if (identifiers.includes("course-content")) score += 30;
  if (identifiers.includes("lesson-content")) score += 30;
  if (identifiers.includes("question")) score += 20;
  if (identifiers.includes("quiz-body")) score += 25;

  // bad signs like menus or sidebars
  if (identifiers.includes("sidebar")) score -= 40;
  if (identifiers.includes("nav")) score -= 40;
  if (identifiers.includes("navigation")) score -= 40;
  if (identifiers.includes("footer")) score -= 30;
  if (identifiers.includes("header")) score -= 30;
  if (identifiers.includes("menu")) score -= 35;
  if (identifiers.includes("toolbar")) score -= 30;
  if (identifiers.includes("breadcrumb")) score -= 25;
  if (identifiers.includes("comment")) score -= 20;
  if (identifiers.includes("ad")) score -= 50;
  if (identifiers.includes("advertisement")) score -= 50;
  if (identifiers.includes("banner")) score -= 30;
  if (identifiers.includes("popup")) score -= 40;
  if (identifiers.includes("modal")) score -= 40;
  if (identifiers.includes("overlay")) score -= 40;
  if (identifiers.includes("control")) score -= 25;
  if (identifiers.includes("pagination")) score -= 25;
  if (identifiers.includes("meta")) score -= 20;
  if (identifiers.includes("widget")) score -= 30;

  // checking html roles
  const role = element.getAttribute("role");
  if (role === "main") score += 50;
  if (role === "article") score += 30;
  if (role === "complementary") score -= 30;
  if (role === "banner") score -= 30;
  if (role === "navigation") score -= 40;
  if (role === "contentinfo") score -= 30;

  // checking data attributes
  const dataRegion = element.getAttribute("data-region");
  if (dataRegion && dataRegion.includes("content")) score += 20;

  // lower score if mostly navigation
  const navElements = element.querySelectorAll("nav, .nav, .navigation, .menu");
  if (navElements.length > 2) score -= 20;

  // extra points for paragraphs and headings
  const paragraphs = element.querySelectorAll("p");
  const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
  score += Math.min(paragraphs.length * 2, 20);
  score += Math.min(headings.length * 3, 15);

  return Math.max(score, 0);
}

// get clean text out of element
function extractCleanText(element) {
  // copy element so we do not break original
  const cloned = element.cloneNode(true);

  // clear out junk elements
  const unwantedSelectors = [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "aside",
    ".sidebar",
    ".nav",
    ".navigation",
    ".navbar",
    ".menu",
    ".breadcrumb",
    ".breadcrumbs",
    ".advertisement",
    ".ad",
    ".ads",
    ".banner",
    ".social",
    ".social-share",
    ".comments",
    ".comment",
    ".share",
    ".sharing",
    ".related",
    ".related-posts",
    ".recommended",
    ".popup",
    ".modal",
    ".overlay",
    ".toolbar",
    ".control",
    ".controls",
    ".button-group",
    ".pagination",
    ".pager",
    ".meta",
    ".metadata",
    ".tags",
    ".categories",
    ".author",
    ".date",
    ".timestamp",
    ".byline",
    ".widget",
    ".promo",
    ".promotional",
    ".newsletter",
    ".subscription",
    ".alert",
    ".notification",
    ".warning",
    ".error",
    ".success",
    "[role='complementary']",
    "[role='banner']",
    "[role='navigation']",
    "[role='contentinfo']",
    "[aria-label*='navigation']",
    "[aria-label*='menu']",
    "[class*='quiz-nav']",
    "[class*='navigation']",
    "[class*='sidebar']",
    "[class*='header']",
    "[class*='footer']",
    "[id*='nav']",
    "[id*='sidebar']",
    "[id*='header']",
    "[id*='footer']",
  ];

  unwantedSelectors.forEach((selector) => {
    const elements = cloned.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  });

  // grab the text inside
  let text = cloned.innerText || cloned.textContent || "";

  // clean up spaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

// simple html cleanup
function sanitizeHTML(html) {
  // take out script and style tags completely
  html = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // take out dangerous stuff
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, ""); // remove event handlers
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, ""); // remove event handlers
  html = html.replace(/javascript:/gi, ""); // remove js urls

  return html;
}

// another way to catch content for api
function captureContentDirect() {
  return captureMainContent();
}

// auto answer for google forms
function handleGFormAutoAnswer() {
  return new Promise((resolve) => {
    try {
      console.log("ðŸ“ GForm auto-answer started...");

      // note content scripts run in an isolated world
      // they cannot reach page js variables
      // fix inject a script tag to run in main world
      // then pass data back with custom event

      let resolved = false;

      const doResolve = (result) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      // setup listener for data from injected script
      const handler = (event) => {
        document.removeEventListener("__gform_data_result__", handler);
        const fbData = event.detail;

        if (!fbData) {
          console.log("âŒ FB_PUBLIC_LOAD_DATA_ not found via main world injection");
          // backup plan use script tag parsing
          const parsed = parseScriptTags();
          if (parsed) {
            doResolve(parseAndFillAnswers(parsed));
          } else {
            doResolve({
              success: false,
              error: "Could not detect answers. This form may not be a quiz or answers are not available.",
            });
          }
          return;
        }

        console.log("âœ… Received FB_PUBLIC_LOAD_DATA_ from page context");
        doResolve(parseAndFillAnswers(fbData));
      };

      document.addEventListener("__gform_data_result__", handler);

      // inject script into the page main world
      const injectedScript = document.createElement("script");
      injectedScript.textContent = `
        (function() {
          try {
            var data = null;
            if (typeof FB_PUBLIC_LOAD_DATA_ !== 'undefined') {
              data = FB_PUBLIC_LOAD_DATA_;
            }
            document.dispatchEvent(new CustomEvent('__gform_data_result__', {
              detail: data
            }));
          } catch(e) {
            document.dispatchEvent(new CustomEvent('__gform_data_result__', {
              detail: null
            }));
          }
        })();
      `;
      document.documentElement.appendChild(injectedScript);
      injectedScript.remove();

      // fallback if it takes too long
      setTimeout(() => {
        document.removeEventListener("__gform_data_result__", handler);
        if (!resolved) {
          console.log("âš ï¸ Main world injection timed out, trying script tag parsing...");
          const fbData = parseScriptTags();
          if (fbData) {
            doResolve(parseAndFillAnswers(fbData));
          } else {
            doResolve({
              success: false,
              error: "Could not detect answers. Injection timed out and script tag parsing failed.",
            });
          }
        }
      }, 3000);

    } catch (error) {
      console.error("âŒ GForm auto-answer error:", error);
      resolve({ success: false, error: "Error: " + error.message });
    }
  });
}

// backup plan parse script tags using brackets
function parseScriptTags() {
  const scripts = document.querySelectorAll("script");
  for (const script of scripts) {
    const text = script.textContent || "";
    if (!text.includes("FB_PUBLIC_LOAD_DATA_")) continue;

    console.log("âœ… Found FB_PUBLIC_LOAD_DATA_ in script tag");

    const startIdx = text.indexOf("FB_PUBLIC_LOAD_DATA_");
    const eqIdx = text.indexOf("=", startIdx);
    if (eqIdx === -1) continue;

    // look for opening bracket
    let arrStart = text.indexOf("[", eqIdx);
    if (arrStart === -1) continue;

    // count brackets to find the end
    let depth = 0;
    let arrEnd = -1;
    for (let i = arrStart; i < text.length; i++) {
      if (text[i] === "[") depth++;
      else if (text[i] === "]") {
        depth--;
        if (depth === 0) {
          arrEnd = i;
          break;
        }
      }
    }

    if (arrEnd === -1) {
      console.log("âš ï¸ Could not find matching bracket");
      continue;
    }

    const jsonStr = text.substring(arrStart, arrEnd + 1);
    console.log("ðŸ“ Extracted data length:", jsonStr.length);

    try {
      const data = JSON.parse(jsonStr);
      console.log("âœ… Parsed via JSON.parse");
      return data;
    } catch (e) {
      console.log("âš ï¸ JSON.parse failed:", e.message);
      try {
        const data = new Function("return " + jsonStr)();
        console.log("âœ… Parsed via Function constructor");
        return data;
      } catch (e2) {
        console.error("âŒ Both parse methods failed:", e2.message);
      }
    }
  }
  return null;
}

// parse form data and fill in answers
function parseAndFillAnswers(fbData) {
  try {
    console.log("ðŸ“ fbData structure: length=" + (fbData?.length || "null"));

    const formData = fbData[1];
    if (!formData || !formData[1]) {
      // try another structure if first one fails
      const altFormData = fbData[0];
      if (altFormData && altFormData[1]) {
        console.log("ðŸ“ Using alternative data structure fbData[0]");
        return processQuestions(altFormData[1]);
      }
      return {
        success: false,
        error: "Form data structure not recognized. This may not be a quiz form.",
      };
    }

    return processQuestions(formData[1]);
  } catch (error) {
    console.error("âŒ Parse error:", error);
    return { success: false, error: "Error parsing form: " + error.message };
  }
}

function processQuestions(questions) {
  let answeredCount = 0;
  let totalQuestions = 0;

  console.log("ðŸ“ Processing", questions.length, "items");

  for (let qi = 0; qi < questions.length; qi++) {
    const question = questions[qi];
    if (!question) continue;

    const questionTitle = question[1];
    if (!questionTitle) continue;

    const questionType = question[3];
    const answerDataArr = question[4];

    if (!answerDataArr || answerDataArr.length === 0) continue;

    const answerData = answerDataArr[0];
    if (!answerData) continue;

    const questionId = answerData[0];
    totalQuestions++;

    // get correct answers
    let correctAnswers = extractCorrectAnswers(answerData);

    console.log(
      `ðŸ“ Q${qi}: "${questionTitle}" | Type:${questionType} | ID:${questionId} | Answers:[${correctAnswers.join(", ")}]`
    );

    if (correctAnswers.length === 0) {
      console.log(`  â­ï¸ No answers found, skipping`);
      continue;
    }

    // find dom container
    let container = findQuestionContainer(questionId, questionTitle);
    if (!container) {
      console.log(`  âš ï¸ Container not found`);
      continue;
    }

    // fill based on question type
    let filled = 0;
    switch (questionType) {
      case 2: filled = fillMultipleChoice(container, correctAnswers); break;
      case 4: filled = fillCheckboxes(container, correctAnswers); break;
      case 0: case 1: filled = fillTextInput(container, correctAnswers[0]); break;
      case 3: filled = fillDropdown(container, correctAnswers[0]); break;
      default:
        console.log(`  âš ï¸ Unknown type ${questionType}, trying multiple choice then text`);
        filled = fillMultipleChoice(container, correctAnswers);
        if (filled === 0) filled = fillTextInput(container, correctAnswers[0]);
    }

    answeredCount += filled;
  }

  console.log(`ðŸ“ Result: ${answeredCount}/${totalQuestions} answered`);

  if (totalQuestions === 0) {
    return { success: false, error: "No quiz questions found in this form." };
  }
  if (answeredCount === 0) {
    return {
      success: false,
      error: `Found ${totalQuestions} question(s) but could not fill any. Check browser console (F12) for details.`,
    };
  }
  return { success: true, answeredCount };
}

// get correct answers from question answer data
function extractCorrectAnswers(answerData) {
  let answers = [];

  // method 1 grading data at index 4
  const gradingData = answerData[4];
  if (gradingData && Array.isArray(gradingData[0])) {
    for (const info of gradingData[0]) {
      if (info && info[1] != null) {
        answers.push(String(info[1]));
      }
    }
  }

  // method 2 choices at index 1 with correct flag
  if (answers.length === 0 && Array.isArray(answerData[1])) {
    for (const opt of answerData[1]) {
      if (opt && opt[4] === 1) {
        answers.push(String(opt[0]));
      }
    }
  }

  // method 3 validation rules for passwords or access codes
  // validation params are at index 4
  if (answers.length === 0 && Array.isArray(gradingData) && gradingData.length > 0) {
    const vRule = gradingData[0]; // rule is the first thing
    if (vRule && Array.isArray(vRule) && vRule.length >= 3) {
      // type 1 number and match 5 equal to
      if (vRule[0] === 1 && vRule[1] === 5 && Array.isArray(vRule[2])) {
        answers.push(String(vRule[2][0]));
      }
      // type 2 text and match 100 contains
      else if (vRule[0] === 2 && vRule[1] === 100 && Array.isArray(vRule[2])) {
        answers.push(String(vRule[2][0]));
      }
    }
  }

  return answers;
}

// find question box in dom
function findQuestionContainer(questionId, questionTitle) {
  const qid = String(questionId);

  // strategy 1 look for data params with question id
  const allWithParams = document.querySelectorAll("[data-params]");
  for (const el of allWithParams) {
    if (el.getAttribute("data-params").includes(qid)) {
      return el;
    }
  }

  // strategy 2 look for input fields with entry name
  const entryEls = document.querySelectorAll(
    `[name="entry.${qid}"], [name="entry.${qid}_sentinel"], input[name*="${qid}"]`
  );
  for (const entry of entryEls) {
    let parent = entry.parentElement;
    for (let depth = 0; parent && depth < 20; depth++) {
      if (
        parent.getAttribute("role") === "listitem" ||
        parent.hasAttribute("data-item-id") ||
        (parent.getAttribute("data-params") || "").length > 5 ||
        parent.classList.contains("Qr7Oae") ||
        parent.classList.contains("freebirdFormviewerViewItemsItemItem")
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }
  }

  // strategy 3 match question text
  const blocks = document.querySelectorAll(
    '[role="listitem"], [data-item-id], .Qr7Oae, .freebirdFormviewerViewItemsItemItem'
  );

  // try exact match first
  for (const block of blocks) {
    const heading = block.querySelector(
      '[role="heading"], .M7eMe, .freebirdFormviewerComponentsQuestionBaseTitle'
    );
    if (heading && heading.textContent.trim() === questionTitle) {
      return block;
    }
  }

  // try partial match
  for (const block of blocks) {
    if (block.textContent.includes(questionTitle)) {
      return block;
    }
  }

  return null;
}

// fill multiple choice radio
function fillMultipleChoice(container, correctAnswers) {
  const selectors = [
    '[data-value]',
    '[role="radio"]',
    '.docssharedWizToggleLabeledContainer',
    '.nWQGrd',
    'label',
  ];

  for (const selector of selectors) {
    const options = container.querySelectorAll(selector);
    if (options.length === 0) continue;

    for (const option of options) {
      const dataValue = option.getAttribute("data-value") || "";
      const optText = (option.textContent || "").trim();

      for (const answer of correctAnswers) {
        if (
          dataValue === answer ||
          optText === answer ||
          (optText && optText.includes(answer)) ||
          (optText && answer.includes(optText) && optText.length > 1)
        ) {
          option.click();
          console.log(`  âœ… Radio: "${dataValue || optText}"`);
          return 1;
        }
      }
    }
  }
  return 0;
}

// fill checkboxes
function fillCheckboxes(container, correctAnswers) {
  let filled = 0;
  const selectors = [
    '[data-answer-value]',
    '[role="checkbox"]',
    '.docssharedWizToggleLabeledContainer',
    '.nWQGrd',
    'label',
  ];

  for (const selector of selectors) {
    const options = container.querySelectorAll(selector);
    if (options.length === 0) continue;

    for (const option of options) {
      const dv = option.getAttribute("data-answer-value") || option.getAttribute("data-value") || "";
      const txt = (option.textContent || "").trim();
      const check = dv || txt;

      for (const answer of correctAnswers) {
        if (
          check === answer ||
          (check && check.includes(answer)) ||
          (check && answer.includes(check) && check.length > 1)
        ) {
          option.click();
          filled++;
          console.log(`  âœ… Checkbox: "${check}"`);
          break;
        }
      }
    }
    if (filled > 0) break;
  }
  return filled;
}

// fill text input
function fillTextInput(container, answer) {
  const selectors = [
    'input[type="text"]', 'textarea', '.whsOnd', '.KHxj8b',
    '[role="textbox"]', 'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
  ];

  let input = null;
  for (const sel of selectors) {
    input = container.querySelector(sel);
    if (input) break;
  }

  if (!input) return 0;

  input.focus();
  input.click();

  const isTextarea = input.tagName === "TEXTAREA";
  const proto = isTextarea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");

  if (desc && desc.set) {
    desc.set.call(input, answer);
  } else {
    input.value = answer;
  }

  ["focus", "input", "change", "blur"].forEach(evt => {
    input.dispatchEvent(new Event(evt, { bubbles: true }));
  });

  console.log(`  âœ… Text: "${answer}"`);
  return 1;
}

// fill dropdown
function fillDropdown(container, answer) {
  const trigger = container.querySelector(
    '[role="listbox"], .MocG8c, .quantumWizMenuPaperselectEl, select'
  );

  if (!trigger) return 0;

  if (trigger.tagName === "SELECT") {
    for (const opt of trigger.options) {
      if (opt.textContent.trim() === answer || opt.textContent.includes(answer)) {
        trigger.value = opt.value;
        trigger.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(`  âœ… Dropdown: "${answer}"`);
        return 1;
      }
    }
    return 0;
  }

  trigger.click();
  setTimeout(() => {
    const opts = document.querySelectorAll('[role="option"], [data-value], .OA0qNb');
    for (const opt of opts) {
      const dv = opt.getAttribute("data-value") || "";
      const txt = (opt.textContent || "").trim();
      if (dv === answer || txt === answer || txt.includes(answer)) {
        opt.click();
        console.log(`  âœ… Dropdown: "${txt || dv}"`);
        return;
      }
    }
  }, 300);
  return 1;
}

