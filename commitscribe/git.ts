import tl = require("azure-pipelines-task-lib/task");

export class GitCommand {
    private readonly gitPath: string;

    constructor() {
        this.gitPath = this.checkTool("git");
    }

    /**
     * Checks if a tool is available in the system PATH
     * @param toolName - The name of the tool to check
     * @returns The path to the tool
     * @throws Error if the tool is not found
     */
    private checkTool(toolName: string): string {
        const toolPath = tl.which(toolName, true);
        if (!toolPath) {
            const error = `${toolName} is not installed or not found in PATH`;
            tl.setResult(tl.TaskResult.Failed, error);
            throw new Error(error);
        }
        return toolPath;
    }

    /**
     * Executes a git command with the given arguments
     * @param args - Array of command arguments
     * @param silent - Whether to suppress command output
     * @returns The command execution result
     * @throws Error if the command execution fails
     */
    private execute(args: string[], silent = true): { stdout: string } {
        const git = tl.tool(this.gitPath);
        git.arg(args);
        try {
            return git.execSync({ silent });
        } catch (err: any) {
            tl.setResult(tl.TaskResult.Failed, err.message);
            throw err;
        }
    }

    /**
     * Retrieves the commit message for a given commit offset
     * @param offset - Number of commits to look back from HEAD
     * @returns The commit message or empty string if not found
     */
    public getCommitMessage(offset = 0): string {
        const message =
            this.execute(["log", "-1", "--pretty=format:%B", `HEAD~${offset}`])
                .stdout || "";

        if (
            message === "" ||
            message.includes("fatal:") ||
            message.includes("error:")
        ) {
            tl.warning("No commit message found for HEAD~" + offset);
            return "";
        }

        if (message.includes("[commitscribe_signoff]")) {
            return "";
        }

        return this.execute(["show", `HEAD~${offset}`]).stdout || "";
    }

    /**
     * Gets the SHA hash of a commit at a given offset
     * @param offset - Number of commits to look back from HEAD
     * @returns The commit SHA or empty string if not found
     */
    public getCommitSha(offset = 0): string {
        return (
            this.execute(["rev-parse", `HEAD~${offset}`]).stdout.trim() || ""
        );
    }

    /**
     * Rewords the commit message of a specific commit
     * @param newMessage - The new commit message
     * @param offset - Number of commits to look back from HEAD
     * @throws Error if the reword operation fails
     */
    public rewordCommitMessage(newMessage: string, offset = 0): void {
        if (offset === 0) {
            this.execute(["commit", "--amend", "-m", newMessage], false);
            return;
        }

        const currentBranch = this.execute([
            "rev-parse",
            "--abbrev-ref",
            "HEAD",
        ]).stdout.trim();

        const sha = this.getCommitSha(offset);
        const tempBranch = `reword-${currentBranch}`;

        // Create temporary branch
        this.execute(["checkout", sha, "-b", tempBranch], false);

        // Amend commit
        this.execute(["commit", "--amend", "-m", newMessage], false);

        // Rebase current branch
        this.execute(
            ["rebase", "--onto", tempBranch, "HEAD", currentBranch],
            false,
        );

        // Cleanup
        this.execute(["branch", "-D", tempBranch], false);
    }

    /**
     * Pushes the current branch to the remote repository. A force push is always required when rewriting history.
     */
    public forcePush(): void {
        const sourceBranch = tl.getVariable("Build.SourceBranch");
        if (!sourceBranch) {
            this.execute(["push", "--force"], false);
            return;
        }

        const branchName = sourceBranch.replace("refs/heads/", "");
        this.execute(
            ["push", "--force", "origin", `HEAD:${branchName}`],
            false,
        );
    }
}
