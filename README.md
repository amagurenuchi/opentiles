# OpenTile

A Piano Tiles 2 clone built with vanilla JavaScript, featuring imported song support and custom audio samples.

## Features

- **Pattern Mode**: Play with generated tile patterns
- **Song Mode**: Import Piano Tiles 2 JSON files to play real songs
- **Custom Audio**: Uses local WAV/MP3 samples for piano notes
- **Keybind Customization**: Configure your own keyboard controls
- **Progress Tracking**: Stars and crowns system for song completion
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

1. Open `index.html` in a web browser
2. Select a song from the library or use pattern mode
3. Click tiles or use keyboard keys (D, F, J, K) to play

## File Structure

- `index.html` - Main game interface
- `game.js` - Game logic and audio system
- `style.css` - Styling and animations
- `music/` - Audio samples (WAV/MP3 format)
- `song/` - Piano Tiles 2 JSON song files
- `music_json.csv` - Song metadata database

## Audio System

The game uses local audio samples instead of soundfont libraries:
- WAV files are preferred for better decoding reliability
- MP3 files serve as fallback
- URL encoding handles special characters in filenames (e.g., # notes)
- Synthesizer fallback if audio loading fails

## Song Import

1. Click "Song Library" on the start screen
2. Select a song from the available list
3. The game loads the JSON file and associated audio samples

## Settings

- **Start Speed**: Initial tile speed
- **Acceleration**: Speed increase rate
- **Pattern Preset**: Tile generation patterns
- **Custom Pattern**: Define your own tile sequences

## Controls

- **Desktop**: D, F, J, K keys (customizable)
- **Mobile**: Tap the tiles directly
- **Settings**: Access via gear icon on start screen

## Credits

Built as a Piano Tiles 2 clone with custom audio implementation.
