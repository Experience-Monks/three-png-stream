# three-png-stream

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

Streams a PNG encoded pixels from a ThreeJS `WebGLRenderTarget`. This is done in chunks of `gl.readPixels`, using [gl-pixel-stream](https://github.com/Jam3/gl-pixel-stream), and works with render targets upwards of 10000x10000 pixels in Chrome (dependent on your GPU).

The following transparent PNG image was generated with [demo.js](./demo.js), which uses [Electron](http://electron.atom.io/) and [hihat](https://github.com/Jam3/hihat). See [Running from Source](#running-from-source) for details.

<img src="snowden.png" width="50%" />

## Install

```sh
npm install three-png-stream --save
```

## Example

```js
var pngStream = require('three-png-stream')

// this will decide the output image size
var target = new THREE.WebGLRenderTarget(512, 512)

// draw your scene into the target
renderer.render(scene, camera, target)

// now you can write it to a new PNG file
var output = fs.createWriteStream('image.png')
var gl = renderer.getContext()
pngStream(gl, target)
  .pipe(output)
```

## Usage

[![NPM](https://nodei.co/npm/three-png-stream.png)](https://www.npmjs.com/package/three-png-stream)

#### `stream = pngStream(gl, target, [opt])`

Creates a new `stream` which reads pixel data from `target` in chunks, writing PNG encoded data.

- `gl` is the WebGLRenderingContext, from `renderer.getContext()`
- `target` is the WebGLRenderTarget; you must render to it first!
- `opt` are some optional settings:
  - `chunkSize` number of rows of pixels to read per chunk, default 128
  - `flipY` whether to flip the output on the Y axis, default `true`
  - `format` a THREE texture format to use, defaults to the format in `target`
  - `stride` the number of channels per pixel, guessed from the format (default 4)

## Running From Source

Clone and install:

```sh
git clone https://github.com/Jam3/three-png-stream.git
cd three-png-stream
npm install
```

To run in "production" mode (headless, auto-quits). This will generate `snowden.png` in the current folder.

```sh
npm run start
```

To run in "development" mode. This will open a browser with DevTools and reload on `demo.js` file save.

```sh
npm run dev
```

## License

MIT, see [LICENSE.md](http://github.com/Jam3/three-png-stream/blob/master/LICENSE.md) for details.
