# Changelog

## Unreleased

- Simplified avatar system:
  - `human_square` uses persona avatar if selected, otherwise NEW user default.
  - `niko_square` uses selected character avatar in single chat; robot default in group/no-character.
  - Circular avatar styling applied to Lite images (`object-fit: cover; border: 2px solid #5a6b8c; border-radius: 50%`).
- Removed regex-based message parsing, DOM avatar injection, and pending-speaker queues.
- Updated tests to reflect simplified behavior; 100% test pass and requirements coverage.
- Updated developer requirements (REQ-F-080) and added avatar spec doc.
