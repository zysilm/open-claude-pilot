#!/usr/bin/env python3
import glob
import os

# Find all test files
test_files = glob.glob('tests/e2e/chat-features/*.spec.ts')

for file_path in test_files:
    with open(file_path, 'r') as f:
        content = f.read()

    # Skip message-rendering.spec.ts as it's already fixed
    if 'message-rendering.spec.ts' in file_path:
        continue

    # Replace the setFeatureFlag function
    old_function = """async function setFeatureFlag(page: Page, enabled: boolean) {
  await page.evaluate((flag) => {
    localStorage.setItem('enableAssistantUI', flag ? 'true' : 'false');
  }, enabled);
  await page.reload();
}"""

    new_function = """async function setFeatureFlag(page: Page, enabled: boolean) {
  // Navigate first to have access to localStorage
  await page.goto('http://localhost:5174/');
  await page.evaluate((flag) => {
    localStorage.setItem('enableAssistantUI', flag ? 'true' : 'false');
  }, enabled);
}"""

    content = content.replace(old_function, new_function)

    with open(file_path, 'w') as f:
        f.write(content)

    print(f"Fixed {file_path}")

print("All test files fixed!")