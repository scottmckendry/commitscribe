import tl = require("azure-pipelines-task-lib/task");
import { AIProviderFactory as ai } from "./ai";
import { GitCommand } from "./git";

const systemPrompt = `The user input is a commit message and diff (output of git show <SHA>). Generate an updated commit message with imperative voice following conventional commits convention:
<type>(<optional scope>): <description>
empty separator line
<optional body>
empty separator line
<optional footer>

Ensure the title is maximum 50 characters and the message body is wrapped at 72 characters. Return ONLY the updated commit message - no other text. The diff may be truncated, keep this in mind.
IMPORTANT: the last line of the description should always be the following:
[commitscribe_signoff]`;

interface TaskInputs {
    aiProvider?: "anthropic" | "openai" | "azure";
    aiProviderKey?: string;
    model?: string;
    azEndpoint?: string;
    systemPromptOverride?: string;
    projectSpecificContext?: string;
    maxTokens: number;
    recurse: boolean;
}

function getTaskInputs(): TaskInputs {
    return {
        aiProvider: tl.getInput("aiprovider", true) as "anthropic" | "openai",
        aiProviderKey: tl.getInput("aiproviderkey", true),
        model: tl.getInput("model", false),
        azEndpoint: tl.getInput("azendpoint", false),
        systemPromptOverride: tl.getInput("systempromptoverride", false),
        projectSpecificContext: tl.getInput("projectspecificcontext", false),
        maxTokens: parseInt(tl.getInput("maxtokens", false) || "2000"),
        recurse: tl.getBoolInput("recurse", false),
    };
}

/** Truncate the prompt to a maximum number of tokens.
 * A token is defined as 4 characters (including spaces).
 * This isn't a perfect calulation, but it's good enough for this task.
 */
function truncatePrompt(prompt: string, maxTokens: number): string {
    if (prompt.length <= maxTokens * 4) {
        return prompt;
    }
    return prompt.substring(0, maxTokens * 4) + "...";
}

async function run() {
    try {
        const inputs = getTaskInputs();
        const git = new GitCommand();
        let currentSystemPrompt = inputs.systemPromptOverride || systemPrompt;

        if (inputs.projectSpecificContext) {
            currentSystemPrompt += `\nAdditional context about this project:\n\n${inputs.projectSpecificContext}`;
        }

        const commitMsg = git.getCommitMessage();
        if (commitMsg === "") {
            tl.setResult(tl.TaskResult.Succeeded, "No commit to process");
            return;
        }

        const truncatedPrompt = truncatePrompt(commitMsg, inputs.maxTokens);

        if (!inputs.aiProvider) {
            throw new Error("AI provider not specified");
        }

        const aiProvider = ai.createProvider(inputs.aiProvider);
        const updatedMsg = await aiProvider.generateCommitMessage(
            currentSystemPrompt,
            truncatedPrompt,
        );

        git.rewordCommitMessage(updatedMsg);

        if (inputs.recurse) {
            let offset = 1;
            while (true) {
                var historicCommit = git.getCommitMessage(offset);
                if (historicCommit === "") {
                    break;
                }

                // Truncate the prompt to a maximum number of tokens.
                historicCommit = truncatePrompt(
                    historicCommit,
                    inputs.maxTokens,
                );

                const updatedHistoricMsg =
                    await aiProvider.generateCommitMessage(
                        currentSystemPrompt,
                        historicCommit,
                    );

                git.rewordCommitMessage(updatedHistoricMsg, offset);
                offset++;
            }
        }

        git.forcePush();
    } catch (err: any) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
