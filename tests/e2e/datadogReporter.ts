import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { getLogger } from 'src/log';

const log = getLogger("playwright-reporter");

class DatadogReporter implements Reporter {
    onTestEnd(test: TestCase, result: TestResult) {
        if (result.status === 'failed' || result.status === 'timedOut') {
            log.error(`Test FAILED: ${test.title}`, {
                status: result.status,
                error: result.error?.message,
                file: test.location.file,
                duration: result.duration,
            });
        }
    }
}

export default DatadogReporter;

