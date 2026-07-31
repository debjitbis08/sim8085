import type { APIRoute } from "astro";
import { OPENAI_API_KEY } from "astro:env/server";
import OpenAI from "openai";
import { getUserFromRequest } from "../../../lib/supabase-server.js";
import { openAiThrownErrorMessage } from "../../../lib/openai-errors.js";

export const prerender = false;

// Full step generation gets the stronger model; hints and interface questions
// are a sentence or two and do not need it.
const REASONING_MODEL = "gpt-5.5";
const FAST_MODEL = "gpt-4.1-mini";

const FAST_MODES = new Set(["hint", "instructionHint", "explain", "stuck"]);

// User-supplied text goes straight into the prompt, so bound it.
const MAX_PROBLEM_CHARS = 2_000;
const MAX_CODE_CHARS = 8_000;

// The seed article is an expensive file_search call whose only use is as
// conversation context, and it depends solely on the problem text — so reuse it
// across tutorials on the same problem. Per-instance and ephemeral on Netlify,
// same as any module-level cache here; a miss just costs what it costs today.
const articleResponseIds = new Map<string, string>();
const MAX_CACHED_ARTICLES = 200;

const INSTRUCTIONS = `
    You are a helpful 8085 programming tutor guiding the student step by step.
    Refer the article at the beginning to guide your instructions.
    Use it to verify the student's progress, generate correct next steps, and provide context-aware hints.

    Each step should be conceptually clear and brief and contain minimal code.
    At each step review the current code and provide guidance. Jump ahead or slow down based on progress determined from code.
    Provide the instructions in bullet points.
    Use 8085-specific terms: registers, flags, memory locations.
    Include a way to test the step in Sim8085 (e.g., register view, OUT instruction, timing mode).
    Keep the instructions low level and idiot proof.

    Wait for the student to confirm or complete a step before continuing.
    Do not reference future steps or the complete solution unless explicitly requested.
    When all steps are done, say: "Tutorial complete. No more steps.
`;

const GENERAL_HELP_INSTRUCTIONS = `
    You are helping with Sim8085 interface and general usage questions.
    Be concise, actionable, and avoid step-by-step program tutorials or code.
    If the question is not about using Sim8085, say this tutor is for step-by-step 8085 programming and suggest using the help/docs.
    End your response with: "Tutorial complete. No more steps."
`;

const INTERFACE_KEYWORDS = [
    "sim8085",
    "simulator",
    "interface",
    "ui",
    "app",
    "website",
    "tab",
    "panel",
    "toolbar",
    "menu",
    "button",
    "editor",
    "settings",
    "theme",
    "account",
    "login",
    "signup",
    "subscription",
    "plus",
    "ads",
    "register view",
    "memory view",
    "timing mode",
    "run",
    "assemble",
    "load",
    "save",
];

const PROGRAM_KEYWORDS = [
    "8085",
    "assembly",
    "alp",
    "program",
    "routine",
    "register",
    "memory",
    "flag",
    "stack",
    "loop",
    "counter",
    "addition",
    "subtraction",
    "multiply",
    "division",
    "sort",
    "search",
    "array",
    "string",
    "bcd",
    "hex",
    "carry",
];

const isGeneralHelpRequest = (problem: string) => {
    const normalized = problem.toLowerCase();
    const hasInterface = INTERFACE_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const hasProgram = PROGRAM_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const generalPhrases = [
        "how do i",
        "how to",
        "where is",
        "where do i",
        "can't",
        "cannot",
        "doesn't work",
        "not working",
    ];
    const hasGeneralPhrase = generalPhrases.some((phrase) => normalized.includes(phrase));
    return (hasInterface || hasGeneralPhrase) && !hasProgram;
};

const ARTICLE_INSTRUCTIONS = `
### ✅ Prompt: Create a Step-by-Step 8085 Tutorial

**Goal:**
Write a tutorial for an 8085 assembly program that helps students not just reach the correct result, but understand the reasoning behind every line. The tutorial should walk through the problem **step-by-step**, with a strong emphasis on **interface design**, **incremental construction**, and **practical insights** into programming and software thinking.
The final program should be simple and efficient.

---

### 🧱 Tutorial Structure

Each tutorial should follow this structure:

1. **Frontmatter** (title, description)
2. **Problem Definition** (describe the task in plain language)
3. **Step-by-Step Construction**, where each step includes:

   * What we're doing in this step
   * Why we're doing it (software design reasoning)
   * Code for that step only
   * Manual test instructions
   * Any new concepts introduced (e.g., flags, loops, pointers)
4. **Refactor and Clean Up** (final code with comments, naming, and readability improvements)
5. **TL;DR** (final version of the code with just enough context to make it runnable and understandable)
6. **Summary** (lessons learned, programming principles reinforced)

---

### 🎓 Philosophy to Follow

* **Emphasize Interface Design First**
  Every problem begins with asking: *how will this code interact with the outside world?*

* **Treat Code as Communication**
  Use comments that explain intent, not just syntax. Name constants and memory locations meaningfully.

* **Build Like a Software Engineer**
  At each step, explain *not just what* is being added, but *why* — drawing from principles of modular design, testability, and clarity.

* **Progress is Incremental**
  Every step should result in a testable unit. Students should see the program grow line by line, building intuition along the way.

* **No Hidden Jumps**
  Avoid dropping full programs upfront. Let the final version emerge at the end as a natural conclusion of the previous steps.
`;

export const GET: APIRoute = async ({ request, url }) => {
    const encoder = new TextEncoder();

    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const stepNum = parseInt(url.searchParams.get("step") || "1", 10);
    const mode = url.searchParams.get("mode") || "generate";
    const conversationId = url.searchParams.get("conversationId") || null;
    const previousResponseId = url.searchParams.get("previousResponseId") || null;
    const currentCode = (url.searchParams.get("currentCode") || "").slice(0, MAX_CODE_CHARS);
    const problem = (url.searchParams.get("problem") || "").slice(0, MAX_PROBLEM_CHARS);
    const isGeneralHelp = isGeneralHelpRequest(problem);

    if (!OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: "OpenAI not configured" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!problem) {
        return new Response(JSON.stringify({ error: "Problem is not defined" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

        const promptMap = {
            generate: `Please help me with step ${stepNum} of the tutorial in 2-4 short sentences. Please provide low level instructions. No code.`,
            hint: `Give a little more details in a **single-sentence hint** for step ${stepNum}. Do NOT repeat the step or explain it. Avoid using the word 'step'.`,
            instructionHint: `Briefly explain what 8085 instructions the user is expected to use in step ${stepNum}. Do NOT solve it.`,
            explain: `Explain the reasoning behind step ${stepNum}. Avoid giving away full implementation.`,
            stuck: `I am stuck. Please check my current code and let me know the way forward. Do not provide full code, only guidance.`,
        };
        const prompt = isGeneralHelp
            ? `General help request about Sim8085/interface:\n${problem}\n\nRespond in 2-6 short sentences with actionable guidance.`
            : `Problem I am trying to solve:\n${problem}\n\n${promptMap[mode] || promptMap.generate}\n\nMy code till now:\n${currentCode}`;

        let seedResponseId: string | null = null;
        if (!previousResponseId && !isGeneralHelp) {
            const cacheKey = problem.trim().toLowerCase();
            seedResponseId = articleResponseIds.get(cacheKey) ?? null;

            if (!seedResponseId) {
                const internalResponse = await openai.responses.create({
                    model: REASONING_MODEL,
                    instructions: ARTICLE_INSTRUCTIONS,
                    input: `Write and article for the problem: "${problem}".`,
                    tools: [
                        {
                            type: "file_search",
                            vector_store_ids: [
                                "vs_685fc63cec708191b08a5113e9231a0f",
                                "vs_685e9a397ca48191b926b950e9da3881",
                            ],
                        },
                    ],
                });
                seedResponseId = internalResponse.id;

                if (articleResponseIds.size >= MAX_CACHED_ARTICLES) {
                    articleResponseIds.delete(articleResponseIds.keys().next().value as string);
                }
                articleResponseIds.set(cacheKey, seedResponseId);
            }
        }

        const responseStream = await openai.responses.create({
            model: isGeneralHelp || FAST_MODES.has(mode) ? FAST_MODEL : REASONING_MODEL,
            ...(!isGeneralHelp && stepNum === 1 ? { instructions: INSTRUCTIONS } : {}),
            ...(isGeneralHelp ? { instructions: GENERAL_HELP_INSTRUCTIONS } : {}),
            input: prompt,
            stream: true,
            ...(previousResponseId
                ? { previous_response_id: previousResponseId }
                : seedResponseId
                  ? { previous_response_id: seedResponseId }
                  : {}),
            // tools: [
            //     {
            //         type: "file_search",
            //         vector_store_ids: ["vs_685e9a397ca48191b926b950e9da3881"],
            //     },
            // ],
        });

        let newResponseId: string | null = null;

        const stream = new ReadableStream({
            async start(controller) {
                for await (const part of responseStream) {
                    if (part.type === "response.created") {
                        newResponseId = part.response.id;
                    }

                    if (part.type === "response.output_text.delta") {
                        const text = part.delta ?? "";
                        const lines = text.split("\n");
                        for (const line of lines) {
                            controller.enqueue(encoder.encode(`data: ${line}\n`));
                        }
                        controller.enqueue(encoder.encode("\n")); // marks end of message
                    }
                }

                if (newResponseId) {
                    controller.enqueue(encoder.encode(`event: responseId\ndata: ${newResponseId}\n\n`));
                }

                controller.enqueue(encoder.encode("event: done\ndata: [DONE]\n\n"));
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (err) {
        console.error("Streaming error:", err);

        // EventSource cannot read the body of a non-2xx response, so the reason
        // has to travel as an SSE event or the client only ever sees "failed".
        const message = openAiThrownErrorMessage(err);
        const body = `event: apiError\ndata: ${message}\n\nevent: done\ndata: [DONE]\n\n`;
        return new Response(encoder.encode(body), {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }
};
