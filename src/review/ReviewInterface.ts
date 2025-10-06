import { diffLines, Change } from 'diff';
import chalk from 'chalk';
import prompts from 'prompts';
import { DocumentationUpdate, ReviewDecision } from '../types';
import * as fs from 'fs';

/**
 * ReviewInterface presents documentation updates to users for approval
 *
 * Provides a CLI interface with:
 * - Colored diff display
 * - Interactive approve/reject/edit prompts
 * - Decision logging for future learning
 */
export class ReviewInterface {
  private readonly logFilePath: string;
  private readonly autoApprove: boolean;

  constructor(logFilePath: string = '.doc-agent-decisions.json', autoApprove: boolean = false) {
    this.logFilePath = logFilePath;
    this.autoApprove = autoApprove;
  }

  /**
   * Present a single documentation update for review
   */
  async presentUpdate(update: DocumentationUpdate): Promise<ReviewDecision> {
    console.log('\n' + chalk.bold.cyan('='.repeat(80)));
    console.log(chalk.bold.cyan(`Documentation Update: ${update.filePath}`));
    console.log(chalk.bold.cyan('='.repeat(80)));

    // Show reasoning
    console.log('\n' + chalk.bold('Reasoning:'));
    console.log(chalk.gray(update.reasoning));

    // Show diff
    console.log('\n' + chalk.bold('Changes:'));
    this.displayDiff(update.originalContent, update.updatedContent);

    // Auto-approve if flag is set
    if (this.autoApprove) {
      console.log('\n' + chalk.green('✓ Auto-approved'));
      const decision: ReviewDecision = { action: 'approve' };
      this.logDecision(update, decision);
      return decision;
    }

    // Get user decision
    const decision = await this.promptForDecision(update);

    // Log the decision
    this.logDecision(update, decision);

    return decision;
  }

  /**
   * Present multiple updates in sequence
   */
  async presentBatch(updates: DocumentationUpdate[]): Promise<ReviewDecision[]> {
    const decisions: ReviewDecision[] = [];

    for (let i = 0; i < updates.length; i++) {
      console.log(chalk.bold.yellow(`\nReview ${i + 1} of ${updates.length}`));
      const decision = await this.presentUpdate(updates[i]);
      decisions.push(decision);

      // If user rejects, ask if they want to continue
      if (decision.action === 'reject' && i < updates.length - 1) {
        const { continueReview } = await prompts({
          type: 'confirm',
          name: 'continueReview',
          message: 'Continue reviewing remaining updates?',
          initial: true,
        });

        if (!continueReview) {
          // Fill remaining with reject decisions
          for (let j = i + 1; j < updates.length; j++) {
            decisions.push({ action: 'reject', feedback: 'Skipped by user' });
          }
          break;
        }
      }
    }

    return decisions;
  }

  /**
   * Display a colored diff between old and new content
   */
  private displayDiff(oldContent: string, newContent: string): void {
    const changes: Change[] = diffLines(oldContent, newContent);

    let lineNumber = 1;

    for (const change of changes) {
      const lines = change.value.split('\n');
      // Remove last empty line from split
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }

      for (const line of lines) {
        if (change.added) {
          console.log(chalk.green(`+ ${line}`));
        } else if (change.removed) {
          console.log(chalk.red(`- ${line}`));
        } else {
          // Show context lines in gray
          console.log(chalk.gray(`  ${line}`));
        }
        lineNumber++;
      }
    }
  }

  /**
   * Prompt user for their decision on an update
   */
  private async promptForDecision(update: DocumentationUpdate): Promise<ReviewDecision> {
    const response = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do with this update?',
      choices: [
        { title: 'Approve', value: 'approve' },
        { title: 'Reject', value: 'reject' },
        { title: 'Edit', value: 'edit' },
      ],
      initial: 0,
    });

    // Handle user cancellation (Ctrl+C)
    if (response.action === undefined) {
      return { action: 'reject', feedback: 'Cancelled by user' };
    }

    const action = response.action as 'approve' | 'reject' | 'edit';

    // If rejecting, ask for feedback
    if (action === 'reject') {
      const feedbackResponse = await prompts({
        type: 'text',
        name: 'feedback',
        message: 'Why are you rejecting this update? (optional)',
        initial: '',
      });

      return {
        action: 'reject',
        feedback: feedbackResponse.feedback || undefined,
      };
    }

    // If editing, get the edited content
    if (action === 'edit') {
      console.log(chalk.yellow('\nEnter your edited content (press Ctrl+D when done):'));
      console.log(chalk.gray('Current content:'));
      console.log(update.updatedContent);
      console.log(chalk.yellow('\n--- Enter your edits below ---'));

      // For simplicity in V1, we'll ask them to provide edited content via prompt
      // In V2, we could open an actual editor
      const editResponse = await prompts({
        type: 'text',
        name: 'editedContent',
        message: 'Paste your edited content (or press Enter to use suggested content):',
        initial: update.updatedContent,
      });

      return {
        action: 'edit',
        editedContent: editResponse.editedContent || update.updatedContent,
      };
    }

    // Approve
    return { action: 'approve' };
  }

  /**
   * Log a review decision to file for future learning
   */
  logDecision(update: DocumentationUpdate, decision: ReviewDecision): void {
    try {
      // Read existing log or create new array
      let decisions: any[] = [];
      if (fs.existsSync(this.logFilePath)) {
        const content = fs.readFileSync(this.logFilePath, 'utf-8');
        decisions = JSON.parse(content);
      }

      // Add new decision
      decisions.push({
        timestamp: new Date().toISOString(),
        filePath: update.filePath,
        action: decision.action,
        reasoning: update.reasoning,
        feedback: decision.feedback,
        hadEditedContent: !!decision.editedContent,
      });

      // Write back to file
      fs.writeFileSync(this.logFilePath, JSON.stringify(decisions, null, 2), 'utf-8');
    } catch (error) {
      // Don't fail the review process if logging fails
      console.error(chalk.yellow('Warning: Failed to log decision:'), error);
    }
  }
}
