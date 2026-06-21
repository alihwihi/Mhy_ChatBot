const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

const conversation = [];

form.addEventListener('submit', handleSubmit);

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
  const messageElement = document.createElement('div');
  messageElement.className = `message ${role}`;
  messageElement.textContent = text;
  chatBox.appendChild(messageElement);
  scrollChatToBottom();
  return messageElement;
}

function appendThinkingMessage() {
  const messageElement = document.createElement('div');
  messageElement.className = 'message bot thinking';

  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'thinking-label';
  label.textContent = 'Thinking...';

  messageElement.append(spinner, label);
  chatBox.appendChild(messageElement);
  scrollChatToBottom();
  return messageElement;
}

function updateMessage(messageElement, text) {
  messageElement.textContent = text;
  scrollChatToBottom();
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
