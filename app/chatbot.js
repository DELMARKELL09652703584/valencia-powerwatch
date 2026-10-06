/* Resident-facing, system-grounded PowerWatch help assistant. */

(() => {
  const conversation = [];
  const POSITION_KEY = 'powerwatch-chat-position';
  let sending = false;
  let panelOpen = false;
  let dragState = null;
  let suppressLauncherClick = false;

  const launcherMargins = () => ({
    left: 12,
    top: 12,
    right: 12,
    bottom: window.innerWidth <= 780 ? 88 : 16,
  });

  const clampLauncher = (left, top, launcher) => {
    const margins = launcherMargins();
    return {
      left: Math.max(margins.left, Math.min(left, window.innerWidth - launcher.offsetWidth - margins.right)),
      top: Math.max(margins.top, Math.min(top, window.innerHeight - launcher.offsetHeight - margins.bottom)),
    };
  };

  const placeLauncher = (left, top, launcher) => {
    const position = clampLauncher(left, top, launcher);
    const container = document.getElementById('powerwatch-chatbot');
    if (!container) return;
    container.style.left = `${position.left}px`;
    container.style.top = `${position.top}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    return position;
  };

  const updatePanelPlacement = () => {
    const container = document.getElementById('powerwatch-chatbot');
    const launcher = container?.querySelector('.powerwatch-chat-launcher');
    if (!container || !launcher) return;

    const rect = launcher.getBoundingClientRect();
    const panelWidth = Math.min(370, window.innerWidth - 24);
    const roomBelow = window.innerHeight - rect.bottom;
    const roomAbove = rect.top;
    container.dataset.panelSide = roomBelow >= Math.min(570, window.innerHeight - 24) || roomBelow >= roomAbove
      ? 'below'
      : 'above';
    container.dataset.panelAlign = rect.left + rect.width / 2 < window.innerWidth / 2
      ? 'left'
      : 'right';
    container.style.setProperty('--chat-panel-width', `${panelWidth}px`);
  };

  const restoreLauncherPosition = () => {
    const launcher = document.querySelector('.powerwatch-chat-launcher');
    const container = document.getElementById('powerwatch-chatbot');
    if (!launcher || !container) return;

    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(POSITION_KEY));
    } catch {
      saved = null;
    }

    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      const maxLeft = Math.max(12, window.innerWidth - launcher.offsetWidth - 12);
      const maxTop = Math.max(12, window.innerHeight - launcher.offsetHeight - launcherMargins().bottom);
      placeLauncher(saved.x * maxLeft, saved.y * maxTop, launcher);
    }
    updatePanelPlacement();
  };

  const saveLauncherPosition = (launcher) => {
    const container = document.getElementById('powerwatch-chatbot');
    if (!container) return;
    const rect = launcher.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - launcher.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - launcher.offsetHeight - launcherMargins().bottom);
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({
        x: Math.min(1, Math.max(0, rect.left / maxLeft)),
        y: Math.min(1, Math.max(0, rect.top / maxTop)),
      }));
    } catch {
      // Dragging still works when browser storage is unavailable.
    }
  };

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
    restoreLauncherPosition();
  });

  document.addEventListener('pointerdown', (event) => {
    const launcher = event.target.closest('.powerwatch-chat-launcher');
    if (!launcher || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rect = launcher.getBoundingClientRect();
    dragState = {
      launcher,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    launcher.setPointerCapture(event.pointerId);
  });

  document.addEventListener('pointermove', (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(deltaX, deltaY) < 6) return;
    dragState.moved = true;
    suppressLauncherClick = true;
    dragState.launcher.classList.add('is-dragging');
    event.preventDefault();
    placeLauncher(dragState.left + deltaX, dragState.top + deltaY, dragState.launcher);
    updatePanelPlacement();
  });

  const finishDragging = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const { launcher, moved } = dragState;
    if (moved) {
      saveLauncherPosition(launcher);
      updatePanelPlacement();
    }
    launcher.classList.remove('is-dragging');
    dragState = null;
    if (moved) window.setTimeout(() => { suppressLauncherClick = false; }, 500);
  };

  document.addEventListener('pointerup', finishDragging);
  document.addEventListener('pointercancel', finishDragging);
  window.addEventListener('resize', restoreLauncherPosition);

  document.addEventListener('click', (event) => {
    if (suppressLauncherClick && event.target.closest('.powerwatch-chat-launcher')) {
      event.preventDefault();
      event.stopPropagation();
      suppressLauncherClick = false;
      return;
    }

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
