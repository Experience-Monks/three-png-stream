global.THREE = require('three')

var pngStream = require('./')
var fs = require('fs')
var path = require('path')
var createComplex = require('three-simplicial-complex')(THREE)
var snowden = require('snowden')

// Our WebGL renderer with alpha and device-scaled
var renderer = new THREE.WebGLRenderer({
  alpha: true,
  devicePixelRatio: window.devicePixelRatio
})

// 3D camera
var camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000)
camera.position.set(0, 0, -9)
camera.lookAt(new THREE.Vector3(0, 0, 0))

// our Snowden scene
var scene = createScene()

// render to DOM for development
debugRender()

// output dimensions
var size = 1024

// output framebuffer
var target = new THREE.WebGLRenderTarget(size, size)

// trigger a save
save()

function createScene () {
  var scene = new THREE.Scene()
  var geo = createComplex(snowden)
  geo.computeFaceNormals()

  var mat = new THREE.MeshLambertMaterial({ color: 0xffffff })
  var mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0.7
  mesh.rotation.y = -Math.PI + 0.1
  scene.add(mesh)

  var light = new THREE.HemisphereLight(0xe3c586, 0xcb3ac2, 1)
  scene.add(light)
  return scene
}

// for visualizing the scene during development
function debugRender () {
  if (process.env.NODE_ENV !== 'production') {
    document.body.appendChild(renderer.domElement)
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.render(scene, camera)
  }
}

function save () {
  // draw scene into render target
  renderer.render(scene, camera, target)

  var file = path.join(__dirname, '/snowden.png')
  var output = fs.createWriteStream(file)
  
  // when file writing is done
  output.on('close', function () {
    console.log('Saved %dx%d image to %s', target.width, target.height, file)
    if (process.env.NODE_ENV === 'production') {
      window.close()
    }
  })

  pngStream(renderer.getContext(), target)
    .pipe(output)
}
