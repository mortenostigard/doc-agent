import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ReviewInterface } from './ReviewInterface';
import { DocumentationUpdate } from '../types';
import * as fs from 'fs';

// Mock prompts module
vi.mock('prompts', () => ({
  default: vi.fn(),
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Import the mocked prompts after mocking
import prompts from 'prompts';

describe('ReviewInterface', () => {
  let reviewInterface: ReviewInterface;
  const mockLogPath = '.test-decisions.json';

  const createMockUpdate = (overrides?: Partial<DocumentationUpdate>): DocumentationUpdate => ({
    filePath: 'docs/api.md',
    originalContent: '# API\n\nOld content here.',
    updatedContent: '# API\n\nNew content here.',
    changes: [],
    reasoning: 'Updated to reflect API changes',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    reviewInterface = new ReviewInterface(mockLogPath);

    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('presentUpdate', () => {
    it('should return approve decision when user approves', async () => {
      const mockUpdate = createMockUpdate();

      // Mock user selecting "approve"
      (prompts as any).mockResolvedValueOnce({ action: 'approve' });

      // Mock fs for logging
      (fs.existsSync as any).mockReturnValue(false);

      const decision = await reviewInterface.presentUpdate(mockUpdate);

      expect(decision.action).toBe('approve');
      expect(decision.editedContent).toBeUndefined();
      expect(decision.feedback).toBeUndefined();
    });

    it('should return reject decision with feedback when user rejects', async () => {
      const mockUpdate = createMockUpdate();

      // Mock user selecting "reject" and providing feedback
      (prompts as any)
        .mockResolvedValueOnce({ action: 'reject' })
        .mockResolvedValueOnce({ feedback: 'Not accurate' });

      (fs.existsSync as any).mockReturnValue(false);

      const decision = await reviewInterface.presentUpdate(mockUpdate);

      expect(decision.action).toBe('reject');
      expect(decision.feedback).toBe('Not accurate');
    });

    it('should return edit decision with edited content', async () => {
      const mockUpdate = createMockUpdate();
      const editedContent = '# API\n\nManually edited content.';

      // Mock user selecting "edit" and providing content
      (prompts as any)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ editedContent });

      (fs.existsSync as any).mockReturnValue(false);

      const decision = await reviewInterface.presentUpdate(mockUpdate);

      expect(decision.action).toBe('edit');
      expect(decision.editedContent).toBe(editedContent);
    });

    it('should handle user cancellation', async () => {
      const mockUpdate = createMockUpdate();

      // Mock user cancelling (Ctrl+C returns undefined)
      (prompts as any).mockResolvedValueOnce({ action: undefined });

      (fs.existsSync as any).mockReturnValue(false);

      const decision = await reviewInterface.presentUpdate(mockUpdate);

      expect(decision.action).toBe('reject');
      expect(decision.feedback).toBe('Cancelled by user');
    });

    it('should display file path and reasoning', async () => {
      const mockUpdate = createMockUpdate({
        filePath: 'docs/guide.md',
        reasoning: 'Updated examples to use new API',
      });

      (prompts as any).mockResolvedValueOnce({ action: 'approve' });
      (fs.existsSync as any).mockReturnValue(false);

      await reviewInterface.presentUpdate(mockUpdate);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('docs/guide.md'));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Updated examples to use new API')
      );
    });
  });

  describe('presentBatch', () => {
    it('should process multiple updates in sequence', async () => {
      const updates = [
        createMockUpdate({ filePath: 'docs/api1.md' }),
        createMockUpdate({ filePath: 'docs/api2.md' }),
      ];

      // Mock approving both
      (prompts as any)
        .mockResolvedValueOnce({ action: 'approve' })
        .mockResolvedValueOnce({ action: 'approve' });

      (fs.existsSync as any).mockReturnValue(false);

      const decisions = await reviewInterface.presentBatch(updates);

      expect(decisions).toHaveLength(2);
      expect(decisions[0].action).toBe('approve');
      expect(decisions[1].action).toBe('approve');
    });

    it('should ask to continue after rejection', async () => {
      const updates = [
        createMockUpdate({ filePath: 'docs/api1.md' }),
        createMockUpdate({ filePath: 'docs/api2.md' }),
      ];

      // Mock rejecting first, then choosing to continue, then approving second
      (prompts as any)
        .mockResolvedValueOnce({ action: 'reject' })
        .mockResolvedValueOnce({ feedback: 'Not good' })
        .mockResolvedValueOnce({ continueReview: true })
        .mockResolvedValueOnce({ action: 'approve' });

      (fs.existsSync as any).mockReturnValue(false);

      const decisions = await reviewInterface.presentBatch(updates);

      expect(decisions).toHaveLength(2);
      expect(decisions[0].action).toBe('reject');
      expect(decisions[1].action).toBe('approve');
    });

    it('should skip remaining updates if user chooses not to continue', async () => {
      const updates = [
        createMockUpdate({ filePath: 'docs/api1.md' }),
        createMockUpdate({ filePath: 'docs/api2.md' }),
        createMockUpdate({ filePath: 'docs/api3.md' }),
      ];

      // Mock rejecting first, then choosing not to continue
      (prompts as any)
        .mockResolvedValueOnce({ action: 'reject' })
        .mockResolvedValueOnce({ feedback: 'Not good' })
        .mockResolvedValueOnce({ continueReview: false });

      (fs.existsSync as any).mockReturnValue(false);

      const decisions = await reviewInterface.presentBatch(updates);

      expect(decisions).toHaveLength(3);
      expect(decisions[0].action).toBe('reject');
      expect(decisions[1].action).toBe('reject');
      expect(decisions[1].feedback).toBe('Skipped by user');
      expect(decisions[2].action).toBe('reject');
      expect(decisions[2].feedback).toBe('Skipped by user');
    });
  });

  describe('logDecision', () => {
    it('should create new log file if it does not exist', () => {
      const mockUpdate = createMockUpdate();
      const decision = { action: 'approve' as const };

      (fs.existsSync as any).mockReturnValue(false);

      reviewInterface.logDecision(mockUpdate, decision);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockLogPath,
        expect.stringContaining('"action": "approve"'),
        'utf-8'
      );
    });

    it('should append to existing log file', () => {
      const mockUpdate = createMockUpdate();
      const decision = { action: 'reject' as const, feedback: 'Not accurate' };

      const existingLog = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          filePath: 'docs/old.md',
          action: 'approve',
        },
      ];

      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(existingLog));

      reviewInterface.logDecision(mockUpdate, decision);

      const writeCall = (fs.writeFileSync as any).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      expect(writtenData).toHaveLength(2);
      expect(writtenData[0].filePath).toBe('docs/old.md');
      expect(writtenData[1].filePath).toBe('docs/api.md');
      expect(writtenData[1].action).toBe('reject');
      expect(writtenData[1].feedback).toBe('Not accurate');
    });

    it('should include timestamp and metadata in log', () => {
      const mockUpdate = createMockUpdate();
      const decision = { action: 'edit' as const, editedContent: 'New content' };

      (fs.existsSync as any).mockReturnValue(false);

      reviewInterface.logDecision(mockUpdate, decision);

      const writeCall = (fs.writeFileSync as any).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      expect(writtenData[0]).toHaveProperty('timestamp');
      expect(writtenData[0]).toHaveProperty('filePath');
      expect(writtenData[0]).toHaveProperty('action');
      expect(writtenData[0]).toHaveProperty('reasoning');
      expect(writtenData[0]).toHaveProperty('hadEditedContent');
      expect(writtenData[0].hadEditedContent).toBe(true);
    });

    it('should not fail if logging fails', () => {
      const mockUpdate = createMockUpdate();
      const decision = { action: 'approve' as const };

      (fs.existsSync as any).mockImplementation(() => {
        throw new Error('File system error');
      });

      // Should not throw
      expect(() => {
        reviewInterface.logDecision(mockUpdate, decision);
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Failed to log decision'),
        expect.any(Error)
      );
    });
  });
});
