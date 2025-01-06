# ✍️ CommitScribe - AI-Powered Commit Message Rewriting

CommitScribe is an Azure DevOps pipeline task that uses AI to automatically format and describe your commits. It supports multiple AI providers, including OpenAI, Anthropic, and Azure OpenAI.

The commit message and git diff are passed to the AI provider, which generates a new commit message based on the provided context. The new commit message is then used to update the commit message in the repository.

## 📦 Setup

1. Install the extension from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ScottMcKendry.commitscribe)
2. Configure your AI provider credentials:
    - Create a pipeline variable or variable group with your AI provider API key
    - Mark the variable as secret

## 📋 Prerequisites

1. Ensure your pipeline has a checkout step with `persistCredentials` enabled:

```yaml
steps:
    - checkout: self
      persistCredentials: true
```

2. Grant repository permissions:
    - For Azure Repos: Grant the build service account 'Contribute' permissions
    - For GitHub repos: Configure GitHub service connection with write permissions
    - For other Git providers: Ensure the pipeline's service account has write access

## 🛠️ Basic Usage

Add the task to your pipeline:

```yaml
steps:
    - checkout: self
      persistCredentials: true
    - task: commitscribe@0
      inputs:
          aiprovider: "openai" # Options: openai, anthropic, azure
          aiproviderkey: "$(YOUR_API_KEY)"
```

## ⚙️ Configuration Options

| Input                    | Required | Default           | Description                                                                 |
| ------------------------ | -------- | ----------------- | --------------------------------------------------------------------------- |
| `aiprovider`             | Yes      | `openai`          | AI provider (OpenAI, Anthropic, or Azure OpenAI)                            |
| `aiproviderkey`          | Yes      | -                 | API key for the selected provider                                           |
| `model`                  | No       | Provider-specific | Model to use (`gpt-4` for OpenAI, `claude-3-sonnet-20240229` for Anthropic) |
| `azendpoint`             | No\*     | -                 | Azure OpenAI endpoint URL (\*Required for Azure)                            |
| `systempromptoverride`   | No       | -                 | Override the default system prompt                                          |
| `projectspecificcontext` | No       | -                 | Additional project context for better results                               |
| `maxtokens`              | No       | 2000              | Maximum tokens for API requests                                             |
| `recurse`                | No       | false             | Process commits recursively until [commit++_signoff]                        |

> [!WARNING]
> The `recurse` flag will parse your entire commit history and rewrite every commit message until it finds a commit message that contains `[commit++_signoff]`. This is useful for updating commit messages in bulk, but it can be dangerous if you're not careful. Use with caution!

### 🪄 Examples

#### OpenAI Configuration

```yaml
- task: commitscribe@0
  inputs:
      aiprovider: "openai"
      aiproviderkey: "$(OPENAI_API_KEY)"
      model: "gpt-4"
```

#### Anthropic Configuration

```yaml
- task: commitscribe@0
  inputs:
      aiprovider: "anthropic"
      aiproviderkey: "$(ANTHROPIC_API_KEY)"
      model: "claude-3-sonnet-20240229"
```

#### Azure OpenAI Configuration

```yaml
- task: commitscribe@0
  inputs:
      aiprovider: "azure"
      aiproviderkey: "$(AZURE_OPENAI_KEY)"
      azendpoint: "https://your-resource.openai.azure.com/"
      model: "your-deployment-name"
```

## ✅ Best Practices

1. Always store API keys as secret variables
2. Use `projectspecificcontext` to provide domain-specific knowledge
3. Set appropriate `maxtokens` for your commit message size

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.
