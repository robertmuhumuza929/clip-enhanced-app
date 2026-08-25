# Clip 3.0 — Mobile Creator Edition

Clip is a phone-first React Native + Expo video editor.

## Existing editing features

- Import and preview video
- Trim start/end
- Reorder/merge clip workflow
- Filters
- Text overlays
- Transitions
- Audio controls
- FFmpeg export
- Gallery saving

## New creator-focused additions

The UI now includes quick controls for:

- Captions toggle
- Playback speed presets
- Aspect-ratio presets: Original, 9:16, 1:1, 16:9
- Export quality presets: 1080p, 720p, 480p
- Reset/start-over
- Quick workflow guidance
- Project information panel

These controls are designed as the next layer of the editor. The actual export engine should be connected to each setting as the native engine implementation is finalized.

## Next features worth adding

### High priority
1. Undo/redo
2. Split clip at playhead
3. Duplicate clip
4. Crop/rotate
5. Real audio waveform
6. Better text animation
7. Draft autosave
8. Export presets for TikTok/Reels/Shorts
9. Export cancellation
10. Error recovery and clear export messages

### Creative features
- Beat markers
- Keyframes
- Speed ramping
- Stickers
- Emoji/text templates
- Blur/pixelate
- Background removal
- Picture-in-picture
- Green-screen/chroma key
- Voice-over recording
- Sound effects
- Auto captions
- Caption styles
- Thumbnail/frame selection

### Usability
- Dark/light themes
- Recent projects
- Project names
- Duplicate project
- Onboarding
- Storage cleanup
- Low-storage warnings
- Accessibility-friendly controls

## Important

Some advanced features require native video/audio processing. The UI can be prepared before the underlying native implementation is connected.

See `BUILD_GUIDE.md` for the phone-friendly build path.
