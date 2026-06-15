/* ============================================================
 * EE Cockpit Tour — FAQ dictionary
 * --------------------------------------------------------------
 * Edit, add, or remove entries freely. Each entry has:
 *   - keywords: array of lowercase words/phrases that, if ALL of
 *               at least one entry are found in the user's question,
 *               trigger the answer. Use shorter, more general
 *               keywords for broader matches.
 *   - answer:   the response text. Einstein will speak it aloud
 *               AND show it in the speech bubble.
 *
 * Matching rules (see scoreEntry below):
 *   - Question is lowercased.
 *   - For each entry, count how many of its keywords appear as
 *     whole-word substrings in the question.
 *   - The entry with the highest match count (>= 1) wins.
 *   - If nothing matches, the fallback message is returned.
 *
 * Hook for upgrading to a real LLM:
 *   - Replace the body of `window.EinsteinFAQ.answer()` (in tour.js
 *     via `__faqAnswer` override) with an async call to OpenAI /
 *     Anthropic / your endpoint. Keep the function signature
 *     `(question: string) => Promise<string>` so the rest of the
 *     tour code continues to work.
 * ============================================================ */
(function (global) {
  'use strict';

  const FAQ_ENTRIES = [
    {
      keywords: ['hello', 'hi', 'hey', 'greet'],
      answer: "Greetings! I am Albert Einstein, your guide through the EE Cockpit. " +
              "Ask me anything, or let me walk you through the menus."
    },
    {
      keywords: ['who are you', 'einstein', 'who'],
      answer: "I am Albert Einstein — your interactive guide. I will explain each menu " +
              "of the EE Cockpit and answer questions in plain language."
    },
    {
      keywords: ['ee cockpit', 'what is this', 'about'],
      answer: "EE Cockpit is the Executive Engineer's command and training platform — " +
              "a single place for revenue, operations, HR, finance, governance, safety, " +
              "and daily decision-making."
    },
    {
      keywords: ['revenue', 'dcb', 'billing'],
      answer: "The Revenue & Commercial menu covers billing efficiency, DCB reconciliation, " +
              "HT consumer reviews, theft handling, and tariff implementation. Open it from " +
              "the main menu or click its mind-map tile."
    },
    {
      keywords: ['o&m', 'om', 'outage', 'reliability', 'saidi', 'saifi'],
      answer: "The O&M War Room handles outages, restoration, feeder trips, distribution " +
              "transformer lifecycle, and reliability indices like SAIDI and SAIFI."
    },
    {
      keywords: ['hr', 'human resources', 'promotion', 'dpc', 'acr', 'discipline'],
      answer: "HR & Establishment covers promotions, ACRs, the Departmental Promotion Committee, " +
              "disciplinary proceedings, and the reservation roster."
    },
    {
      keywords: ['finance', 'capex', 'opex', 'sap', 'budget'],
      answer: "Finance & Accounts addresses capex versus opex, SAP financial flow, budget " +
              "discipline, and capitalisation of completed works."
    },
    {
      keywords: ['safety', 'ptw', 'accident', 'permit'],
      answer: "Safety & Tech Sanctions covers permit-to-work discipline, accident protocols, " +
              "and technical sanction approvals. Safety is non-negotiable — always speaking order."
    },
    {
      keywords: ['mind map', 'mindmap', 'map'],
      answer: "Every menu has a dedicated mind map. Click the carousel below the menu tabs, " +
              "or open the MindMaps folder for the full interactive index."
    },
    {
      keywords: ['simulator', 'scenario', 'decision'],
      answer: "The Decision Simulator lets you rehearse high-pressure calls — fatal accidents, " +
              "political pressure, audit objections — before they arrive. Pick a scenario and " +
              "choose your action to see what would really happen."
    },
    {
      keywords: ['mentor', 'wisdom', 'advice'],
      answer: "Smart Mentor offers field-tested wisdom from senior officers. Browse questions " +
              "or search for a topic — answers are concise, specific, and actionable."
    },
    {
      keywords: ['faq', 'frequently asked'],
      answer: "The FAQ Library indexes the most common questions across revenue, O&M, HR, " +
              "finance, and administration — quick answers and deeper concepts."
    },
    {
      keywords: ['promotion prep', 'interview', 'viva'],
      answer: "Promotion Prep walks you through technical, administrative, leadership, and " +
              "scenario questions you may face in an interview or viva. Practice out loud."
    },
    {
      keywords: ['template', 'letter', 'rti', 'audit reply'],
      answer: "Templates & Letters contains ready drafts — disconnection notices, theft " +
              "assessment orders, RTI replies, audit responses, and court counter-affidavits. " +
              "Fill the blanks and adapt to your case."
    },
    {
      keywords: ['compliance', 'audit', 'vigilance'],
      answer: "Compliance Tracker shows audit paras, vigilance actions, and RTI deadlines. " +
              "Review weekly so nothing slips past statutory windows."
    },
    {
      keywords: ['skip', 'exit', 'close', 'stop'],
      answer: "Of course. Click 'Skip Tour' or press Escape to exit. You can re-launch the tour " +
              "anytime from the small '?' button at the bottom-right of the screen."
    },
    {
      keywords: ['help', 'support', 'contact'],
      answer: "For technical help, contact your IT support team. For training and content " +
              "questions, the Smart Mentor menu and FAQ Library are the fastest references."
    }
  ];

  const FALLBACK =
    "That is a fascinating question. I don't have an answer for it in my current " +
    "knowledge — please contact support, or check the FAQ Library and Smart Mentor menus.";

  /** Score: how many of an entry's keywords appear (as whole-word substrings)
   *  in the question. Ignores case and extra whitespace. */
  function scoreEntry(question, entry) {
    const q = ' ' + question.toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    let hits = 0;
    for (const kw of entry.keywords) {
      const needle = ' ' + kw.toLowerCase() + ' ';
      // for multi-word keywords like "ee cockpit", check substring within padded string
      if (kw.includes(' ')) {
        if (q.includes(' ' + kw.toLowerCase() + ' ')) hits += 1;
      } else {
        if (q.includes(needle)) hits += 1;
      }
    }
    return hits;
  }

  function bestMatch(question) {
    if (!question || !question.trim()) return null;
    let best = null;
    let bestScore = 0;
    for (const entry of FAQ_ENTRIES) {
      const s = scoreEntry(question, entry);
      if (s > bestScore) { best = entry; bestScore = s; }
    }
    return best;
  }

  /** Public API. The tour calls `window.EinsteinFAQ.answer(question)`.
   *  Returns a Promise<string> so it remains compatible if you later swap
   *  in an LLM-backed implementation. */
  global.EinsteinFAQ = {
    entries: FAQ_ENTRIES,
    fallback: FALLBACK,
    answer: function (question) {
      return new Promise(function (resolve) {
        const match = bestMatch(question);
        resolve(match ? match.answer : FALLBACK);
      });
    }
  };
})(window);
