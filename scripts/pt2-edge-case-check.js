#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeElement() {
  const state = { value: '', innerHTML: '', textContent: '', disabled: false, files: [] };
  const element = {
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; },
    setAttribute() {},
    getAttribute() { return null; },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; }
    },
    style: {},
    focus() {},
    blur() {},
    click() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 0, height: 0 };
    },
    scrollIntoView() {},
    play() {},
    pause() {},
    remove() {}
  };

  return new Proxy(element, {
    get(target, prop) {
      if (prop in state) return state[prop];
      if (prop in target) return target[prop];
      return undefined;
    },
    set(target, prop, value) {
      if (prop in state) {
        state[prop] = value;
        return true;
      }
      target[prop] = value;
      return true;
    }
  });
}

function createSandbox() {
  const dummyDocument = {
    getElementById() {
      return makeElement();
    },
    querySelector() {
      return makeElement();
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return makeElement();
    },
    addEventListener() {},
    body: makeElement(),
    documentElement: makeElement()
  };

  const dummyWindow = {
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    AudioContext: undefined,
    webkitAudioContext: undefined,
    SoundFont: undefined
  };

  const sandbox = {
    console,
    Math,
    JSON,
    Date,
    Number,
    parseFloat,
    parseInt,
    isNaN,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {}
    },
    document: dummyDocument,
    window: dummyWindow,
    navigator: {},
    location: {},
    alert() {}
  };

  sandbox.globalThis = sandbox;
  return sandbox;
}

function loadGameContext() {
  const sandbox = createSandbox();
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'game.js' });
  return sandbox;
}

function approxEqual(a, b, epsilon = 1e-6) {
  return Math.abs(a - b) <= epsilon;
}

function main() {
  const sandbox = loadGameContext();
  const fixturePath = path.join(__dirname, '..', 'Ievan Polkka.json');
  const json = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  const song = sandbox.parsePT2SongData(json);
  assert.strictEqual(song.musicCount, 3, 'expected three PT2 sections');
  assert.strictEqual(song.entries.length, 3, 'expected three parsed entries');
  assert.strictEqual(song.speedSchedule.length, 3, 'expected three speed schedule entries');
  assert.strictEqual(
    song.entries.map((entry) => entry.id).join(','),
    '1,2,3',
    'expected the PT2 sections to be stitched in id order'
  );

  song.entries.forEach((entry, index) => {
    const expectedSpeed = sandbox.computePT2TilesPerSecond(entry.bpm, entry.baseBeats);
    assert(
      approxEqual(entry.speed, expectedSpeed),
      `entry ${index + 1} speed mismatch: expected ${expectedSpeed}, got ${entry.speed}`
    );
    if (index > 0) {
      assert(
        entry.startSeconds >= song.entries[index - 1].endSeconds,
        `entry ${index + 1} should start after the previous entry ends`
      );
    }
  });

  song.speedSchedule.forEach((section, index) => {
    const expectedStart = index === 0 ? 0 : song.speedSchedule[index - 1].endSeconds;
    assert(
      approxEqual(section.startSeconds, expectedStart),
      `speed section ${index + 1} start mismatch`
    );
    assert(
      section.endSeconds >= section.startSeconds,
      `speed section ${index + 1} must not end before it starts`
    );
  });

  const tiles = sandbox.buildImportedSongTiles(song);
  assert(tiles.length > 0, 'expected imported tiles to be built');
  assert(
    tiles.some((tile) => tile.fromImportedSong),
    'expected imported song tiles to be marked as imported'
  );
  assert.strictEqual(
    song.playableEvents.filter((event) => event.tileType === 'double').length,
    42,
    'expected the stitched PT2 song to preserve 42 double events'
  );
  assert.strictEqual(
    song.playableEvents.filter((event) => event.tileType === 'long').length,
    0,
    'expected the stitched PT2 song to keep short holds as doubles, not long tiles'
  );
  assert.strictEqual(song.durationSeconds > 16, true, 'expected the stitched chart to preserve all three sections');

  const longTileSong = {
    baseBpm: 120,
    bpm: 120,
    baseBeats: 0.5,
    entries: [],
    events: [],
    playableEvents: [
      {
        tileType: 'long',
        noteCount: 1,
        startSeconds: 0,
        durationSeconds: 0.5,
        durationBeats: 1,
        baseBeats: 0.5,
        notes: [{ name: 'c1' }],
        trackInstrument: 'piano'
      }
    ]
  };

  const builtLongTiles = sandbox.buildImportedSongTiles(longTileSong);
  const longTile = builtLongTiles.find((tile) => tile.type === 'long');
  assert(longTile, 'expected a long tile to be built');
  assert.strictEqual(longTile.length, 2, 'long tiles should be at least two rows');
  assert.strictEqual(longTile.y, 0, 'first long tile should start with the correct offset');

  console.log(
    JSON.stringify(
      {
        fixture: path.basename(fixturePath),
        sections: song.entries.map((entry) => ({
          id: entry.id,
          bpm: entry.bpm,
          baseBeats: entry.baseBeats,
          speed: Number(entry.speed.toFixed(3)),
          durationSeconds: Number(entry.durationSeconds.toFixed(2))
        })),
        tileCount: tiles.length,
        longTileCount: tiles.filter((tile) => tile.type === 'long').length,
        doubleEventCount: song.playableEvents.filter((event) => event.tileType === 'double').length,
        stitchedSong: {
          musicCount: song.musicCount,
          entryIds: song.entries.map((entry) => entry.id),
          durationSeconds: Number(song.durationSeconds.toFixed(2))
        },
        syntheticLongTile: {
          length: longTile.length,
          y: longTile.y
        }
      },
      null,
      2
    )
  );
}

main();
