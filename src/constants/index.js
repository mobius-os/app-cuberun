import * as THREE from 'three'

/**
 * The size of each ground plane in meters, 1000 is fine
 */
export const PLANE_SIZE = 1000

/**
 * How many ground planes must we traverse per level, default 6
 */
export const LEVEL_SIZE = 6

export const LEFT_BOUND = (-PLANE_SIZE / 2) * 0.6
export const RIGHT_BOUND = (PLANE_SIZE / 2) * 0.6

// Gameplay knobs: edit these first when changing how CubeRun feels.
export const GAMEPLAY = {
  // Obstacles
  cubeSize: 20,
  cubeAmount: 60,
  collisionRadius: 12,
  obstacleRiseSpeed: 100,

  // Speed / progression
  initialGameSpeed: 0.8,
  speedIncreasePerLevel: 0.2,
  acceleration: 0.15,

  // Player movement
  forwardSpeedScale: 165,
  lateralSpeedScale: 165,
  steeringAcceleration: 2,
  maxHorizontalVelocity: 0.7,

  // Track/walls
  wallRadius: 40,
}

export const CUBE_SIZE = GAMEPLAY.cubeSize

export const CUBE_AMOUNT = GAMEPLAY.cubeAmount

export const INITIAL_GAME_SPEED = GAMEPLAY.initialGameSpeed

export const GAME_SPEED_MULTIPLIER = GAMEPLAY.speedIncreasePerLevel

export const WALL_RADIUS = GAMEPLAY.wallRadius

export const COLORS = [
  {
    name: 'pink',
    hex: '#ff69b4',
    three: new THREE.Color(0xff2190)
  },
  {
    name: 'red',
    hex: '#ff2919',
    three: new THREE.Color(0xff2919) //  0xff3021 #ff1e0d
  },
  {
    name: 'orange',
    hex: '#bd4902',
    three: new THREE.Color(0xbd4902) //0xcc4e00
  },
  {
    name: 'green',
    hex: '#26a300',
    three: new THREE.Color(0x26a300) // 0x2ec200
  },
  {
    name: 'blue',
    hex: '#217aff',
    three: new THREE.Color(0x2069d6)
  },
  {
    name: 'purple',
    hex: '#9370D8',
    three: new THREE.Color(0x6942b8)
  },
  {
    name: 'white',
    hex: '#ffffff',
    three: new THREE.Color(0x6b6b6b) // 0x828282
  },
  {
    name: 'black',
    hex: '#000000',
    three: new THREE.Color(0xCCCCCC)
  }
]
