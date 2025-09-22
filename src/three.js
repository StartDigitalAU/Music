import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const NoiseShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.085 },
    time: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float time;
    varying vec2 vUv;
    
    float random(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = random(vUv + time) * 2.0 - 1.0;
      color.rgb += noise * amount;
      gl_FragColor = color;
    }
  `,
};

class PlayerModelThree {
  constructor(container) {
    this.container = container;
    this.aspect = window.innerWidth / window.innerHeight;
    this.time = 0;
    this.clock = new THREE.Clock();
    this.mouse = { x: 0, y: 0 };
    this.targetCameraPos = { x: 0, y: 1.25, z: 3.5 };
    this.init();
  }

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createPostProcessing();
    this.createEnvironment();
    this.loadModels();
    this.addEventListeners();
    this.render();
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.cssScene = new THREE.Scene();
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(55, this.aspect, 0.1, 2000);
    this.camera.position.set(0, 1.25, 3.5);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0";
    this.container.appendChild(this.renderer.domElement);

    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    this.cssRenderer.domElement.style.position = "absolute";
    this.cssRenderer.domElement.style.top = "0";
    this.cssRenderer.domElement.style.pointerEvents = "none";
    this.container.appendChild(this.cssRenderer.domElement);
  }

  createPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.ssaoPass = new SSAOPass(
      this.scene,
      this.camera,
      window.innerWidth,
      window.innerHeight
    );
    this.ssaoPass.kernelRadius = 16;
    this.ssaoPass.minDistance = 0.001;
    this.ssaoPass.maxDistance = 0.1;

    this.composer.addPass(this.ssaoPass);

    this.noisePass = new ShaderPass(NoiseShader);
    this.composer.addPass(this.noisePass);
  }

  createEnvironment() {
    const environment = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileCubemapShader();
    const envMap = pmremGenerator.fromScene(environment).texture;
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 2.0;
  }

  loadModels() {
    const modelPath = import.meta.env.BASE_URL + "player.glb";

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
    );

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(modelPath, (gltf) => {
      this.playerModel = gltf.scene;

      this.playerModel.traverse((child) => {
        if (child.userData.name == "Screen") {
          this.screenObject = child;
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0x000000,
            metalness: 0.4,
            roughness: 0,
            opacity: 1,
            transparent: true,
          });

          this.createHTMLScreen();
          this.syncScreenPosition();
        }
      });
      this.scene.add(this.playerModel);
    });
  }

  createHTMLScreen() {
    const htmlElement = document.createElement("div");
    htmlElement.style.width = "1024px";
    htmlElement.style.height = "682px";
    htmlElement.style.borderRadius = "100px";
    htmlElement.style.color = "#fff";
    htmlElement.style.overflow = "hidden";
    htmlElement.style.boxSizing = "border-box";
    htmlElement.style.display = "flex";
    htmlElement.style.flexDirection = "column";
    htmlElement.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    htmlElement.innerHTML = `
      <style>
        .music-player {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .header {
          text-align: center;
          padding: 48px;
        }
        .menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .menu-item {
          padding: 24px 48px;
          font-weight: 600;
          font-size: 40px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .menu-item:hover {
        color: #000;
          background: rgba(255, 255, 255, 1.0);
        }
        .menu-item .icon {
          opacity: 0.7;
          font-size: 16px;
        }
        .menu-item:hover .icon {
          opacity: 1;
        }
        .now-playing {
          background: rgba(255, 255, 255, 0.1);
          border-left: 3px solid #ffffff;
        }
      </style>
      <div class="music-player">
        <div class="header">
          <svg height="48" viewBox="0 0 166 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M149.188 1.10353V4.5314H155.519V20.6874H159.442V4.5314H165.769V1.10353H149.188Z" fill="#DEDEDE"/>
            <path d="M146.838 10.397C147.398 9.48588 147.677 8.3891 147.677 7.11353C147.677 5.16752 147.007 3.67535 145.653 2.66452C144.331 1.66057 142.407 1.16891 139.916 1.16891H132.421V20.7528H136.244V13.4226H140.363C140.559 13.4054 140.741 13.3848 140.909 13.3676L144.516 20.7528H148.748L144.489 12.4668C145.519 11.9545 146.303 11.2669 146.838 10.397ZM147.505 7.11353V7.34733C147.501 7.38859 147.498 7.42641 147.495 7.46767C147.498 7.35077 147.505 7.23387 147.505 7.11697V7.11353ZM145.67 2.89488C145.732 2.94302 145.787 3.00147 145.846 3.05304C145.749 2.96708 145.657 2.88113 145.55 2.80205L145.67 2.89488ZM140.147 1.34426C140.274 1.34426 140.391 1.35458 140.514 1.35801C140.315 1.35114 140.123 1.34426 139.916 1.34426H140.147ZM140.696 13.2163L140.349 13.2507C140.593 13.2301 140.813 13.206 141.012 13.1854C140.913 13.1957 140.806 13.206 140.696 13.2197V13.2163ZM143.067 9.37586L142.96 9.46525C142.386 9.93628 141.421 10.1907 140.02 10.1907H136.248V4.40081H139.786C141.28 4.40081 142.318 4.6346 142.936 5.06781C143.541 5.49071 143.857 6.18179 143.857 7.1823C143.857 8.18281 143.585 8.90827 143.067 9.3793V9.37586Z" fill="#DEDEDE"/>
            <path d="M32.3947 8.94408H23.8892V1.24942H19.9662V20.8333H23.8892V12.506H32.3947V20.8333H36.2834V1.24942H32.3947V8.94408Z" fill="#DEDEDE"/>
            <path d="M113.829 1.16891H97.2468V4.60022H103.574V20.7528H107.497V4.60022H113.829V1.16891Z" fill="#DEDEDE"/>
            <path d="M94.502 11.2668C93.5573 10.3866 92.0768 9.75053 90.0809 9.34482L86.9274 8.73627L86.7247 8.69845C85.8041 8.51622 85.1377 8.2618 84.7048 7.94548L84.6155 7.87672C84.1758 7.51571 83.9491 7.00686 83.9491 6.31922C83.9491 5.48718 84.2617 4.87862 84.8835 4.47292C85.5155 4.0569 86.4877 3.83685 87.8206 3.83685C89.0641 3.83685 89.971 4.06721 90.5687 4.50042V4.50386C91.187 4.91644 91.6439 5.6144 91.9222 6.62866L91.9565 6.75587H95.694L95.6734 6.56677L95.6219 6.0923V6.08543V6.07855L95.591 5.91008C95.2543 4.18755 94.4608 2.87416 93.1898 1.99055C91.8913 1.08287 90.0981 0.639343 87.824 0.639343C85.4915 0.639343 83.6193 1.11037 82.2246 2.06963L82.0906 2.16246C80.6753 3.19048 79.9643 4.62764 79.9643 6.44644C79.9643 8.09676 80.4761 9.39984 81.5135 10.3247L81.6132 10.4107C82.6471 11.2805 84.2651 11.9028 86.4362 12.2913L89.0194 12.7555H89.0229C90.1153 12.9309 90.871 13.2334 91.321 13.6426L91.3279 13.6494C91.7882 14.0311 92.0287 14.5743 92.0287 15.3066C92.0287 16.2487 91.7126 16.9295 91.1046 17.3833C90.4863 17.844 89.5347 18.0881 88.2259 18.0881C86.79 18.0881 85.7079 17.8475 84.9556 17.3833L84.8113 17.287C84.0865 16.7679 83.6296 15.953 83.4578 14.815L83.4338 14.6706H79.5211L79.5383 14.8562C79.7169 16.9535 80.5345 18.5592 81.991 19.6559C83.4682 20.7493 85.519 21.2822 88.1229 21.2822C90.555 21.2822 92.4855 20.7562 93.894 19.6869C95.3093 18.5901 96.0169 17.0911 96.0169 15.2035C96.0169 13.5841 95.5497 12.2913 94.5982 11.3527L94.5054 11.2633L94.502 11.2668Z" fill="#DEDEDE"/>
            <path d="M67.2467 11.2976C64.1207 10.9022 61.4893 13.5358 61.8809 16.668C62.1489 18.7997 63.8699 20.5256 66.0032 20.7938C69.1326 21.1892 71.764 18.5556 71.3689 15.4234C71.101 13.2917 69.38 11.5657 67.2467 11.2976Z" fill="#DEDEDE"/>
            <path d="M118.897 1.16891L118.855 1.27894L111.308 20.7528H115.324L117.079 16.0081H124.829L126.578 20.6393L126.619 20.7494H130.734L123.177 1.16891H118.897ZM118.165 12.7453L120.937 5.09188L123.771 12.7453H118.165Z" fill="#DEDEDE"/>
            <path d="M0.855957 4.68073H7.18702V20.8333H11.11V4.68073H17.4377V1.24942H0.855957V4.68073Z" fill="#DEDEDE"/>
            <path d="M39.8958 20.8333H53.7293V17.6049H43.7878V12.4063H52.9323V9.17787H43.7878V4.48131H53.7293V1.24942H39.8958V20.8333Z" fill="#DEDEDE"/>
            </svg>
        </div>
        <div class="menu">
          <div class="menu-item now-playing">
            <span>♪  Now Playing</span>
            <span class="icon">⏸</span>
          </div>
          <div class="menu-item">
            <span>The Start Radio</span>
            <span class="icon">→</span>
          </div>
          <div class="menu-item">
            <span>Favourite Albums</span>
            <span class="icon">→</span>
          </div>
          <div class="menu-item">
            <span>Staff Playlists</span>
            <span class="icon">→</span>
          </div>
        </div>
      </div>
    `;

    this.cssObject = new CSS3DObject(htmlElement);
    this.cssObject.scale.set(0.0015, 0.0015, 0.0015);
    this.cssObject.rotation.x = -Math.PI / 2;

    this.cssGroup = new THREE.Group();
    this.cssGroup.add(this.cssObject);
    this.cssScene.add(this.cssGroup);
  }

  syncScreenPosition() {
    if (!this.screenObject || !this.cssGroup) return;

    const screenWorldMatrix = new THREE.Matrix4();
    this.screenObject.updateMatrixWorld();
    screenWorldMatrix.copy(this.screenObject.matrixWorld);

    this.cssGroup.position.setFromMatrixPosition(screenWorldMatrix);
    this.cssGroup.rotation.setFromRotationMatrix(screenWorldMatrix);

    const scale = new THREE.Vector3();
    scale.setFromMatrixScale(screenWorldMatrix);
    this.cssGroup.scale.setFromMatrixScale(screenWorldMatrix);
  }

  addEventListeners() {
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.targetCameraPos.x = this.mouse.x * 0.75;
      this.targetCameraPos.y = 1.25 + this.mouse.y * 0.3;
    });

    window.addEventListener("resize", () => this.resize());
  }

  render() {
    requestAnimationFrame(() => this.render());
    this.composer.render();
    this.cssRenderer.render(this.cssScene, this.camera);
    this.animate();
  }

  animate() {
    this.time += this.clock.getDelta();
    this.noisePass.uniforms.time.value = this.time;
    this.cameraRig();
    this.modelFloat();
    this.syncScreenPosition();
  }

  cameraRig() {
    this.camera.position.x = THREE.MathUtils.lerp(
      this.camera.position.x,
      this.targetCameraPos.x,
      0.05
    );
    this.camera.position.y = THREE.MathUtils.lerp(
      this.camera.position.y,
      this.targetCameraPos.y,
      0.05
    );
    this.camera.lookAt(0, 1.3, 0);
  }

  modelFloat() {
    if (!this.playerModel) return;
    this.playerModel.position.y = Math.sin(this.time) * 0.1;
    this.playerModel.rotation.y = Math.sin(this.time * 0.5) * Math.PI * 0.05;
  }

  resize() {
    this.aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.ssaoPass.setSize(window.innerWidth, window.innerHeight);
  }
}

export default PlayerModelThree;
