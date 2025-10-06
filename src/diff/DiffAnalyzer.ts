import { ParsedCode, APIElement, APIDiff, ChangeDetail, ChangeSeverity } from '../types/index.js';

/**
 * DiffAnalyzer compares two versions of parsed code to identify API changes.
 * It detects added, removed, and modified APIs and classifies the severity of changes.
 */
export class DiffAnalyzer {
  /**
   * Analyze differences between old and new parsed code
   * @param oldCode Previously parsed code
   * @param newCode Newly parsed code
   * @returns APIDiff object containing all changes
   */
  analyze(oldCode: ParsedCode, newCode: ParsedCode): APIDiff {
    const diff: APIDiff = {
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
    };

    // Create maps for efficient lookup
    const oldAPIs = new Map<string, APIElement>();
    const newAPIs = new Map<string, APIElement>();

    oldCode.apis.forEach((api) => oldAPIs.set(api.name, api));
    newCode.apis.forEach((api) => newAPIs.set(api.name, api));

    // Identify added APIs (in new but not in old)
    newCode.apis.forEach((newAPI) => {
      if (!oldAPIs.has(newAPI.name)) {
        diff.added.push(newAPI);
      }
    });

    // Identify removed APIs (in old but not in new)
    oldCode.apis.forEach((oldAPI) => {
      if (!newAPIs.has(oldAPI.name)) {
        diff.removed.push(oldAPI);
      }
    });

    // Identify modified and unchanged APIs
    oldCode.apis.forEach((oldAPI) => {
      const newAPI = newAPIs.get(oldAPI.name);
      if (newAPI) {
        const changes = this.compareAPIs(oldAPI, newAPI);
        if (changes.length > 0) {
          diff.modified.push({
            old: oldAPI,
            new: newAPI,
            changes,
          });
        } else {
          diff.unchanged.push(oldAPI);
        }
      }
    });

    return diff;
  }

  /**
   * Compare two API elements to identify specific changes
   * @param oldAPI Old version of the API
   * @param newAPI New version of the API
   * @returns Array of ChangeDetail objects describing the changes
   */
  private compareAPIs(oldAPI: APIElement, newAPI: APIElement): ChangeDetail[] {
    const changes: ChangeDetail[] = [];

    // Check if signature changed
    if (oldAPI.signature !== newAPI.signature) {
      changes.push({
        type: 'signature',
        description: `Signature changed from "${oldAPI.signature}" to "${newAPI.signature}"`,
      });
    }

    // Check if parameters changed
    const paramChanges = this.compareParameters(oldAPI, newAPI);
    if (paramChanges) {
      changes.push(paramChanges);
    }

    // Check if return type changed
    if (oldAPI.returnType !== newAPI.returnType) {
      const oldReturn = oldAPI.returnType || 'void';
      const newReturn = newAPI.returnType || 'void';
      changes.push({
        type: 'return_type',
        description: `Return type changed from "${oldReturn}" to "${newReturn}"`,
      });
    }

    // Check if documentation changed
    if (oldAPI.documentation !== newAPI.documentation) {
      changes.push({
        type: 'documentation',
        description: 'Documentation was updated',
      });
    }

    return changes;
  }

  /**
   * Compare parameters between two API elements
   * @param oldAPI Old version of the API
   * @param newAPI New version of the API
   * @returns ChangeDetail if parameters changed, undefined otherwise
   */
  private compareParameters(oldAPI: APIElement, newAPI: APIElement): ChangeDetail | undefined {
    const oldParams = oldAPI.parameters || [];
    const newParams = newAPI.parameters || [];

    // Check if parameter count changed
    if (oldParams.length !== newParams.length) {
      return {
        type: 'parameters',
        description: `Parameter count changed from ${oldParams.length} to ${newParams.length}`,
      };
    }

    // Check if any parameter details changed
    for (let i = 0; i < oldParams.length; i++) {
      const oldParam = oldParams[i];
      const newParam = newParams[i];

      if (
        oldParam.name !== newParam.name ||
        oldParam.type !== newParam.type ||
        oldParam.optional !== newParam.optional ||
        oldParam.defaultValue !== newParam.defaultValue
      ) {
        return {
          type: 'parameters',
          description: `Parameter "${oldParam.name}" changed`,
        };
      }
    }

    return undefined;
  }

  /**
   * Determine if changes affect only public APIs
   * @param diff APIDiff object to analyze
   * @returns true if only public APIs are affected
   */
  isPublicAPIChange(diff: APIDiff): boolean {
    // Check if any added APIs are public
    const hasPublicAdded = diff.added.some((api) => api.isPublic);

    // Check if any removed APIs are public
    const hasPublicRemoved = diff.removed.some((api) => api.isPublic);

    // Check if any modified APIs are public
    const hasPublicModified = diff.modified.some((mod) => mod.old.isPublic || mod.new.isPublic);

    return hasPublicAdded || hasPublicRemoved || hasPublicModified;
  }

  /**
   * Calculate the severity of changes in the diff
   * @param diff APIDiff object to analyze
   * @returns ChangeSeverity level
   */
  calculateSeverity(diff: APIDiff): ChangeSeverity {
    // Breaking changes: removed public APIs or incompatible signature changes
    const hasRemovedPublicAPI = diff.removed.some((api) => api.isPublic);
    const hasBreakingModification = diff.modified.some((mod) => {
      if (!mod.old.isPublic) return false;

      // Check for breaking changes in modifications
      return mod.changes.some((change) => {
        // Parameter changes are breaking
        if (change.type === 'parameters') {
          return true;
        }

        // Return type changes are breaking
        if (change.type === 'return_type') {
          return true;
        }

        return false;
      });
    });

    if (hasRemovedPublicAPI || hasBreakingModification) {
      return 'breaking';
    }

    // Major changes: added public APIs
    const hasAddedPublicAPI = diff.added.some((api) => api.isPublic);

    if (hasAddedPublicAPI) {
      return 'major';
    }

    // Minor changes: non-breaking modifications to public APIs (excluding doc-only changes)
    const hasNonBreakingModification = diff.modified.some((mod) => {
      if (!mod.old.isPublic) return false;

      // Check if there are non-documentation changes
      return mod.changes.some((change) => change.type !== 'documentation');
    });

    if (hasNonBreakingModification) {
      return 'minor';
    }

    // Patch changes: documentation updates or internal changes
    const hasDocumentationChange = diff.modified.some((mod) =>
      mod.changes.some((change) => change.type === 'documentation')
    );

    if (hasDocumentationChange) {
      return 'patch';
    }

    // No significant changes
    return 'patch';
  }
}
