const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// POST /api/ai/import — cola um texto e recebe de volta uma lista estruturada
// de tarefas/specs sugeridas. Substitui a Cloud Function "claudeProxy" do
// sistema original: aqui a chamada é feita direto do backend, então a chave
// da API nunca chega ao navegador.
router.post("/import", async (req, res) => {
  const { texto, tipo } = req.body || {};
  if (!texto) return res.status(400).json({ error: "Envie o texto a ser interpretado." });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(501).json({ error: "ANTHROPIC_API_KEY não configurada neste ambiente." });
  }

  const prompt = `Extraia do texto abaixo uma lista de ${tipo === "specs" ? "especificações" : "tarefas"} de projeto.
Responda APENAS com um JSON no formato {"itens": [{"nome": "...", "responsavel": "", "prazo": ""}]}.

Texto:
"""${texto}"""`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(502).json({ error: "Falha ao consultar a IA.", detail });
    }

    const data = await resp.json();
    const text = data?.content?.[0]?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { itens: [], raw: text };
    }
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: "Erro ao chamar a API da IA.", detail: e.message });
  }
});

module.exports = router;
