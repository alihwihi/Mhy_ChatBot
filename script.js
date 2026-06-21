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

  const thinkingMessage = appendMessage('bot', 'Thinking...');
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
    const aiReply = typeof data?.result === 'string' ? data.result.trim() : '';

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

function updateMessage(messageElement, text) {
  messageElement.textContent = text;
  scrollChatToBottom();
}

function scrollChatToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setFormState(isPending) {
  input.disabled = isPending;
  form.querySelector('button[type="submit"]').disabled = isPending;
}
