import path from "path";
import fs from "fs";

// Get the allowed working directory from environment
const WORKING_DIR = process.env.WORKING_DIR || process.cwd();

/**
 * Normalize a path string that may have various formatting issues from LLMs.
 * Handles: double backslashes (\\\\), mixed slashes, escaped quotes, etc.
 * @param {string} inputPath - The potentially malformed path
 * @returns {string} - Normalized path with forward slashes
 */
export function normalizePath(inputPath) {
  if (!inputPath) return inputPath;

  return inputPath
    // Remove surrounding quotes if present
    .replace(/^["']|["']$/g, '')
    // Normalize multiple backslashes to single: \\\\ -> \
    .replace(/\\{2,}/g, '\\')
    // Convert all backslashes to forward slashes
    .replace(/\\/g, '/')
    // Remove any duplicate forward slashes (except after protocol)
    .replace(/([^:])\/+/g, '$1/');
}

/**
 * Resolve a path. If it's absolute, use it directly. If relative, resolve from working dir.
 * Always returns forward slashes for consistency.
 * Handles malformed paths from LLMs (double backslashes, mixed slashes, etc.)
 * @param {string} inputPath - The path to resolve
 * @param {boolean} mustExist - Whether the path must exist
 * @returns {string} - The resolved absolute path with forward slashes
 * @throws {Error} - If mustExist is true and path doesn't exist
 */
export function resolvePath(inputPath, mustExist = false) {
  // First normalize the input to handle LLM formatting issues
  const normalizedInput = normalizePath(inputPath);

  // Resolve to absolute path
  let resolved = path.isAbsolute(normalizedInput)
    ? path.normalize(normalizedInput)
    : path.resolve(WORKING_DIR, normalizedInput);

  // Convert backslashes to forward slashes for consistency
  resolved = resolved.replace(/\\/g, '/');

  // Check existence if required
  if (mustExist && !fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }

  return resolved;
}

/**
 * Get the working directory with forward slashes
 * @returns {string}
 */
export function getWorkingDir() {
  return WORKING_DIR.replace(/\\/g, '/');
}

/**
 * Check if a path is allowed (without throwing)
 * @param {string} inputPath
 * @returns {boolean}
 */
export function isPathAllowed(inputPath) {
  try {
    resolvePath(inputPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Make a path relative to working directory for display
 * @param {string} absolutePath
 * @returns {string}
 */
export function relativePath(absolutePath) {
  return path.relative(WORKING_DIR, absolutePath).replace(/\\/g, '/');
}
