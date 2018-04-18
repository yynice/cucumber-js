const commandTypes = {
  ACTION_COMPLETE: 'action_complete',
  ERROR: 'error',
  EVENT: 'event',
  GENERATE_SNIPPET: 'generate_snippet',
  INITIALIZE_TEST_CASE: 'initialize_test_case',
  RUN_AFTER_TEST_CASE_HOOK: 'run_after_test_case_hook',
  RUN_AFTER_TEST_RUN_HOOKS: 'run_after_test_run_hooks',
  RUN_BEFORE_TEST_CASE_HOOK: 'run_before_test_case_hook',
  RUN_BEFORE_TEST_RUN_HOOKS: 'run_before_test_run_hooks',
  RUN_TEST_STEP: 'run_test_step',
  START: 'start',
}

export default commandTypes
