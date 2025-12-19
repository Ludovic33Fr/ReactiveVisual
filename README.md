# Reactive Visualizer

A web-based audio visualizer built with Three.js and the Web Audio API. It creates dynamic 3D visualizations that react to your microphone input or system audio.

## Features

- **Real-time Audio Analysis**: Uses the Web Audio API to analyze frequency data.
- **Multiple Visualization Modes**:
  - **Simple Sphere**: A pulsating wireframe icosahedron.
  - **Chaotic Sphere**: A deforming sphere with "cyber" aesthetics and lighting.
  - **Particles**: A particle system that reacts to sound frequency.
  - **Webcam Particles** (NEW): A point cloud generated from your webcam feed where depth and size react to the music's bass.

## Usage

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ludovic33Fr/ReactiveVisual.git
   ```
2. **Open the project**:
   Simply open `index.html` in a modern web browser.
   
   > **Note**: For the Webcam mode to work properly, you may need to run the project on a local server (e.g., using VS Code Live Server extension or `python -m http.server`) because some browsers restrict webcam access for local files (`file://`).

3. **Start Visualization**:
   - Click the "Démarrer la Visualisation" button.
   - Allow microphone (and webcam) access when prompted.
   - Play some music!

## Controls

- Use the dropdown menu in the top right to switch between visualization styles.

## Technologies

- HTML5 / CSS3
- JavaScript (ES6+)
- [Three.js](https://threejs.org/)
