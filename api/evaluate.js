module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5";

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        stage: "environment",
        error: "Missing OPENAI_API_KEY environment variable in Vercel."
      });
    }

    const body = req.body || {};
    const userMessage =
      body.message ||
      "Trova 5 aziende italiane nel packaging alimentare con ricavi tra 20 e 80 milioni di euro.";

    const payload = {
      model,
      input: [
        {
          role: "system",
          content:
            "You are a technical test agent. Your only job is to verify whether the DeepTree MCP server can be used through the OpenAI Responses API. Use the DeepTree MCP tool if available. If the tool is unavailable, unreachable, unauthorized, or requires authentication, explain the exact error clearly. Do not invent company names."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      tools: [
        {
          type: "mcp",
          server_label: "deeptree",
          server_description:
            "DeepTree company search and private market intelligence for Italian companies.",
          server_url: "https://mcp.deeptreeai.com/",
          require_approval: "never"
        }
      ]
    };

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await openaiResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      data = {
        raw_response: responseText
      };
    }

    return res.status(openaiResponse.status).json({
      ok: openaiResponse.ok,
      stage: "openai_responses_api",
      status: openaiResponse.status,
      statusText: openaiResponse.statusText,
      model_used: model,
      deeptree_mcp_url: "https://mcp.deeptreeai.com/",
      data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      stage: "unexpected_server_error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
