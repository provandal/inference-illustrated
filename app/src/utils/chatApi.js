/**
 * Stream a chat completion from any OpenAI-compatible endpoint using fetch + SSE.
 *
 * @param {Object} opts
 * @param {string} opts.endpoint  - Base URL, e.g. "https://api.openai.com/v1"
 * @param {string} opts.apiKey    - Bearer token
 * @param {string} opts.model     - Model name, e.g. "gpt-4o"
 * @param {Array}  opts.messages  - Chat messages array [{role, content}, ...]
 * @param {(text: string) => void} opts.onChunk - Called with each new text fragment
 * @param {(fullText: string) => void} opts.onDone - Called when stream completes
 * @param {(errorMessage: string) => void} opts.onError - Called on failure
 * @returns {{ abort: () => void }} - Call abort() to cancel the request
 */
export function streamChat({ endpoint, apiKey, model, messages, onChunk, onDone, onError }) {
  const controller = new AbortController();

  (async () => {
    let fullText = '';

    try {
      const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 401) {
          onError('Authentication failed (401). Please check your API key.');
          return;
        }
        if (res.status === 429) {
          onError('Rate limited (429). Please wait a moment and try again.');
          return;
        }
        onError(`API error ${res.status}: ${body || res.statusText}`);
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
        // Keep the last potentially-incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            onDone(fullText);
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
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

      // Stream ended without [DONE] marker (some providers do this)
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
