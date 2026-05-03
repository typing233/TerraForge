import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VegetationType } from './vegetation';

// 渲染模式
export const RenderMode = {
  SOLID: 'solid',
  WIREFRAME: 'wireframe',
  NORMALS: 'normals',
  HEATMAP: 'heatmap',
  COMBINED: 'combined',
  BIOME: 'biome'
};

// 地形渲染器
export class TerrainRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    this.terrainMesh = null;
    this.terrainGeometry = null;
    this.terrainMaterial = null;
    this.biomeMaterial = null;
    
    this.waterPlane = null;
    this.waterMesh = null;
    this.waterMaterial = null;
    
    this.vegetationGroup = null;
    this.vegetationMeshes = [];
    
    this.brushIndicator = null;
    this.brushVisible = false;
    
    this.ambientLight = null;
    this.sunLight = null;
    this.hemiLight = null;
    
    this.renderMode = RenderMode.SOLID;
    this.animationId = null;
    
    this.useBiomeColors = false;
    
    this.init();
  }
  
  init() {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 100, 500);
    
    // 创建相机
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    this.camera.position.set(0, 80, 150);
    
    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    // 创建控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.target.set(0, 20, 0);
    
    // 设置光照
    this.setupLights();
    
    // 创建默认材质
    this.createMaterials();
    
    // 创建笔刷指示器
    this.createBrushIndicator();
    
    // 创建植被组
    this.vegetationGroup = new THREE.Group();
    this.scene.add(this.vegetationGroup);
    
    // 添加网格辅助
    const gridHelper = new THREE.GridHelper(200, 100, 0x444444, 0x333333);
    gridHelper.position.y = -0.5;
    this.scene.add(gridHelper);
    
    // 保存绑定的 resize 处理器引用，以便在 dispose 时正确移除
    this._onResize = this.onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    
    // 开始渲染循环
    this.animate();
  }
  
  setupLights() {
    // 环境光
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.ambientLight);
    
    // 主方向光（太阳）
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);
    
    // 半球光
    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d5c3d, 0.4);
    this.scene.add(this.hemiLight);
  }
  
  // ============ 动态光照方法 ============
  
  updateLighting(lightState) {
    if (!lightState) return;
    
    if (this.ambientLight && lightState.ambientColor !== undefined) {
      this.ambientLight.color.set(lightState.ambientColor);
      if (lightState.ambientIntensity !== undefined) {
        this.ambientLight.intensity = lightState.ambientIntensity;
      }
    }
    
    if (this.sunLight) {
      if (lightState.sunColor !== undefined) {
        this.sunLight.color.set(lightState.sunColor);
      }
      if (lightState.sunIntensity !== undefined) {
        this.sunLight.intensity = lightState.sunIntensity;
      }
      if (lightState.sunPosition !== undefined) {
        const pos = lightState.sunPosition;
        this.sunLight.position.set(pos.x, pos.y, pos.z);
      }
    }
    
    if (this.hemiLight) {
      if (lightState.skyColor !== undefined) {
        this.hemiLight.color.set(lightState.skyColor);
      }
      if (lightState.groundColor !== undefined) {
        this.hemiLight.groundColor.set(lightState.groundColor);
      }
      if (lightState.hemiIntensity !== undefined) {
        this.hemiLight.intensity = lightState.hemiIntensity;
      }
    }
    
    if (lightState.skyColor !== undefined && this.scene) {
      this.scene.background.set(lightState.skyColor);
      if (this.scene.fog) {
        this.scene.fog.color.set(lightState.skyColor);
      }
    }
  }
  
  // ============ 群系颜色渲染方法 ============
  
  createBiomeShaderMaterial() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        biomeTexture: { value: null },
        textureSize: { value: 256 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D biomeTexture;
        uniform float textureSize;
        varying vec2 vUv;
        
        void main() {
          vec4 biomeColor = texture2D(biomeTexture, vUv);
          gl_FragColor = biomeColor;
        }
      `
    });
    return material;
  }
  
  updateTerrainColors(biomeSystem) {
    if (!biomeSystem || !this.terrainMesh) return;
    
    const canvas = biomeSystem.getCanvas();
    if (!canvas) return;
    
    const biomeTexture = new THREE.CanvasTexture(canvas);
    biomeTexture.needsUpdate = true;
    
    if (!this.biomeMaterial) {
      this.biomeMaterial = new THREE.MeshStandardMaterial({
        map: biomeTexture,
        roughness: 0.9,
        metalness: 0.0
      });
    } else {
      this.biomeMaterial.map = biomeTexture;
      this.biomeMaterial.needsUpdate = true;
    }
    
    this.useBiomeColors = true;
    
    if (this.renderMode === RenderMode.SOLID || this.renderMode === RenderMode.BIOME) {
      this.terrainMesh.material = this.biomeMaterial;
      this.terrainMesh.material.needsUpdate = true;
    }
  }
  
  // ============ 相机路径方法 ============
  
  updateCameraFromKeyframe(keyframe) {
    if (!keyframe || !this.camera) return;
    
    if (keyframe.position) {
      this.camera.position.set(
        keyframe.position.x,
        keyframe.position.y,
        keyframe.position.z
      );
    }
    
    if (keyframe.target) {
      this.controls.target.set(
        keyframe.target.x,
        keyframe.target.y,
        keyframe.target.z
      );
      this.controls.update();
    }
    
    if (keyframe.rotation) {
      this.camera.rotation.set(
        keyframe.rotation.x,
        keyframe.rotation.y,
        keyframe.rotation.z
      );
    }
    
    if (keyframe.fov !== undefined && this.camera.isPerspectiveCamera) {
      this.camera.fov = keyframe.fov;
      this.camera.updateProjectionMatrix();
    }
  }
  
  getCameraState() {
    if (!this.camera) return null;
    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target: {
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z
      },
      fov: this.camera.isPerspectiveCamera ? this.camera.fov : 45
    };
  }
  
  // ============ 其他辅助方法 ============
  
  getCanvas() {
    return this.renderer ? this.renderer.domElement : null;
  }
  
  captureScreenshot() {
    const canvas = this.getCanvas();
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  }
  
  setCameraPosition(x, y, z) {
    if (this.camera) {
      this.camera.position.set(x, y, z);
    }
  }
  
  setCameraTarget(x, y, z) {
    if (this.controls) {
      this.controls.target.set(x, y, z);
      this.controls.update();
    }
  }
  
  createMaterials() {
    // 基础材质（基于高度的颜色混合）
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a7c40,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });
    
    // 线框材质
    this.wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true
    });
    
    // 法线材质
    this.normalMaterial = new THREE.MeshNormalMaterial();
    
    // 高度着色器材质
    this.heatmapMaterial = this.createHeatmapMaterial();
  }
  
  createHeatmapMaterial() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        minHeight: { value: 0 },
        maxHeight: { value: 100 }
      },
      vertexShader: `
        varying float vHeight;
        void main() {
          vHeight = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vHeight;
        uniform float minHeight;
        uniform float maxHeight;
        
        vec3 getHeatColor(float t) {
          vec3 blue = vec3(0.0, 0.0, 1.0);
          vec3 cyan = vec3(0.0, 1.0, 1.0);
          vec3 green = vec3(0.0, 1.0, 0.0);
          vec3 yellow = vec3(1.0, 1.0, 0.0);
          vec3 red = vec3(1.0, 0.0, 0.0);
          
          if (t < 0.25) {
            return mix(blue, cyan, t * 4.0);
          } else if (t < 0.5) {
            return mix(cyan, green, (t - 0.25) * 4.0);
          } else if (t < 0.75) {
            return mix(green, yellow, (t - 0.5) * 4.0);
          } else {
            return mix(yellow, red, (t - 0.75) * 4.0);
          }
        }
        
        void main() {
          float t = clamp((vHeight - minHeight) / (maxHeight - minHeight), 0.0, 1.0);
          vec3 color = getHeatColor(t);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    
    return material;
  }
  
  createBrushIndicator() {
    const geometry = new THREE.RingGeometry(0, 1, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    this.brushIndicator = new THREE.Mesh(geometry, material);
    this.brushIndicator.rotation.x = -Math.PI / 2;
    this.brushIndicator.visible = false;
    this.scene.add(this.brushIndicator);
  }
  
  // 更新地形
  updateTerrain(meshData, scale = 100, heightScale = 50) {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      if (this.terrainGeometry) {
        this.terrainGeometry.dispose();
      }
    }
    
    if (!meshData || !meshData.positions) {
      return;
    }
    
    // 创建几何体
    this.terrainGeometry = new THREE.BufferGeometry();
    this.terrainGeometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    this.terrainGeometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    this.terrainGeometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
    this.terrainGeometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    
    this.terrainGeometry.computeVertexNormals();
    this.terrainGeometry.computeBoundingBox();
    this.terrainGeometry.computeBoundingSphere();
    
    // 创建网格
    this.terrainMesh = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial);
    this.terrainMesh.castShadow = true;
    this.terrainMesh.receiveShadow = true;
    
    this.scene.add(this.terrainMesh);
    
    // 更新热图材质的高度范围
    if (meshData.heightmap) {
      let min = Infinity;
      let max = -Infinity;
      for (const h of meshData.heightmap) {
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
      this.heatmapMaterial.uniforms.minHeight.value = min * heightScale;
      this.heatmapMaterial.uniforms.maxHeight.value = max * heightScale;
    }
    
    this.updateRenderMode();
  }
  
  // 更新水面
  updateWater(waterLevel = 0.3, scale = 100, heightScale = 50) {
    if (this.waterMesh) {
      this.scene.remove(this.waterMesh);
      if (this.waterPlane) {
        this.waterPlane.dispose();
      }
      if (this.waterMaterial) {
        this.waterMaterial.dispose();
      }
    }
    
    const waterHeight = waterLevel * heightScale;
    
    // 创建水面几何
    this.waterPlane = new THREE.PlaneGeometry(scale * 1.1, scale * 1.1);
    this.waterPlane.rotateX(-Math.PI / 2);
    
    // 水面材质
    this.waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    
    this.waterMesh = new THREE.Mesh(this.waterPlane, this.waterMaterial);
    this.waterMesh.position.y = waterHeight;
    this.waterMesh.receiveShadow = true;
    
    this.scene.add(this.waterMesh);
  }
  
  // 隐藏水面
  hideWater() {
    if (this.waterMesh) {
      this.waterMesh.visible = false;
    }
  }
  
  // 显示水面
  showWater() {
    if (this.waterMesh) {
      this.waterMesh.visible = true;
    }
  }
  
  // 更新植被
  updateVegetation(instances, scale = 100) {
    // 清除现有植被
    this.clearVegetation();
    
    if (!instances || instances.length === 0) {
      return;
    }
    
    // 为每种植被类型创建几何体和材质
    const geometries = this.createVegetationGeometries();
    const materials = this.createVegetationMaterials();
    
    for (const instance of instances) {
      const geometry = geometries[instance.type] || geometries[VegetationType.GRASS];
      const material = materials[instance.type] || materials[VegetationType.GRASS];
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // 设置位置
      mesh.position.set(instance.x, instance.y, instance.z);
      
      // 设置旋转（Y轴）
      mesh.rotation.y = instance.rotation;
      
      // 设置缩放
      mesh.scale.set(instance.scale, instance.scale, instance.scale);
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      this.vegetationGroup.add(mesh);
      this.vegetationMeshes.push(mesh);
    }
  }
  
  // 创建植被几何体
  createVegetationGeometries() {
    const geometries = {};
    
    // 草丛（三角形平面）
    const grassGeometry = new THREE.ConeGeometry(0.3, 1.5, 4);
    geometries[VegetationType.GRASS] = grassGeometry;
    
    // 灌木（球体）
    const bushGeometry = new THREE.SphereGeometry(1, 8, 8);
    geometries[VegetationType.BUSH] = bushGeometry;
    
    // 低树（圆柱体 + 球体）
    const treeLowGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 6);
    geometries[VegetationType.TREE_LOW] = treeLowGeometry;
    
    // 中树（更高的圆柱体 + 球体）
    const treeMediumGeometry = new THREE.CylinderGeometry(0.6, 0.6, 6, 6);
    geometries[VegetationType.TREE_MEDIUM] = treeMediumGeometry;
    
    // 高树
    const treeHighGeometry = new THREE.CylinderGeometry(0.7, 0.7, 8, 6);
    geometries[VegetationType.TREE_HIGH] = treeHighGeometry;
    
    return geometries;
  }
  
  // 创建植被材质
  createVegetationMaterials() {
    const materials = {};
    
    // 草丛材质
    materials[VegetationType.GRASS] = new THREE.MeshStandardMaterial({
      color: 0x4a7c2a,
      roughness: 0.9
    });
    
    // 灌木材质
    materials[VegetationType.BUSH] = new THREE.MeshStandardMaterial({
      color: 0x3d6b2a,
      roughness: 0.8
    });
    
    // 树干材质
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9
    });
    
    materials[VegetationType.TREE_LOW] = trunkMaterial;
    materials[VegetationType.TREE_MEDIUM] = trunkMaterial;
    materials[VegetationType.TREE_HIGH] = trunkMaterial;
    
    return materials;
  }
  
  // 清除植被
  clearVegetation() {
    const disposedGeometries = new Set();
    for (const mesh of this.vegetationMeshes) {
      this.vegetationGroup.remove(mesh);
      if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
        disposedGeometries.add(mesh.geometry);
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        mesh.material.dispose();
      }
    }
    this.vegetationMeshes = [];
  }
  
  // 设置渲染模式
  setRenderMode(mode) {
    this.renderMode = mode;
    this.updateRenderMode();
  }
  
  updateRenderMode() {
    if (!this.terrainMesh) return;
    
    switch (this.renderMode) {
      case RenderMode.WIREFRAME:
        this.terrainMesh.material = this.wireframeMaterial;
        break;
      case RenderMode.NORMALS:
        this.terrainMesh.material = this.normalMaterial;
        break;
      case RenderMode.HEATMAP:
        this.terrainMesh.material = this.heatmapMaterial;
        break;
      default:
        this.terrainMesh.material = this.terrainMaterial;
    }
  }
  
  // 更新笔刷指示器
  updateBrushIndicator(worldX, worldZ, radius, visible = true) {
    if (!this.brushIndicator) return;
    
    this.brushIndicator.visible = visible;
    if (!visible) return;
    
    // 计算高度（从地形采样）
    let y = 0;
    if (this.terrainMesh && this.terrainGeometry) {
      // 简单方式：在指定位置查找高度
      const raycaster = new THREE.Raycaster();
      
      // 从上方发射射线
      raycaster.set(new THREE.Vector3(worldX, 200, worldZ), new THREE.Vector3(0, -1, 0));
      
      const intersects = raycaster.intersectObject(this.terrainMesh);
      if (intersects.length > 0) {
        y = intersects[0].point.y + 0.1;
      }
    }
    
    this.brushIndicator.position.set(worldX, y, worldZ);
    this.brushIndicator.scale.set(radius, radius, radius);
  }
  
  // 隐藏笔刷
  hideBrush() {
    if (this.brushIndicator) {
      this.brushIndicator.visible = false;
    }
  }
  
  // 屏幕坐标转地形坐标
  screenToTerrain(screenX, screenY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    
    if (this.terrainMesh) {
      const intersects = raycaster.intersectObject(this.terrainMesh);
      if (intersects.length > 0) {
        return {
          x: intersects[0].point.x,
          y: intersects[0].point.y,
          z: intersects[0].point.z,
          uv: intersects[0].uv
        };
      }
    }
    
    return null;
  }
  
  // 获取 DOM 元素
  getDomElement() {
    return this.renderer.domElement;
  }
  
  // 窗口大小调整
  onResize() {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  // 渲染循环
  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  // 销毁
  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
    }
    
    this.clearVegetation();
    
    if (this.terrainGeometry) {
      this.terrainGeometry.dispose();
    }
    
    if (this.waterPlane) {
      this.waterPlane.dispose();
    }
    
    if (this.waterMaterial) {
      this.waterMaterial.dispose();
    }
    
    if (this.terrainMaterial) {
      this.terrainMaterial.dispose();
    }
    
    if (this.wireframeMaterial) {
      this.wireframeMaterial.dispose();
    }
    
    if (this.normalMaterial) {
      this.normalMaterial.dispose();
    }
    
    if (this.heatmapMaterial) {
      this.heatmapMaterial.dispose();
    }
    
    if (this.brushIndicator) {
      if (this.brushIndicator.geometry) {
        this.brushIndicator.geometry.dispose();
      }
      if (this.brushIndicator.material) {
        this.brushIndicator.material.dispose();
      }
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}

export default TerrainRenderer;