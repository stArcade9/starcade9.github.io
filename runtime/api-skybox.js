// Skybox API for Nova64 - Create beautiful space backgrounds
// Like Deserted Space quality
import * as THREE from 'three';

export function skyboxApi(gpu) {
  let skyboxMesh = null;
  let starField = null;
  
  function createSpaceSkybox(options = {}) {
    const {
      starCount = 1000,
      starSize = 2,
      nebulae = true,
      nebulaColor = 0x4422aa,
      galaxySpiral = true
    } = options;
    
    // Remove old skybox
    if (skyboxMesh) {
      gpu.scene.remove(skyboxMesh);
    }
    if (starField) {
      gpu.scene.remove(starField);
    }
    
    // Create star field
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    const starColors = [];
    
    for (let i = 0; i < starCount; i++) {
      // Random position in sphere
      const radius = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      starPositions.push(x, y, z);
      
      // Random star colors (white, blue, yellow, red)
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        // White stars (most common)
        starColors.push(1, 1, 1);
      } else if (colorChoice < 0.85) {
        // Blue stars
        starColors.push(0.7, 0.8, 1);
      } else if (colorChoice < 0.95) {
        // Yellow stars
        starColors.push(1, 1, 0.7);
      } else {
        // Red stars
        starColors.push(1, 0.7, 0.6);
      }
    }
    
    starGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color',
      new THREE.Float32BufferAttribute(starColors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      size: starSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    starField = new THREE.Points(starGeometry, starMaterial);
    gpu.scene.add(starField);
    
    // Create nebula background (if enabled)
    if (nebulae) {
      const skyboxGeometry = new THREE.SphereGeometry(800, 32, 32);
      
      // Create gradient material for nebula
      const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      
      const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 color = mix(bottomColor, topColor, max(h * 0.5 + 0.5, 0.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `;
      
      const skyboxMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          topColor: { value: new THREE.Color(0x000511) },
          bottomColor: { value: new THREE.Color(nebulaColor) }
        },
        side: THREE.BackSide,
        depthWrite: false
      });
      
      skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
      gpu.scene.add(skyboxMesh);
    }
    
    console.log(`✨ Space skybox created with ${starCount} stars`);
    return { starField, skyboxMesh };
  }
  
  function setFog(color, near, far) {
    gpu.scene.fog = new THREE.Fog(color, near, far);
  }
  
  function clearFog() {
    gpu.scene.fog = null;
  }
  
  function animateSkybox(dt) {
    if (starField) {
      starField.rotation.y += dt * 0.01;
    }
  }
  
  function clearSkybox() {
    console.log('🧹 Clearing skybox...');
    
    // Remove skybox mesh
    if (skyboxMesh) {
      gpu.scene.remove(skyboxMesh);
      if (skyboxMesh.geometry) skyboxMesh.geometry.dispose();
      if (skyboxMesh.material) skyboxMesh.material.dispose();
      skyboxMesh = null;
    }
    
    // Remove star field
    if (starField) {
      gpu.scene.remove(starField);
      if (starField.geometry) starField.geometry.dispose();
      if (starField.material) starField.material.dispose();
      starField = null;
    }
    
    console.log('✅ Skybox cleared');
  }
  
  return {
    exposeTo(target) {
      Object.assign(target, {
        createSpaceSkybox,
        setFog,
        clearFog,
        animateSkybox,
        clearSkybox
      });
    }
  };
}
