# Piano Tiles 2 Clone Implementation Plan

This plan outlines the implementation of a web-based Piano Tiles 2 clone using React and TailwindCSS with continuously falling tiles, three difficulty levels, and responsive design.

## Objective
Create a fully functional Piano Tiles 2 clone game where black tiles fall continuously from the top of the screen across 4 columns. Players must click/tap tiles before they reach the bottom. The game features three difficulty levels with increasing speed, responsive design for mobile/desktop, and customizable keybinds for desktop users.

## Acceptance Criteria
- Game renders with 4 columns separated by thin white lines
- Screen height fits exactly 4 tiles with 2:1 height:width ratio
- Black tiles spawn continuously and fall from top to bottom
- Initial tiles spawn in rows 2, 3, 4 (bottom row empty with "START" text in row 2)
- Tiles never spawn in the same column twice in a row
- Three difficulty levels (beginner, skilled, master) with specific speed configurations
- Speed increases continuously based on time elapsed
- Game ends when a tile reaches the bottom without being clicked
- Score increments with each successful tile click
- Responsive layout works on both mobile and desktop
- Desktop users can customize keybinds for each column
- High score tracking (local storage)
- Clean, minimalist aesthetic with black tiles on white background
- Score and speed displayed using embedded TW Cen MT condensed font
- Score displayed in pale red color
- Speed displayed in light cyan color

## Scope

### In Scope
- React + TailwindCSS setup
- Game board with 4 columns
- Tile spawning and falling mechanics
- Collision detection (tile reaching bottom)
- Click/tap detection for mobile and desktop
- Keyboard input for desktop with customizable keybinds
- Three difficulty levels with speed progression
- Score tracking and display
- High score persistence (localStorage)
- Responsive design
- Game over screen with restart option
- Settings panel for keybind customization

### Out of Scope
- Music/audio
- Multiple songs or levels
- Online leaderboards
- User accounts
- Social sharing
- Mobile app packaging

## Technical Architecture

### Tech Stack
- **Framework**: React (Vite for build tooling)
- **Styling**: TailwindCSS
- **State Management**: React hooks (useState, useEffect, useRef)
- **Storage**: localStorage for high scores and keybinds

### Core Components
1. **GameBoard** - Main game container with 4 columns
2. **Tile** - Individual falling tile component
3. **ScoreDisplay** - Shows current score (pale red) and speed (light cyan) using TW Cen MT condensed font
4. **DifficultySelector** - Choose between beginner/skilled/master
5. **SettingsPanel** - Customize keybinds for desktop
6. **GameOverScreen** - Display final score and restart option

### Game Logic
- **Tile Spawning**: Random column selection with constraint (no consecutive same column)
- **Initial State**: 3 tiles spawn in rows 2, 3, 4; bottom row displays "START" text
- **Speed System**: Base speed per difficulty + continuous acceleration based on time elapsed
- **Game Loop**: requestAnimationFrame for smooth tile movement with delta time calculation
- **Input Handling**: Touch events for mobile, click/keyboard for desktop
- **Collision Detection**: Check if tile Y position exceeds bottom threshold
- **Layout**: Screen height fits exactly 4 tiles with 2:1 height:width ratio

### Difficulty Configuration
- **Beginner**: Starting speed 3.3 tiles/sec, increases by 0.07 tiles/sec per second
- **Skilled**: Starting speed 5.0 tiles/sec, increases by 0.1 tiles/sec per second
- **Master**: Starting speed 8.0 tiles/sec, increases by 0.18 tiles/sec per second

### Keybind System
- Default: D, F, J, K (standard gaming layout)
- Customizable via settings panel
- Persisted in localStorage
- Display keybind hints on desktop

## Implementation Steps

### 1. Project Setup
- Initialize React + Vite project
- Install TailwindCSS and configure
- Set up project structure (components folder)

### 2. Core Game Board
- Create GameBoard component with 4-column layout
- Implement column separators (thin white lines)
- Set up responsive container sizing with 2:1 height:width ratio for tiles
- Configure board to fit exactly 4 tiles vertically
- Add game state (playing, paused, game over)
- Implement initial state with 3 tiles in rows 2, 3, 4 and "START" text in bottom row

### 3. Tile System
- Create Tile component with position tracking
- Implement spawning logic with column constraint
- Add falling animation using requestAnimationFrame
- Handle tile removal when clicked or off-screen

### 4. Input Handling
- Add click/tap handlers for mobile
- Implement keyboard input for desktop
- Map keys to columns (customizable)
- Add visual feedback on tile press

### 5. Game Logic
- Implement collision detection (tile reaches bottom)
- Add score tracking
- Implement continuous speed progression based on time elapsed (delta time calculation)
- Add game over state and restart functionality

### 6. Difficulty System
- Create difficulty selector component
- Implement speed configurations for each level (tiles/sec with per-second acceleration)
- Add continuous speed increase logic based on elapsed game time

### 7. Settings Panel
- Create settings modal for keybind customization
- Implement keybind change UI
- Save/load keybinds from localStorage
- Display current keybinds on game board

### 8. Responsive Design
- Ensure game board scales for mobile screens
- Adjust tile sizes for different screen sizes
- Hide keybind hints on mobile
- Optimize touch targets for mobile

### 9. Polish
- Add smooth animations
- Implement high score tracking
- Add visual feedback (tile flash on click)
- Ensure consistent 60fps performance
- Add start screen with difficulty selection

## Constraints
- Must work without build step for development
- No external dependencies beyond React and TailwindCSS
- Performance: Maintain 60fps on average devices
- Mobile: Support touch events on iOS and Android
- Desktop: Support keyboard input with customizable keybinds
- Browser compatibility: Modern browsers (Chrome, Firefox, Safari, Edge)
