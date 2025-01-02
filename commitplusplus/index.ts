import tl = require("azure-pipelines-task-lib/task");
import { AIProviderFactory as ai } from "./ai";

var systemPrompt = `The user input is a commit message and diff (output of git show <SHA>). Generate an updated commit message following the conventional commits specification. Ensure the title is maximum 50 characters and the message body is wrapped at 72 characters. Return ONLY the updated commit message - no other text. The diff may be truncated, keep this in mind.
IMPORTANT: the last line of the description should always be the following:
[commit++_signoff]`;

interface TaskInputs {
    aiProvider?: "anthropic" | "openai";
    aiProviderKey?: string;
    systemPromptOverride?: string;
    projectSpecificContext?: string;
    maxTokens: number;
    recurse: boolean;
}

function getTaskInputs(): TaskInputs {
    return {
        aiProvider: tl.getInput("aiprovider", true) as "anthropic" | "openai",
        aiProviderKey: tl.getInput("aiproviderkey", true),
        systemPromptOverride: tl.getInput("systempromptoverride", false),
        projectSpecificContext: tl.getInput("projectspecificcontext", false),
        maxTokens: parseInt(tl.getInput("maxtokens", false) || "2000"),
        recurse: tl.getBoolInput("recurse", false),
    };
}

/** Check if a tool is installed and return the path to it
 * @param toolName The name of the tool to check
 * @returns The path to the tool
 */
function checkTool(toolName: string): string {
    const toolPath = tl.which(toolName, true);
    if (!toolPath) {
        const error = `${toolName} is not installed or not found in PATH`;
        tl.setResult(tl.TaskResult.Failed, error);
        throw new Error(error);
    }
    return toolPath;
}

/** Get the commit message & diff from a given offset from HEAD
 * @param offset The number of commits to go back from HEAD
 * @returns The commit message & diff as a string
 */
function getCommitMessage(offset = 0): string {
    const gitPath = checkTool("git");
    var g = tl.tool(gitPath);
    var output: string;

    // Check if the commit message is empty or contains an error or if the signoff is already present
    g.arg(["log", "-1", "--pretty=format:%B", `HEAD~${offset}`]);
    try {
        output = g.execSync({ silent: true }).stdout || "";
        if (
            output === "" ||
            output.includes("fatal:") ||
            output.includes("error:")
        ) {
            tl.warning("No commit message found for HEAD~" + offset);
            return "";
        }

        if (output.includes("[commit++_signoff]")) {
            return "";
        }
    } catch (err: any) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        throw err;
    }

    g = tl.tool(gitPath);
    g.arg(["show", `HEAD~${offset}`]);
    try {
        const output = g.execSync({ silent: true });
        return output.stdout || "";
    } catch (err: any) {
        tl.setResult(tl.TaskResult.Failed, err.message);
        throw err;
    }
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

        if (inputs.systemPromptOverride) {
            systemPrompt = inputs.systemPromptOverride;
        }

        if (inputs.projectSpecificContext) {
            systemPrompt += `\nAdditional context about this project:\n\n${inputs.projectSpecificContext}`;
        }

        var userPrompt = getCommitMessage();
        if (userPrompt === "") {
            tl.setResult(tl.TaskResult.Succeeded, "No commit to process");
            return;
        }

        userPrompt = truncatePrompt(userPrompt, inputs.maxTokens);

        if (!inputs.aiProvider) {
            throw new Error("AI provider not specified");
        }

        const aiProvider = ai.createProvider(inputs.aiProvider);
        console.log(
            await aiProvider.generateCommitMessage(systemPrompt, userPrompt),
        );

        // TODO: apply reworded commit message to the commit & push it

        if (inputs.recurse) {
            // Recurse back through the commit history until we find a commit without a signoff
            var offset = 1;
            while (true) {
                var commitMessage = getCommitMessage(offset);
                if (commitMessage === "") {
                    break;
                }
                // TODO: call the API to generate the updated commit message
                offset++;
            }
        }
    } catch (err: any) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
