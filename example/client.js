global.THREE = require('three')

const assign = require('object-assign')
const qs = require('query-string')
const pngStream = require('../')
const createComplex = require('three-simplicial-complex')(THREE)
const snowden = require('snowden')
const wsStream = require('websocket-stream')
const noop = () => {}

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
const maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)

const outputWidth = 2048
const outputHeight = 2048

console.log('Max RenderBuffer Size:', maxSize)
console.log('Output: %dx%d', outputWidth, outputHeight)

// output framebuffer
const target = new THREE.WebGLRenderTarget(outputWidth, outputHeight)
target.generateMipmaps = false
target.minFilter = THREE.LinearFilter
target.format = THREE.RGBAFormat

assign(document.body.style, {
  margin: '0',
  cursor: 'pointer',
  overflow: 'hidden'
})

document.body.appendChild(renderer.domElement)

resize()
window.addEventListener('resize', resize)

var loader = document.createElement('div')
assign(loader.style, {
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.5)',
  position: 'absolute',
  left: '0',
  color: 'white',
  padding: '10px',
  font: '14px Helvetica, sans-serif',
  color: 'white',
  top: '0',
  display: 'none'
})
document.body.appendChild(loader)

// trigger a save on space key
var saving = false
renderer.domElement.addEventListener('click', ev => {
  if (saving) return
  loader.innerText = 'Saving...'
  loader.style.display = 'block'
  saving = true
  ev.preventDefault()
  save(() => {
    loader.style.display = 'none'
    saving = false
  })
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

function save (cb = noop) {
  // draw scene into render target
  camera.aspect = outputWidth / outputHeight
  camera.updateProjectionMatrix()
  console.log('Rendering...')
  renderer.render(scene, camera, target, true)
  gl.finish()
  renderer.setRenderTarget(null)

  resize()
  console.log('Saving PNG...')

  // pipe output into websocket
  const imageStream = pngStream(renderer, target, {
    chunkSize: 1024,
    onProgress: (ev) => {
      const { current, total } = ev
      loader.innerText = `Writing chunk ${current} of ${total}`
      console.log(loader.innerText)
    }
  })

  const url = getURL({
    file: 'snowden.png'
  })
  const stream = wsStream(url)
  stream.on('error', err => {
    console.error(err)
    loader.innerText = err.message
    cb()
    cb = noop
  }).on('finish', () => {
    cb()
    cb = noop
  })
  imageStream.on('error', err => console.error(err))
  imageStream.pipe(stream)
}

function getURL (opt = {}) {
  const protocol = document.location.protocol
  const hostname = document.location.hostname
  const port = process.env.IMAGE_SERVER_PORT
  const host = hostname + ':' + port
  const isSSL = /^https:/i.test(protocol)
  const wsProtocol = isSSL ? 'wss://' : 'ws://'
  return wsProtocol + host + '/save?' + qs.stringify(opt)
}
