import tl = require("azure-pipelines-task-lib/task");
import Anthropic from "@anthropic-ai/sdk";
import { OpenAI, AzureOpenAI } from "openai";

/**
 * Interface for AI providers that can generate commit messages
 */
export interface AIProvider {
    /**
     * Generates a commit message using the AI provider
     * @param systemPrompt - The system prompt to guide the AI's behavior
     * @param userPrompt - The user prompt containing the commit context
     * @returns A Promise that resolves to the generated commit message
     */
    generateCommitMessage(
        systemPrompt: string,
        userPrompt: string,
    ): Promise<string>;
}

/**
 * Factory class for creating AI providers
 */
export class AIProviderFactory {
    /**
     * Creates an AI provider based on the specified provider type
     * @param providerType - The type of AI provider to create ("anthropic" or "openai")
     * @returns An instance of AIProvider
     * @throws Error if the provider type is not supported
     */
    static createProvider(providerType: string): AIProvider {
        switch (providerType.toLowerCase()) {
            case "anthropic":
                return new AnthropicProvider();
            case "openai":
                return new OpenAIProvider();
            case "azure":
                return new AzureProvider();
            default:
                throw new Error(
                    `Unsupported AI provider type: ${providerType}`,
                );
        }
    }
}

class AnthropicProvider implements AIProvider {
    private readonly client: Anthropic;
    private readonly model: string;

    constructor() {
        const apiKey = tl.getInput("aiProviderKey", true);

        if (!apiKey) {
            throw new Error("Anthropic API key not provided");
        }

        this.model =
            tl.getInput("model", false) || "claude-3-5-sonnet-20241022";
        this.client = new Anthropic({ apiKey });
    }

    async generateCommitMessage(
        systemPrompt: string,
        userPrompt: string,
    ): Promise<string> {
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 1000,
            temperature: 0,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [{ type: "text", text: userPrompt }],
                },
            ],
        });

        const content = response.content[0];
        return content.type === "text" ? content.text : "";
    }
}

class OpenAIProvider implements AIProvider {
    private readonly client: OpenAI;
    private readonly model: string;

    constructor() {
        const apiKey = tl.getInput("aiProviderKey", true);
        const model = tl.getInput("model", false) || "gpt-4";
        if (!apiKey) {
            throw new Error("OpenAI API key not provided");
        }

        this.client = new OpenAI({
            apiKey,
        });
        this.model = model;
    }

    async generateCommitMessage(
        systemPrompt: string,
        userPrompt: string,
    ): Promise<string> {
        const response = await this.client.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            model: this.model,
            max_tokens: 1000,
            temperature: 0,
        });

        return response.choices[0]?.message?.content || "";
    }
}

class AzureProvider implements AIProvider {
    private readonly client: AzureOpenAI;
    private readonly model: string;

    constructor() {
        const apiKey = tl.getInput("aiProviderKey", true);
        const endpoint = tl.getInput("azendpoint", true);
        const deployment = tl.getInput("model", true) || "";
        const apiVersion =
            tl.getInput("apiVersion", false) || "2024-02-15-preview";

        if (!endpoint) {
            throw new Error("Azure OpenAI endpoint not provided");
        }

        if (deployment === "") {
            throw new Error("Azure OpenAI model not provided");
        }

        this.client = new AzureOpenAI({
            apiKey,
            deployment,
            apiVersion,
            endpoint,
        });

        this.model = deployment;
    }

    async generateCommitMessage(
        systemPrompt: string,
        userPrompt: string,
    ): Promise<string> {
        const response = await this.client.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            model: this.model,
            max_tokens: 1000,
            temperature: 0,
        });

        return response.choices[0]?.message?.content || "";
    }
}
