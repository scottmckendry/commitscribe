# ✍️ CommitScribe - AI-Powered Commit Message Rewriting

CommitScribe is an Azure DevOps pipeline task that uses AI to automatically format and describe your commits. It supports multiple AI providers, including OpenAI, Anthropic, and Azure OpenAI.

The commit message and git diff are passed to the AI provider, which generates a new commit message based on the provided context. The new commit message is then used to update the commit message in the repository.

## 📦 Setup

1. Install the extension from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ScottMcKendry.commitscribe)
2. Configure your AI provider credentials:
    - Create a pipeline variable or variable group with your AI provider API key
    - Mark the variable as secret

## 📋 Prerequisites

1. Ensure your pipeline has a checkout step with `persistCredentials` enabled & `fetchDepth` set to `0`:

```yaml
steps:
    - checkout: self
      fetchDepth: "0"
      persistCredentials: true
```

2. Configure Git identity in your pipeline before the CommitScribe task:

```yaml
steps:
    - script: |
          git config --global user.email "azure-pipelines@example.com"
          git config --global user.name "Azure Pipelines"
      displayName: "Configure Git"
```

3. Grant repository permissions:
    - For Azure Repos: Grant the build service account 'Contribute' & 'Force Push' permissions.
    - For GitHub repos: Configure GitHub service connection with write permissions
    - For other Git providers: Ensure the pipeline's service account has write access

> [!NOTE]
>
> **Why is force push required?**
>
> CommitScribe rewrites history. Use of the `--force` flag is necessary to persist updated commit messages in the target branch.
> This is a destructive operation, so use with caution! For more information, see [Git's documentation on rewriting history](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History).

## 🛠️ Basic Usage

Add the task to your pipeline:

```yaml
steps:
    - checkout: self
      fetchDepth: "0"
      persistCredentials: true
    - script: |
          git config --global user.email "azure-pipelines@example.com"
          git config --global user.name "Azure Pipelines"
      displayName: "Configure Git"
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
| `projectspecificcontext` | No (Deprecated) | -          | Deprecated: legacy combined field. Prefer `projectcontexttext` / `projectcontextfile`. |
| `projectcontexttext` | No | - | Inline additional project context text (multi-line). |
| `projectcontextfile` | No | - | Path to a text/markdown file whose contents are appended as project context. |
| `maxtokens`              | No       | 2000              | Maximum tokens for API requests                                             |
| `recurse`                | No       | false             | Process commits recursively until [commitscribe_signoff]                    |

> [!WARNING]
> The `recurse` flag will parse your entire commit history and rewrite every commit message until it finds a commit message that contains `[commitscribe_signoff]`. This is useful for updating commit messages in bulk, but it can be dangerous if you're not careful. Use with caution!

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
2. Use `projectspecificcontext` to provide domain-specific knowledge. This value may be:
   - Inline text (short descriptions, architectural notes)
   - A relative or absolute path to a text/markdown file (e.g. `context.md`, `docs/domain/overview.txt`)
   If a readable file exists at the provided path, its contents are inlined automatically. Otherwise, the value is treated as raw text.
3. Set appropriate `maxtokens` for your commit message size

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.
