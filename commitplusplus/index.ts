import tl = require("azure-pipelines-task-lib/task");

var systemPrompt = `The user input is a commit message and diff (output of git show <SHA>). Generate an updated commit message following the conventional commits specification. Ensure the title is maximum 50 characters and the message body is wrapped at 72 characters. Return ONLY the updated commit message - no other text. The diff may be truncated, keep this in mind.
IMPORTANT: the last line of the description should always be the following:
[commit++_signoff]`;

interface TaskInputs {
    systemPromptOverride?: string;
    projectSpecificContext?: string;
    maxTokens: number;
    recurse: boolean;
}

function getTaskInputs(): TaskInputs {
    return {
        systemPromptOverride: tl.getInput("systempromptoverride", false),
        projectSpecificContext: tl.getInput("projectspecificcontext", false),
        maxTokens: parseInt(tl.getInput("maxtokens", false) || "2000"),
        recurse: tl.getBoolInput("recurse", false),
    };
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

        console.log(systemPrompt);
        console.log(`Max tokens: ${inputs.maxTokens}`);
        console.log(`Recurse: ${inputs.recurse}`);
    } catch (err: any) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
