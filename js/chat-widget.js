/**
 * Medhyx AI Architecture Assistant — Chat Widget
 * Self-contained floating chat widget for medhyx.com
 * 
 * CONFIGURATION: Update WORKER_URL below after deploying the Cloudflare Worker
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION — Update this after deploying your worker
  // ═══════════════════════════════════════════════════════════
  const WORKER_URL = 'https://medhyx-ai.randhirgupta.workers.dev';
  // ═══════════════════════════════════════════════════════════

  const QUICK_PROMPTS = [
    'What services does Medhyx offer?',
    'How does your Delta Lake migration work?',
    'What FinOps savings can we expect?',
    'Tell me about your AI & LLMOps capabilities',
  ];

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    /* ═══ Chat Widget Styles ═══ */
    .mx-chat-trigger {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9998;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
      border: 2px solid rgba(56, 189, 248, 0.4);
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(2, 132, 199, 0.4), 0 0 20px rgba(14, 165, 233, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: mx-pulse-ring 2.5s ease-in-out infinite;
    }
    .mx-chat-trigger:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 40px rgba(2, 132, 199, 0.5), 0 0 30px rgba(14, 165, 233, 0.3);
    }
    .mx-chat-trigger.open {
      animation: none;
    }
    .mx-chat-trigger svg { width: 28px; height: 28px; transition: transform 0.3s ease; }
    .mx-chat-trigger.open .mx-icon-chat { display: none; }
    .mx-chat-trigger.open .mx-icon-close { display: block; }
    .mx-chat-trigger .mx-icon-close { display: none; }

    @keyframes mx-pulse-ring {
      0%, 100% { box-shadow: 0 8px 32px rgba(2, 132, 199, 0.4), 0 0 0 0 rgba(14, 165, 233, 0.3); }
      50% { box-shadow: 0 8px 32px rgba(2, 132, 199, 0.4), 0 0 0 12px rgba(14, 165, 233, 0); }
    }

    /* Chat Window */
    .mx-chat-window {
      position: fixed;
      bottom: 100px;
      right: 28px;
      z-index: 9999;
      width: 400px;
      max-height: 580px;
      border-radius: 20px;
      background: #0a0f1e;
      border: 1px solid rgba(56, 189, 248, 0.2);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(14, 165, 233, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .mx-chat-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* Header */
    .mx-chat-header {
      padding: 18px 20px;
      background: linear-gradient(135deg, #0c1527 0%, #111d35 100%);
      border-bottom: 1px solid rgba(56, 189, 248, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .mx-chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #0ea5e9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mx-chat-avatar svg { width: 22px; height: 22px; color: #fff; }
    .mx-chat-header-info { flex: 1; }
    .mx-chat-header-title {
      font-family: 'Space Grotesk', 'DM Sans', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.2;
    }
    .mx-chat-header-status {
      font-size: 12px;
      color: #34d399;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }
    .mx-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
    }

    /* Messages Area */
    .mx-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 260px;
      max-height: 360px;
      scrollbar-width: thin;
      scrollbar-color: rgba(56, 189, 248, 0.2) transparent;
    }
    .mx-chat-messages::-webkit-scrollbar { width: 5px; }
    .mx-chat-messages::-webkit-scrollbar-track { background: transparent; }
    .mx-chat-messages::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); border-radius: 4px; }

    .mx-msg {
      max-width: 88%;
      padding: 12px 16px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.6;
      animation: mx-msg-in 0.25s ease;
    }
    @keyframes mx-msg-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .mx-msg-user {
      align-self: flex-end;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .mx-msg-ai {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border-bottom-left-radius: 4px;
    }
    .mx-msg-ai p { margin: 0 0 8px; }
    .mx-msg-ai p:last-child { margin-bottom: 0; }
    .mx-msg-ai strong { color: #38bdf8; }
    .mx-msg-ai code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      color: #7dd3fc;
    }
    .mx-msg-ai pre {
      background: #030712;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      overflow-x: auto;
      margin: 8px 0;
    }
    .mx-msg-ai pre code {
      background: none;
      padding: 0;
      font-size: 11.5px;
      color: #e2e8f0;
      line-height: 1.5;
    }
    .mx-msg-ai ul, .mx-msg-ai ol {
      padding-left: 18px;
      margin: 6px 0;
    }
    .mx-msg-ai li { margin-bottom: 4px; }
    .mx-msg-ai a {
      color: #38bdf8;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* Typing Indicator */
    .mx-typing {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 12px 16px;
      align-self: flex-start;
    }
    .mx-typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #64748b;
      animation: mx-bounce 1.4s ease-in-out infinite;
    }
    .mx-typing-dot:nth-child(2) { animation-delay: 0.16s; }
    .mx-typing-dot:nth-child(3) { animation-delay: 0.32s; }
    @keyframes mx-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    /* Quick Prompts */
    .mx-quick-prompts {
      padding: 0 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    .mx-quick-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .mx-quick-btn {
      text-align: left;
      padding: 9px 14px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8 !important;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .mx-quick-btn:hover {
      background: rgba(14, 165, 233, 0.1);
      border-color: rgba(56, 189, 248, 0.3);
      color: #38bdf8 !important;
    }

    /* Input Area */
    .mx-chat-input-area {
      padding: 14px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .mx-chat-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 11px 16px;
      color: #f8fafc;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .mx-chat-input::placeholder { color: #475569; }
    .mx-chat-input:focus { border-color: rgba(56, 189, 248, 0.5); }
    .mx-chat-send {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #0ea5e9);
      border: none;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .mx-chat-send:hover { transform: scale(1.05); }
    .mx-chat-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .mx-chat-send svg { width: 18px; height: 18px; }

    /* Footer */
    .mx-chat-footer {
      text-align: center;
      padding: 8px;
      font-size: 10px;
      color: #475569;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      flex-shrink: 0;
    }
    .mx-chat-footer a { color: #64748b; }

    /* Mobile */
    @media (max-width: 480px) {
      .mx-chat-window {
        width: calc(100vw - 16px);
        right: 8px;
        bottom: 96px;
        max-height: calc(100vh - 140px);
        border-radius: 16px;
      }
      .mx-chat-trigger {
        bottom: 20px;
        right: 20px;
        width: 54px;
        height: 54px;
      }
    }
  `;
  document.head.appendChild(style);

  // Build DOM
  const triggerHTML = `
    <button class="mx-chat-trigger" id="mxChatTrigger" aria-label="Open AI Chat Assistant" title="Ask Medhyx AI">
      <svg class="mx-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <svg class="mx-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  const windowHTML = `
    <div class="mx-chat-window" id="mxChatWindow">
      <div class="mx-chat-header">
        <div class="mx-chat-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
        <div class="mx-chat-header-info">
          <div class="mx-chat-header-title">Medhyx AI Assistant</div>
          <div class="mx-chat-header-status"><span class="mx-status-dot"></span> Online</div>
        </div>
      </div>
      <div class="mx-chat-messages" id="mxChatMessages">
        <div class="mx-msg mx-msg-ai">
          <p>Hi! I'm the <strong>Medhyx Architecture Assistant</strong>. I can help you with questions about our enterprise data engineering services, cloud lakehouse architecture, migration strategies, and AI/LLMOps capabilities.</p>
          <p>What would you like to know?</p>
        </div>
      </div>
      <div class="mx-quick-prompts" id="mxQuickPrompts">
        <div class="mx-quick-label">Quick Questions</div>
        ${QUICK_PROMPTS.map(p => `<button class="mx-quick-btn" type="button">${p}</button>`).join('')}
      </div>
      <div class="mx-chat-input-area">
        <input type="text" class="mx-chat-input" id="mxChatInput" placeholder="Ask about our architecture services..." autocomplete="off" maxlength="500">
        <button class="mx-chat-send" id="mxChatSend" type="button" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
      <div class="mx-chat-footer">Powered by <a href="/">Medhyx Solutions</a> &bull; Gemini AI</div>
    </div>
  `;

  // Inject into page
  const wrapper = document.createElement('div');
  wrapper.id = 'mxChatWidget';
  wrapper.innerHTML = triggerHTML + windowHTML;
  document.body.appendChild(wrapper);

  // State
  const conversationHistory = [];
  let isStreaming = false;

  // Elements
  const trigger = document.getElementById('mxChatTrigger');
  const chatWindow = document.getElementById('mxChatWindow');
  const messages = document.getElementById('mxChatMessages');
  const input = document.getElementById('mxChatInput');
  const sendBtn = document.getElementById('mxChatSend');
  const quickPrompts = document.getElementById('mxQuickPrompts');

  // Toggle chat
  trigger.addEventListener('click', () => {
    const isOpen = chatWindow.classList.toggle('open');
    trigger.classList.toggle('open', isOpen);
    if (isOpen) {
      setTimeout(() => input.focus(), 300);
    }
  });

  // Quick prompts
  quickPrompts.querySelectorAll('.mx-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sendMessage(btn.textContent.trim());
    });
  });

  // Send on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) sendMessage(text);
    }
  });

  // Send button
  sendBtn.addEventListener('click', () => {
    if (isStreaming) return;
    const text = input.value.trim();
    if (text) sendMessage(text);
  });

  // Simple markdown to HTML
  function mdToHtml(text) {
    let html = text
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered lists
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Line breaks
      .replace(/\n/g, '<br>');

    if (!html.startsWith('<')) html = '<p>' + html + '</p>';
    return html;
  }

  // Add message to UI
  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `mx-msg mx-msg-${role === 'user' ? 'user' : 'ai'}`;
    if (role === 'user') {
      div.textContent = content;
    } else {
      div.innerHTML = mdToHtml(content);
    }
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  // Show typing indicator
  function showTyping() {
    const div = document.createElement('div');
    div.className = 'mx-typing';
    div.id = 'mxTyping';
    div.innerHTML = '<span class="mx-typing-dot"></span><span class="mx-typing-dot"></span><span class="mx-typing-dot"></span>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('mxTyping');
    if (el) el.remove();
  }

  // Send message
  async function sendMessage(text) {
    if (isStreaming || !text.trim()) return;
    isStreaming = true;
    sendBtn.disabled = true;
    input.value = '';

    // Hide quick prompts after first message
    if (quickPrompts) quickPrompts.style.display = 'none';

    // Add user message
    addMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });

    showTyping();

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      removeTyping();

      // Create AI message element for streaming
      const aiDiv = addMessage('assistant', '');
      let fullText = '';

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              fullText += chunk;
              aiDiv.innerHTML = mdToHtml(fullText);
              messages.scrollTop = messages.scrollHeight;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      if (!fullText.trim()) {
        fullText = "I apologize, but I wasn't able to generate a response. Please try asking your question again.";
        aiDiv.innerHTML = mdToHtml(fullText);
      }

      conversationHistory.push({ role: 'assistant', content: fullText });

    } catch (err) {
      removeTyping();
      addMessage('assistant', "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or reach out to us directly at [hello@medhyx.com](mailto:hello@medhyx.com).");
      console.error('Medhyx AI Chat Error:', err);
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }
})();
