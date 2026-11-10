import * as core from '@actions/core';
import { run } from './main.js';

try {
  await run();
} catch (error) {
  core.setFailed(error instanceof Error ? error.message : String(error));
}
