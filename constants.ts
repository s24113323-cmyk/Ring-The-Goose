
export const GRAVITY = 1.6;
export const FRICTION = 0.98;
export const MAX_HOOPS = 10; 
export const NUM_GEESE = 8;
export const TURN_TIME_LIMIT = 10; 

// Pseudo-3D mapping
export const PERSPECTIVE = 600; 
export const GROUND_Y_START = 400; 

// Physics
export const HOOP_RADIUS = 28; 
export const GOOSE_HITBOX_RADIUS = 35; 
export const THROW_POWER_MULTIPLIER = 0.16; 
export const MAX_DRAG_DISTANCE = 220; 

// Skill Constants
export const SKILL_COSTS = {
  freeze: 50,
  slow: 30,
  lure: 40
};

export const SKILL_DURATIONS = {
  freeze: 4000, // 4 seconds
  slow: 8000,   // 8 seconds
  lure: 6000    // 6 seconds
};

// Goose Behavior
export const GOOSE_SPEED = 1.8; 
export const GOOSE_CHANGE_DIR_CHANCE = 0.015;
export const BOUNDARY_MARGIN = 50;

// Audio
export const BGM_URL = 'chinese_music.mp3'; 
export const AMBIENT_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-cricket-in-the-night-2541.mp3'; 
export const SFX_THROW = 'https://cdn.pixabay.com/audio/2022/03/10/audio_f5e6a21e64.mp3'; 
export const SFX_HIT = 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c30d41.mp3'; 
export const SFX_MISS = 'https://cdn.pixabay.com/audio/2022/03/10/audio_733671239c.mp3'; 
export const SFX_HONK = 'https://cdn.pixabay.com/audio/2022/01/18/audio_823e1b0b46.mp3'; 
export const SFX_PECK = 'https://cdn.pixabay.com/audio/2022/03/24/audio_341f45612f.mp3'; 
export const SFX_UI_POP = 'https://cdn.pixabay.com/audio/2022/10/25/audio_5116790a35.mp3'; 
export const SFX_MIC_ON = 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c30d41.mp3'; 
export const SFX_MIC_OFF = 'https://cdn.pixabay.com/audio/2022/03/15/audio_d0868f7036.mp3';
export const SFX_COIN = 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c30d41.mp3';
