import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function describeAnswers(questions, answers) {
  return questions
    .map((q) => {
      const raw = answers[q.key];
      if (raw === undefined || raw === null || raw === "") return null;
      const value = Array.isArray(raw) ? raw.join(", ") : raw;
      return `${q.label}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

export async function generateSectionContent({ guideTitle, questions, answers, section, knowledgeSources }) {
  const answerSummary = describeAnswers(questions, answers);
  const sourcesSummary = knowledgeSources.length
    ? knowledgeSources.map((s) => `- ${s.title}${s.excerpt ? `: ${s.excerpt}` : ""}`).join("\n")
    : "";

  const systemPrompt = [
    `You are writing one section of a personalized guide titled "${guideTitle}".`,
    `Write only the body content for the section "${section.title}" - do not repeat the section title, do not add a heading, do not add introductory or closing remarks outside the section's scope.`,
    `Write in plain text paragraphs (no markdown, no bullet characters unless truly listing discrete items with a leading "-").`,
    `Be specific and directly useful given the reader's actual answers below. Do not restate the questionnaire back to them.`,
    sourcesSummary ? `Ground any factual or safety-relevant claims in this reviewed reference material where relevant:\n${sourcesSummary}` : "",
  ].filter(Boolean).join("\n\n");

  const userPrompt = [
    `Reader's answers:\n${answerSummary || "(no answers provided)"}`,
    `Section guidance from the editorial team: ${section.contentRules || "Use your best judgment for this section."}`,
  ].join("\n\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}
