/* Resident-facing, system-grounded PowerWatch help assistant. */

(() => {
  const conversation = [];
  let sending = false;
  let panelOpen = false;

  const renderConversation = () => {
    const messages = document.getElementById('powerwatch-chat-messages');
    if (!messages) return;
    messages.replaceChildren();

    if (!conversation.length) {
      const welcome = document.createElement('p');
      welcome.className = 'powerwatch-chat-welcome';
      welcome.textContent = 'Hi! Ask me how to report or track an outage, or ask about current system information.';
      messages.append(welcome);
      return;
    }

    conversation.forEach((message) => {
      const article = document.createElement('article');
      article.className = `powerwatch-chat-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`;
      const text = document.createElement('p');
      text.textContent = message.text;
      article.append(text);

      if (message.source) {
        const source = document.createElement('small');
        source.className = 'powerwatch-chat-source';
        source.textContent = `Source: ${message.source}`;
        article.append(source);
      }

      if (message.action) {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'powerwatch-chat-action';
        action.dataset.chatbotTab = message.action.tab;
        action.textContent = message.action.label;
        article.append(action);
      }
      messages.append(article);
    });

    messages.scrollTop = messages.scrollHeight;
  };

  const setPanelOpen = (open) => {
    panelOpen = open;
    const panel = document.getElementById('powerwatch-chat-panel');
    const launcher = document.querySelector('.powerwatch-chat-launcher');
    if (panel) panel.hidden = !open;
    if (launcher) {
      launcher.setAttribute('aria-expanded', String(open));
      launcher.setAttribute('aria-label', open ? 'Close PowerWatch Assistant' : 'Ask PowerWatch Assistant');
    }
    if (open) {
      renderConversation();
      document.getElementById('powerwatch-chat-input')?.focus();
    }
  };

  const requestAnswer = async (question) => {
    if (sending) return;
    sending = true;
    conversation.push({ role: 'user', text: question });
    conversation.push({ role: 'assistant', text: 'Checking the help guide and current system records…' });
    renderConversation();
    document.querySelectorAll('.powerwatch-chat-form button').forEach((button) => {
      button.disabled = true;
    });

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(response.status === 401
          ? 'Your session has expired. Sign in again to use the assistant.'
          : result.error || 'The assistant could not answer right now.');
      }
      conversation[conversation.length - 1] = {
        role: 'assistant',
        text: result.answer,
        source: result.source,
        action: result.action || null,
      };
    } catch (error) {
      conversation[conversation.length - 1] = {
        role: 'assistant',
        text: error.message || 'The assistant could not connect. Please try again when you are online.',
      };
    } finally {
      sending = false;
      renderConversation();
      document.querySelectorAll('.powerwatch-chat-form button').forEach((button) => {
        button.disabled = false;
      });
    }
  };

  document.addEventListener('powerwatch:portal-rendered', () => {
    const panel = document.getElementById('powerwatch-chat-panel');
    if (!panel) return;
    panel.hidden = !panelOpen;
    renderConversation();
  });

  document.addEventListener('click', (event) => {
    const prompt = event.target.closest('[data-chatbot-prompt]');
    if (prompt) {
      const question = prompt.dataset.chatbotPrompt;
      setPanelOpen(true);
      void requestAnswer(question);
      return;
    }

    const navigation = event.target.closest('[data-chatbot-tab]');
    if (navigation) {
      setPanelOpen(false);
      if (typeof goToTab === 'function') void goToTab(navigation.dataset.chatbotTab);
      return;
    }

    const control = event.target.closest('[data-chatbot-action]');
    if (!control) return;
    setPanelOpen(control.dataset.chatbotAction === 'toggle' ? !panelOpen : false);
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'powerwatch-chat-form') return;
    event.preventDefault();
    const input = event.target.elements.question;
    const question = String(input.value || '').trim();
    if (!question || sending) return;
    input.value = '';
    void requestAnswer(question);
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.id === 'powerwatch-chat-input' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.target.form.requestSubmit();
    }
    if (event.key === 'Escape' && panelOpen) setPanelOpen(false);
  });
})();
