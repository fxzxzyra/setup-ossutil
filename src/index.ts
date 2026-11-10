import * as core from '@actions/core';
import { cleanup, run } from './main.js';

try {
  if (core.getState('is-post') === 'true') {
    await cleanup();
  } else {
    core.saveState('is-post', 'true');
    await run();
  }
} catch (error) {
  core.setFailed(error instanceof Error ? error.message : String(error));
}
