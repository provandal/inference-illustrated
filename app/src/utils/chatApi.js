/**
 * Stream a chat completion from an OpenAI-compatible or Anthropic endpoint.
 * Auto-detects Anthropic based on the endpoint URL.
 *
 * @param {Object} opts
 * @param {string} opts.endpoint  - Base URL, e.g. "https://api.anthropic.com" or "https://api.openai.com/v1"
 * @param {string} opts.apiKey    - API key
 * @param {string} opts.model     - Model name, e.g. "claude-sonnet-4-5-20241022" or "gpt-4o"
 * @param {Array}  opts.messages  - Chat messages array [{role, content}, ...]
 * @param {(text: string) => void} opts.onChunk - Called with each new text fragment
 * @param {(fullText: string) => void} opts.onDone - Called when stream completes
 * @param {(errorMessage: string) => void} opts.onError - Called on failure
 * @returns {{ abort: () => void }} - Call abort() to cancel the request
 */
export function streamChat({ endpoint, apiKey, model, messages, onChunk, onDone, onError }) {
  const controller = new AbortController();
  const isAnthropic = endpoint.includes('anthropic.com');

  (async () => {
    let fullText = '';

    try {
      let url, headers, body;

      if (isAnthropic) {
        // Anthropic Messages API
        url = `${endpoint.replace(/\/+$/, '')}/v1/messages`;

        // Separate system message from conversation
        const systemMsg = messages.find((m) => m.role === 'system');
        const chatMsgs = messages.filter((m) => m.role !== 'system');

        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        };
        body = JSON.stringify({
          model,
          max_tokens: 4096,
          stream: true,
          ...(systemMsg ? { system: systemMsg.content } : {}),
          messages: chatMsgs,
        });
      } else {
        // OpenAI-compatible API
        url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
        headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        };
        body = JSON.stringify({ model, messages, stream: true });
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        if (res.status === 401) {
          onError('Authentication failed (401). Please check your API key.');
          return;
        }
        if (res.status === 429) {
          onError('Rate limited (429). Please wait a moment and try again.');
          return;
        }
        onError(`API error ${res.status}: ${errBody || res.statusText}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            onDone(fullText);
            return;
          }

          // Skip Anthropic event: lines (they precede the data: line)
          if (trimmed.startsWith('event:')) continue;

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              let content = null;

              if (isAnthropic) {
                // Anthropic streaming format
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  content = parsed.delta.text;
                }
                if (parsed.type === 'message_stop') {
                  onDone(fullText);
                  return;
                }
              } else {
                // OpenAI streaming format
                content = parsed.choices?.[0]?.delta?.content;
              }

              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch {
              // Non-JSON data line — skip silently
            }
          }
        }
      }

      onDone(fullText);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (err instanceof TypeError && err.message.includes('fetch')) {
        onError('Network error. Please check your endpoint URL and internet connection.');
      } else {
        onError(err.message || 'An unexpected error occurred.');
      }
    }
  })();

  return { abort: () => controller.abort() };
}
