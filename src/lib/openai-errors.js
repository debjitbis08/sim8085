/**
 * Maps an OpenAI API failure onto a message that is safe to show a user.
 *
 * Billing and key problems are the common causes of the AI features going
 * quiet, so they get a distinct message instead of a generic failure — a blank
 * panel is indistinguishable from a bug.
 */
export function openAiErrorMessage(status, code) {
    if (code === "insufficient_quota" || status === 402) {
        return "AI features are temporarily unavailable (usage limit reached). Please try again later.";
    }
    if (status === 401 || status === 403) {
        return "AI features are misconfigured on the server. Please report this.";
    }
    if (status === 429) {
        return "AI is busy right now. Please wait a moment and try again.";
    }
    if (status >= 500) {
        return "The AI service is having trouble. Please try again in a minute.";
    }
    return "Could not get a response from the AI. Please try again.";
}

/**
 * Same as above, for errors thrown by the `openai` SDK rather than a raw fetch.
 */
export function openAiThrownErrorMessage(err) {
    return openAiErrorMessage(err?.status ?? 0, err?.code ?? err?.error?.code);
}
