interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
}

function getAIConfig(): AIConfig {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const apiKey = process.env.AI_API_KEY || '';
  
  // Choose sensible default model names if none provided
  let model = process.env.AI_MODEL || '';
  if (!model) {
    if (provider.toLowerCase() === 'gemini') {
      model = 'gemini-1.5-flash';
    } else {
      model = 'gpt-4o-mini';
    }
  }

  return { provider, model, apiKey };
}

export async function callLLM(prompt: string, responseJson = false): Promise<string> {
  const { provider, model, apiKey } = getAIConfig();

  if (!apiKey) {
    throw new Error(`AI_API_KEY is not defined in environment variables for provider: ${provider}`);
  }

  const normalizedProvider = provider.toLowerCase();

  if (normalizedProvider === 'gemini') {
    return callGemini(model, apiKey, prompt, responseJson);
  } else if (normalizedProvider === 'openai') {
    return callOpenAI(model, apiKey, prompt, responseJson);
  } else {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}. Supported options are 'gemini' or 'openai'.`);
  }
}

async function callGemini(model: string, apiKey: string, prompt: string, responseJson: boolean): Promise<string> {
  // standard endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  if (responseJson) {
    payload.generationConfig = {
      responseMimeType: 'application/json',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response received from Gemini API');
  }

  return text;
}

async function callOpenAI(model: string, apiKey: string, prompt: string, responseJson: boolean): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const payload: any = {
    model: model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  if (responseJson) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response received from OpenAI API');
  }

  return text;
}
