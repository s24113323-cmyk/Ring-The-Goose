
export type Point = {
  x: number;
  y: number;
};

export type Vector3D = {
  x: number;
  y: number; // Depth (distance from camera)
  z: number; // Height (altitude)
};

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum GraphicsQuality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: GraphicsQuality;
  showTrajectory: boolean;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  timestamp: number;
}

export type GooseType = 'standard' | 'gold' | 'rainbow';

export type SkillType = 'freeze' | 'slow' | 'lure';

export interface Inventory {
  freeze: number;
  slow: number;
  lure: number;
}

export interface ActiveSkills {
  freeze: number; // Remaining duration in frames or ms
  slow: number;
  lure: number;
}

export type GooseState = {
  pos: Vector3D;
  vel: Vector3D;
  targetPos: Vector3D;
  isCaught: boolean;
  neckAngle: number;
  legFrame: number;
  direction: number; // 1 for right, -1 for left
  pauseTimer: number; // How long to stay still
  alertLevel: number; // 0 to 1, how much it "senses" danger
  isDodging: boolean;
  dodgeCooldown: number;
  reactionText?: string;
  reactionTimer: number;
  dashCount: number;
  exhaustionTimer: number;
  type: GooseType;
  points: number;
  walkStyle: number;
  peckTimer: number;
};

export type HoopState = {
  pos: Vector3D;
  vel: Vector3D;
  active: boolean;
  landed: boolean;
  scale: number;
};

export type DragState = {
  isDragging: boolean;
  start: Point;
  current: Point;
}
