const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = themeToggle?.querySelector('.theme-toggle-icon');
const themeToggleText = themeToggle?.querySelector('.theme-toggle-text');

const conversation = [];
const themeStorageKey = 'chatbot-theme';

applyInitialTheme();

form.addEventListener('submit', handleSubmit);
themeToggle?.addEventListener('click', toggleTheme);
chatBox.addEventListener('click', handleChatBoxClick);

async function handleSubmit(event) {
  event.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) {
    return;
  }

  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });
  input.value = '';

  const thinkingMessage = appendThinkingMessage();
  setFormState(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiReply = typeof data?.result === 'string' ? cleanAiResponse(data.result) : '';

    if (!aiReply) {
      updateMessage(thinkingMessage, 'Sorry, no response received.');
      return;
    }

    updateMessage(thinkingMessage, aiReply);
    conversation.push({ role: 'model', text: aiReply });
  } catch (error) {
    updateMessage(thinkingMessage, 'Failed to get response from server.');
  } finally {
    setFormState(false);
    input.focus();
  }
}

function appendMessage(role, text) {
  const messageElement = createMessageElement(role);
  const messageText = messageElement.querySelector('.message-text');
  messageText.textContent = text;
  chatBox.appendChild(messageElement);
  scrollChatToBottom();
  return messageElement;
}

function appendThinkingMessage() {
  const messageElement = createMessageElement('bot');
  messageElement.classList.add('thinking');
  messageElement.dataset.messageText = '';

  const messageText = messageElement.querySelector('.message-text');

  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'thinking-label';
  label.textContent = 'Thinking...';

  messageText.append(spinner, label);
  chatBox.appendChild(messageElement);
  scrollChatToBottom();
  return messageElement;
}

function updateMessage(messageElement, text, options = {}) {
  const messageText = messageElement.querySelector('.message-text');

  if (messageText) {
    messageText.textContent = text;
  } else {
    messageElement.textContent = text;
  }

  messageElement.classList.remove('thinking');
  messageElement.dataset.messageText = text;

  if (options.withActions) {
    appendMessageActions(messageElement);
  }

  scrollChatToBottom();
}

function createMessageElement(role) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${role}`;

  const messageText = document.createElement('div');
  messageText.className = 'message-text';

  messageElement.appendChild(messageText);
  return messageElement;
}

function appendMessageActions(messageElement) {
  if (messageElement.querySelector('.message-actions')) {
    return;
  }

  const actions = document.createElement('div');
  actions.className = 'message-actions';

  const likeButton = createActionButton('like', 'Like response', '👍');
  const dislikeButton = createActionButton('dislike', 'Dislike response', '👎');
  const copyButton = createActionButton('copy', 'Copy response', '⧉');

  actions.append(likeButton, dislikeButton, copyButton);
  messageElement.appendChild(actions);
}

function createActionButton(action, label, icon) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'message-action';
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', 'false');
  button.textContent = icon;
  return button;
}

async function handleChatBoxClick(event) {
  const button = event.target.closest('.message-action');
  if (!button) {
    return;
  }

  const messageElement = button.closest('.message.bot');
  if (!messageElement) {
    return;
  }

  const action = button.dataset.action;

  if (action === 'copy') {
    await copyMessageText(messageElement);
    return;
  }

  setFeedbackState(messageElement, action);
}

async function copyMessageText(messageElement) {
  const text = messageElement.dataset.messageText || messageElement.querySelector('.message-text')?.textContent || '';
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const fallbackInput = document.createElement('textarea');
    fallbackInput.value = text;
    fallbackInput.setAttribute('readonly', 'readonly');
    fallbackInput.style.position = 'fixed';
    fallbackInput.style.opacity = '0';
    document.body.appendChild(fallbackInput);
    fallbackInput.select();
    document.execCommand('copy');
    document.body.removeChild(fallbackInput);
  }
}

function setFeedbackState(messageElement, action) {
  const buttons = Array.from(messageElement.querySelectorAll('.message-action[data-action="like"], .message-action[data-action="dislike"]'));
  const current = messageElement.dataset.feedback || 'none';
  const nextFeedback = current === action ? 'none' : action;

  messageElement.dataset.feedback = nextFeedback;

  buttons.forEach((button) => {
    const isActive = button.dataset.action === nextFeedback;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function cleanAiResponse(text) {
  return text
    .replace(/```[\s\S]*?```/g, (match) => match.slice(3, -3).trim())
    .replace(/(^|\n)\s{0,3}#{1,6}\s+/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|\n)\s*[-*+]\s+/g, '$1')
    .replace(/(^|\n)\s*>\s?/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function scrollChatToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setFormState(isPending) {
  input.disabled = isPending;
  form.querySelector('button[type="submit"]').disabled = isPending;
}

function applyInitialTheme() {
  const savedTheme = localStorage.getItem(themeStorageKey);
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(savedTheme || preferredTheme);
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(themeStorageKey, theme);

  if (!themeToggle || !themeToggleIcon || !themeToggleText) {
    return;
  }

  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggleIcon.textContent = isDark ? '☀' : '☾';
  themeToggleText.textContent = isDark ? 'Light' : 'Dark';
}
