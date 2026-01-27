import type { APIRoute } from "astro";
import { OPENAI_API_KEY } from "astro:env/server";
import OpenAI from "openai";
import { getUserFromRequest } from "../../../lib/supabase-server.js";

export const prerender = false;

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
    const currentCode = url.searchParams.get("currentCode") || "";
    const problem = url.searchParams.get("problem") || "";

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
        const prompt = `Problem I am trying to solve:\n${problem}\n\n${promptMap[mode] || promptMap.generate}\n\nMy code till now:\n${currentCode}`;

        let internalResponse;
        if (!previousResponseId) {
            internalResponse = await openai.responses.create({
                model: "gpt-4.1",
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
            console.log(internalResponse.output_text);
        }

        const responseStream = await openai.responses.create({
            model: "gpt-4o",
            ...(stepNum === 1 ? { instructions: INSTRUCTIONS } : {}),
            input: prompt,
            stream: true,
            ...(previousResponseId
                ? { previous_response_id: previousResponseId }
                : internalResponse != null
                  ? { previous_response_id: internalResponse.id }
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
        return new Response(JSON.stringify({ error: "Failed to stream step" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
