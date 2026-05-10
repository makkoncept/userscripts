# ChatGPT Chat Timestamps

Displays creation and update timestamps for ChatGPT conversations as tooltips when hovering over conversation links.

## Features

- **Automatic timestamp display**: Shows `create_time` and `update_time` for each conversation
- **Dual format**: Displays both absolute dates/times and relative time (e.g., "2 hours ago")
- **Non-intrusive**: Uses native tooltips, doesn't modify the UI layout
- **Silent operation**: No console pollution by default

## How It Works

1. **Intercepts API calls**: Monitors fetch requests to `/backend-api/conversations` to extract conversation metadata
2. **Stores timestamp data**: Captures `create_time` and `update_time` for each conversation
3. **Injects tooltips**: Adds timestamp information to conversation links using the `title` attribute
4. **Watches for changes**: Uses MutationObserver to handle dynamically loaded conversations

## Usage

Once installed, simply hover over any conversation link in your ChatGPT sidebar. You'll see a tooltip showing:
- **Created**: The creation date/time (absolute and relative)
- **Updated**: The last update date/time (absolute and relative)

## Testing

The script includes commented console logs for debugging. To enable them, uncomment the following lines:
- Line 163: Logs when conversations are intercepted
- Line 228: Logs when the script initializes
- Line 123: Logs when a tooltip is successfully injected

## Technical Details

- **Runs at**: `document-start` to intercept API calls before they're made
- **No grants required**: Works without special permissions
- **Compatible with**: ChatGPT's React-based UI
- **Performance**: Minimal overhead, processes conversations asynchronously
