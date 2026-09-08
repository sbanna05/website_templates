// Central registry of every customizable object, per mode.
//
// `mock` describes the placeholder primitive rendered today.
// `modelUrl` is left null on purpose — it's the slot for a real .glb/.gltf
// path later. The viewport (see SceneObject.vue) checks this field and
// swaps mock -> real model automatically. No other file needs to change
// when real assets are ready; just fill in the path here, e.g.:
//   modelUrl: '/models/sofa.glb'

export const sceneConfig = {
  interior: [
    {
      id: 'wall',
      label: 'Room Wall',
      defaultColor: '#e0d6bf',
      modelUrl: null,
      mock: { geometry: 'box', args: [8, 4, 0.2], position: [0, 2, -2] }
    },
    {
      id: 'table',
      label: 'Wooden Table',
      defaultColor: '#b97a00',
      modelUrl: null,
      mock: { geometry: 'box', args: [2, 1, 1], position: [1.5, 0.5, 1] }
    },
    {
      id: 'bed',
      label: 'Bed Linens',
      defaultColor: '#cfe2ff',
      modelUrl: null,
      mock: { geometry: 'box', args: [2.5, 0.6, 3.5], position: [-1.5, 0.3, 0.5] }
    }
  ],
  clothing: [
    {
      id: 'shirt',
      label: 'T-Shirt',
      defaultColor: '#03c4a6',
      modelUrl: null,
      mock: { geometry: 'cylinder', args: [1.2, 1.2, 2.5, 32], position: [0, 3, 0] }
    },
    {
      id: 'pants',
      label: 'Trousers',
      defaultColor: '#043887',
      modelUrl: null,
      mock: { geometry: 'box', args: [1.4, 2.5, 1], position: [0, 0.5, 0] }
    },
    {
      id: 'shoes',
      label: 'Shoes',
      defaultColor: '#566563',
      modelUrl: null,
      mock: { geometry: 'box', args: [1.6, 0.4, 1.4], position: [0, -1, 0.2] }
    }
  ]
}

export const palettes = {
  vibrant: ['#03c4a6', '#c4039f', '#197e04', '#2c7cf5', '#c40320', '#db7de0', '#00c0f4', '#e974c5', '#0384c4', '#d75179', '#b222a8'],
  pastel: ['#b3e9ca', '#cfe2ff', '#f5f4a6', '#fee1a2', '#ffcece', '#cca3d2', '#e0d6bf', '#b2b2b2'],
  elegant: ['#007563', '#830143', '#9cf093', '#566563', '#005a4c', '#043887', '#b97a00', '#6c1313', '#4e2099']
}
