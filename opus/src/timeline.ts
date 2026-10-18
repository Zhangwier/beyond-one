// The edit. Each scene owns a window of bars from score.ts; cuts are hard cuts on
// downbeats, and every transition is designed as a match cut inside the scenes
// (the end state of one plate is the first state of the next).
import type { Scene } from './engine/scene';
import Prologue from './scenes/prologue';
import Complexity from './scenes/complexity';
import Connection from './scenes/connection';
import Breakthrough from './scenes/breakthrough';
import Judgment from './scenes/judgment';
import Horizon from './scenes/horizon';

export function makeTimeline(): Scene[] {
  return [new Prologue(), new Complexity(), new Connection(), new Breakthrough(), new Judgment(), new Horizon()];
}
