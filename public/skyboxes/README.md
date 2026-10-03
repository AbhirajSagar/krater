# Space Skyboxes

This folder contains space skyboxes for the game.
On launch, the game randomly selects and loads one of the skyboxes from this directory.

## Current Skyboxes
- **`purple_nebula`**: Swirling violet and magenta cosmic dust with glowing star clusters.
- **`blue_nebula`**: Azure, electric cyan, and turquoise interstellar nursery.
- **`deep_space`**: Pitch-black stellar cosmos filled with twinkling stars and galaxies.
- **`golden_galaxy`**: Radiant amber and warm galactic plane core.

## How to Add Your Own Skybox

You can add your own skyboxes in standard CubeMap format:

1. Create a new folder here (e.g. `public/skyboxes/my_awesome_skybox/`).
2. Place the 6 cubemap faces inside it named:
   - `px.png` (Positive X / Right)
   - `nx.png` (Negative X / Left)
   - `py.png` (Positive Y / Top)
   - `ny.png` (Negative Y / Bottom)
   - `pz.png` (Positive Z / Front)
   - `nz.png` (Negative Z / Back)
   *(JPEG `.jpg` is also supported)*
3. Add an entry to `skyboxes.json` or configure it in `src/SkyboxManager.js`.

Example `skyboxes.json` entry:
```json
{
  "id": "my_awesome_skybox",
  "name": "My Awesome Skybox",
  "type": "cube",
  "path": "/skyboxes/my_awesome_skybox/",
  "files": ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]
}
```
