global.THREE = require('three')

const get = require('simple-get');
const pngStream = require('../')
const shoe = require('shoe')
const createComplex = require('three-simplicial-complex')(THREE)
const snowden = require('snowden')
const wsStream = require('websocket-stream')

// Our WebGL renderer with alpha and device-scaled
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
})

// 3D camera
const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000)
camera.position.set(0, 0, -9)
camera.lookAt(new THREE.Vector3(0, 0, 0))

// our Snowden scene
const scene = createScene()

// output dimensions
const gl = renderer.getContext()
const maxSize = Math.min(
  gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
  gl.getParameter(gl.MAX_TEXTURE_SIZE)
)

const aspect = 1200 / 1920;
const outputWidth = 9000;
const outputHeight = Math.floor(outputWidth / aspect);
// const outputWidth = maxSize
// const outputHeight = maxSize

console.log('Max size:', maxSize)
console.log('Output:', outputWidth, 'x', outputHeight)

// output framebuffer
const target = new THREE.WebGLRenderTarget(outputWidth, outputHeight)
target.generateMipmaps = false
target.minFilter = THREE.LinearFilter
target.format = THREE.RGBAFormat

document.body.appendChild(renderer.domElement)
document.body.style.margin = '0'
document.body.style.overflow = 'hidden'

resize()

// trigger a save on space key
window.addEventListener('keydown', ev => {
  if (ev.keyCode === 32) {
    ev.preventDefault()
    save()
  }
})

function createScene () {
  const scene = new THREE.Scene()
  const geo = createComplex(snowden)
  geo.computeFaceNormals()

  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0.7
  mesh.rotation.y = -Math.PI + 0.1
  scene.add(mesh)

  const light = new THREE.HemisphereLight(0xe3c586, 0xcb3ac2, 1)
  scene.add(light)
  return scene
}

function resize () {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)
  renderer.render(scene, camera)
}

function save () {
  // draw scene into render target
  camera.aspect = outputWidth / outputHeight
  camera.updateProjectionMatrix()
  renderer.setSize(outputWidth, outputHeight)
  renderer.setPixelRatio(1)
  renderer.render(scene, camera, target)

  resize()
  console.log('Saving PNG...')

  const stream = wsStream(getWebsocketHost())
  stream.on('error', err => {
    console.error(err)
  })

  // pipe output into websocket
  pngStream(renderer, target, {
    chunkSize: 2048
  }).pipe(stream)
}

function getWebsocketHost () {
  const protocol = document.location.protocol
  const hostname = document.location.hostname
  const port = process.env.IMAGE_SERVER_PORT
  const host = hostname + ':' + port
  const isSSL = /^https:/i.test(protocol)
  const wsProtocol = isSSL ? 'wss://' : 'ws://'
  return wsProtocol + host + '/save'
}