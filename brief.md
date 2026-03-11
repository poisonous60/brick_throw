# Brick Throw Demo Brief

## Project Goal
Create a browser-playable 3D brick throwing demo that can be opened directly from a GitHub-hosted static site.

## Primary Deliverable
- A static web demo that starts quickly and is immediately playable.
- No login, OAuth, backend, or database.
- The GitHub link should open the demo directly.

## Source References
- Styleboard: `brick_throw_styleboard.pdf`
- Local assets folder: `assets/`

## Core Interaction
- Right mouse drag: rotate camera / change viewpoint.
- Left mouse hold + drag + release: aim and throw a brick.
- The experience should feel intuitive enough to try without text-heavy UI.
- Minimal UI is preferred over a tutorial-heavy screen.

## Gameplay Rules
- Playable as a simple sandbox demo, not a full game with stages.
- A brick collision sound should play once when:
  - the thrown brick hits the wall,
  - bricks collide with each other,
  - a brick falls to the ground.
- Keep the active brick count at 10 or fewer for performance.
- If more than 10 bricks exist, remove the oldest spawned brick first.

## Recommended Technical Direction
- Recommended stack: `Vite + React + React Three Fiber + @react-three/drei + @react-three/rapier`
- Reason:
  - easy static deployment,
  - clean integration between website UI and 3D scene,
  - suitable for simple rigid-body brick physics.
- Physics should use simple colliders even if render meshes are more detailed.
- Separate visual meshes from physics colliders.

## Implementation Approach
- Build the demo in small stages rather than all at once.
- Recommended order:
  1. load the scene and show a first playable camera view,
  2. place and tune the alleyway background,
  3. add the target wall and floor colliders,
  4. implement brick throwing physics,
  5. add sound and lightweight polish.
- Each stage should remain runnable so visual tuning and gameplay testing are easy.

## Asset Plan

### Use In First Playable Version
- `assets/model/alleyway.glb`
  - Use as the main background environment.
  - Treat it mostly as visual scenery, not as a fully physical mesh.
  - Add only the minimum required colliders for floor and key blocking surfaces.
  - It should be easy to rescale, reposition, and rotate this model during testing.

- `assets/model/Brick.glb`
  - Use as the main thrown brick visual.
  - Physics collider should remain a simple box/cuboid.
  - Can also be reused for visible wall bricks if performance is acceptable.

- `assets/sound/powerful_impact_1.mp3`
- `assets/sound/powerful_impact_2.mp3`
  - Use these as stronger impact sounds.
  - Good default candidates for wall hits or more forceful collisions.

- `assets/sound/weak_impact_1.mp3`
- `assets/sound/weak_impact_2.mp3`
  - Use these as lighter impact sounds.
  - Good default candidates for ground contact or lower-energy brick collisions.

### Optional / Phase 2
- `assets/texture/red_brick_2k.gltf.zip`
  - Optional higher-detail brick material source.
  - Use only if the default brick look is too plain.
  - Prefer reducing texture size before shipping if extracted.

- `assets/texture/concrete_debris_2k.gltf.zip`
  - Optional surface/detail material for ground or debris accents.
  - Not required for the first playable build because the alleyway model already provides the main environment look.

## Visual Direction
- Stylized or semi-stylized 3D is preferred over realism.
- The scene should be readable at a glance:
  - clear target structure,
  - clear thrown object,
  - clear impact result.
- Focus on feel and readability first, not texture complexity.

## Environment and Physics Notes
- The alleyway scene should function mainly as atmosphere and framing.
- The floor must have a collider.
- The target wall / stack should be built from simple physical brick bodies.
- Non-essential background geometry should not all receive colliders.
- Favor stable, lightweight rigid-body behavior over fully realistic destruction.
- The environment model may be rescaled, repositioned, rotated, or visually de-emphasized to frame gameplay clearly.

## Tunable Scene Setup
- The code should be structured so environment transform and camera tuning values are easy to edit in one place.
- Keep these values centralized in a single config/module instead of scattering literals across components.
- At minimum, centralize:
  - alleyway position,
  - alleyway rotation,
  - alleyway scale,
  - camera position,
  - camera target / look-at point,
  - zoom or distance-related values,
  - any initial throw-origin reference position if needed.
- This setup should make it easy to iterate on framing without changing gameplay code.
- Prefer clear names such as `sceneConfig`, `worldTuning`, or `cameraPreset`.

## UX Notes
- The first screen should let the user start immediately.
- Keep overlays minimal.
- If any hint is shown, keep it short and unobtrusive.
- Camera motion should help the player understand the throw direction.

## Audio Notes
- Use the split one-shot impact files instead of a long combined audio track.
- Sound playback should be event-based, not timeline-sliced from a single source file.
- It is acceptable to map sounds by collision strength rather than by perfect material realism.
- A simple first-pass mapping is:
  - strong collisions -> randomly choose from `powerful_impact_1.mp3` and `powerful_impact_2.mp3`
  - light collisions -> randomly choose from `weak_impact_1.mp3` and `weak_impact_2.mp3`
- Slight random variation in volume or pitch is optional if it improves feel.

## Out of Scope
- User accounts
- Multiplayer
- Level progression
- Inventory systems
- Complex scoring systems
- Advanced VFX pipelines

## Definition of Done
- The demo runs as a static site.
- The user can rotate the camera and throw bricks.
- Brick collisions and falling behavior feel believable.
- Impact sound plays on major collisions.
- The scene uses the local alleyway and brick assets.
- The demo remains responsive by limiting active brick count.

## Implementation Priority
1. First playable loop
2. Reliable physics and camera controls
3. Basic sound feedback
4. Visual polish using optional textures only if needed
