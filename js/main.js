///////////////////////////////////////////////// SETUP

var scene = new THREE.Scene();
var viewSize = 50;
var aspectRatio = window.innerWidth / window.innerHeight;
//var camera = new THREE.PerspectiveCamera( 75, aspectRatio, 0.1, 1000 );
var camera = new THREE.OrthographicCamera( -aspectRatio * viewSize / 2, aspectRatio * viewSize /2, viewSize / 2, -viewSize /2, -1000, 1000)
scene.add( camera );

camera.position.x = 10;
camera.position.y = 5;
camera.position.z = 15;
camera.lookAt(scene.position);

var light = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(light);

var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
directionalLight.position = (1, 1, 1);
scene.add( directionalLight );

var renderer = new THREE.WebGLRenderer();
// var renderer = new THREE.SVGRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
renderer.setClearColor( 0xffffff, 1 );

var controls = new THREE.OrbitControls(camera, renderer.domElement);
var axesHelper = new THREE.AxesHelper( 250 );
scene.add( axesHelper );

///////////////////////////////////////////////// MATERIALS 

var clear = new THREE.MeshLambertMaterial({ 
  color: 0x000000,
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
});

var clear2 = new THREE.MeshLambertMaterial({ 
  color: 0x000000,
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
});


var line_mat = new THREE.LineBasicMaterial( {
	color: 0xff0000,
	linewidth: 1,
} );

var color = new THREE.MeshLambertMaterial( {
   color: 0xff8000, 
   wireframe: false 
} );

///////////////////////////////////////////////// ASSEMBLY & PATH FUNCTIONS

var spheres = []; // mesh array
var ass = new Assembly(); // main data-structure

var geometry = new THREE.SphereGeometry(1, 32, 32);

var MAX_POINTS = 30000;
var drawCount = -1;
var index = -1;
var line_geometry = new THREE.BufferGeometry();
var positions = new Float32Array( MAX_POINTS * 3 ); // 3 vertices per point
line_geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
line_geometry.setDrawRange(0, drawCount);

var path = new THREE.Line(line_geometry, line_mat);
scene.add( path );

function createAssembly() {  // creates meshes for each sphere
  for (var i = 0; i < ass.size; i++) {
    if (spheres[i] === undefined) {
      var ball = ass.balls[i];
      var geometry = new THREE.SphereBufferGeometry(ball.r, 32, 32);
      var tmp = new THREE.Mesh (geometry, clear);
      spheres[i] = tmp;
      scene.add( spheres[i] );
    }
  }
}
createAssembly();
updateSelection(0);

function updateAssembly( play ) { // updates position of each sphere and path points
  for (var k = 0; k < ass.speed; k++) {
    if (play) ass.update();
    for (var i = 0; i < ass.size; i++) {
      var tmp = new THREE.Vector3(0,0,0);
      for (var j = 0; j < i; j++) {
        tmp.addVectors(tmp, ass.balls[j].pos);
      }
      spheres[i].position.set(tmp.x, tmp.y, tmp.z);
      if (play) {
      // if (play && i == ass.size-1) {
        tmp.addVectors(tmp, ass.balls[i].pos);
        path.geometry.attributes.position.array[index++] = tmp.x;
        path.geometry.attributes.position.array[index++] = tmp.y;
        path.geometry.attributes.position.array[index++] = tmp.z;
        drawCount++;
        path.geometry.setDrawRange(0, drawCount);
      }
    }
  }
}

function updateSelection( x ) { // updates the selected sphere to be darker
  for (var i = 0; i < ass.size; i++) {
    if (i == x) spheres[i].material = clear2;
    else spheres[i].material = clear;
  }
}

function changeShapeSize( s ) { // creates a square with side length s
  var pts = [];
  pts.push( new THREE.Vector2( -s/2, -s/2 ) );
  pts.push( new THREE.Vector2( -s/2, s/2 ) );
  pts.push( new THREE.Vector2( s/2, s/2 ) );
  pts.push( new THREE.Vector2( s/2, -s/2 ) );
  pts.push( new THREE.Vector2( -s/2, -s/2 ) );
  return new THREE.Shape( pts );
}

function createPathMesh( size, path ) {
  extrudeSettings.steps = path.length * 10;
  extrudeSettings.extrudePath = new THREE.CatmullRomCurve3( path );
  console.log(extrudeSettings.extrudePath.tension);
  extrudeSettings.extrudePath.tension = 0;
  console.log(extrudeSettings.extrudePath.tension);
  var shape = changeShapeSize( size );
  var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
  var mesh = new THREE.Mesh( geometry, color );
  return mesh;
}

///////////////////////////////////////////////// STL EXPORT

var exporter = new THREE.STLExporter();

var extrudeSettings = {
  steps: 200,
  bevelEnabled: false,
};

var link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link );

function save( blob, filename ) {
  link.href = URL.createObjectURL( blob );
  link.download = filename;
  link.click();
}

function saveArrayBuffer( buffer, filename ) {
  save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
}

///////////////////////////////////////////////// SVG EXPORT

function applyRotation( points ) {
  var az = controls.getAzimuthalAngle();
  var pol = controls.getPolarAngle() + Math.PI/2;
  var x_axis = new THREE.Vector3(1, 0, 0);
  var y_axis = new THREE.Vector3(0, 1, 0);
  
  var vecArr = [];
  for (var i = 0; i < points.length/3; i++) {
    vecArr[i] = new THREE.Vector3(points[3*i], points[3*i+1], points[3*i+2]);
    vecArr[i].applyAxisAngle(y_axis, -az);
    vecArr[i].applyAxisAngle(x_axis, pol);
  }
  for (var i = 0; i < vecArr.length; i++) {
    points[3*i] = vecArr[i].x;
    points[3*i+1] = vecArr[i].y;
    points[3*i+2] = vecArr[i].z;
  }
  return points;
}

function create2DPathString( weight, points ) {
  var pathString = '';
  var maxLen = 0;
  for (var i = 0; i < ass.size; i++) {maxLen += ass.balls[i].r;}
  maxLen *= 2;

  var rotated_points = applyRotation( points );
  for (var i = 0; i < rotated_points.length; i++) { // only takes x & y values
    var tmp = rotated_points[i].toFixed(5);
    if (i % 3 == 0 || i % 3 == 1) pathString = pathString + ' ' + tmp.toString();
  }
  var file = '<svg version="1.0" width="500" height="500" viewBox="';
  file = file + -maxLen/2 + ' ' + -maxLen/2 + ' ' + maxLen + ' ' + maxLen;
  file = file + '" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <polyline points="';
  var color = line_mat.color.getHexString();
  file = file + pathString + '" fill="none" stroke="#' + color + '" stroke-width="' + weight + '"></polyline></svg>';
  return file;
}

function saveSVG ( weight, points, filename) {
  save( new Blob( [create2DPathString( weight, points )], { type: 'application/octet-stream' } ), filename );
}

///////////////////////////////////////////////// PATH EXPORT

String.prototype.format = function () {
  var str = this;
  for ( var i = 0; i < arguments.length; i ++ ) {
    str = str.replace( '{' + i + '}', arguments[ i ] );
  }
  return str;
};

function exportPathCode( p ) {
  var strplace = [];
  for ( var i = 0; i < p.length / 3; i ++ ) {
    strplace.push( 'new THREE.Vector3({0}, {1}, {2})'.format( p[3*i], p[3*i+1], p[3*i+2] ) );
  }
  // console.log( strplace.join( ',\n' ) );
  var code = '[' + ( strplace.join( ',\n\t' ) ) + ']';
  return code;
}

///////////////////////////////////////////////// GUI CONTROLS

var guiControls = new function() {
  // this.ass = new Assembly();
  this.speed = 1;
  this.weight = 0.1;
  this.showAssembly = true;
  this.axes = true;
  this.play = false;
  this.stroke = 0xFF0000;
  this.background = 0xE3FFFC;
  this.assembly = 0x919191;
  this.selection = 0;
  this.radius = ass.balls[0].r;
  this.d_alpha = ass.balls[0].d_alpha;
  this.d_beta = ass.balls[0].d_beta;
  this.add = function() {
    ass.add();
    createAssembly();
    updateAssembly();
    this.selection = ass.size - 1;
    updateSelection( this.selection );
    select.max(ass.size - 1);
    updateControllers();
  }
  this.remove = function() {
    if (ass.size != 1) {
      ass.rem();
      spheres.pop().visible = false;
      if (this.selection == ass.size) this.selection--;
    }
    select.max(ass.size - 1);
    updateSelection( this.selection );
    updateControllers();
  }
  this.clear = function() {
    path.geometry.attributes.position.array = new Float32Array( MAX_POINTS * 3 );
    drawCount = -1;
    index = -1;
    path.geometry.setDrawRange(0, drawCount);
  }
  this.filename = 'my_spirograph';
  this.exportSTL = function() {
    var arr = path.geometry.attributes.position.array;
    var tmp = [];
    for (var i = 0; i < drawCount; i++) {
      tmp[i] = new THREE.Vector3(arr[3 * i], arr[3 * i + 1], arr[3 * i + 2]);
    }
    var mesh = createPathMesh( 0.1, tmp );
    var result = exporter.parse( mesh, { binary: true } );
    saveArrayBuffer( result, this.filename + '.stl' );
  }
  this.exportSVG = function () {
    var arr = path.geometry.attributes.position.array.slice(0,index);
    saveSVG ( 0.1, arr, this.filename + '.svg');
  }
  this.exportCode = function() {
    var code = exportPathCode(path.geometry.attributes.position.array.slice(0,index-1));
    save( new Blob( [code], { type: 'application/octet-stream' } ), this.filename + '.txt' );
  }
}

var gui = new dat.GUI();
var changeSpeed = gui.add(guiControls, 'speed', 1, 10).step(1);
var toggleAssembly = gui.add(guiControls, 'showAssembly');
var toggleAxes = gui.add(guiControls, 'axes');
gui.add(guiControls, 'play');
gui.addColor(guiControls, 'stroke');
gui.addColor(guiControls, 'background');
gui.addColor(guiControls, 'assembly');
var select = gui.add(guiControls, 'selection').min(0).step(1).max(0);
var changeR = gui.add(guiControls, 'radius', 1, 50);
var changeA = gui.add(guiControls, 'd_alpha', -1, 1).step(0.1);
var changeB = gui.add(guiControls, 'd_beta', -1, 1).step(0.1);
gui.add(guiControls, 'add');
gui.add(guiControls, 'remove');
gui.add(guiControls, 'clear');
gui.add(guiControls, 'filename');
// var changeWeight = gui.add(guiControls, 'weight', 0, 5);
gui.add(guiControls, 'exportSTL');
gui.add(guiControls, 'exportSVG');
gui.add(guiControls, 'exportCode');
// gui.remember(guiControls);

changeSpeed.onChange(function(value) {ass.speed = value;});

toggleAssembly.onChange(function(value) { 
  for (var i = 0; i < ass.size; i++) {
    if (value) spheres[i].visible = true;
    else spheres[i].visible = false;
  }
}); 

toggleAxes.onChange(function(value) {
  if (value) axesHelper.visible = true;
  else axesHelper.visible = false;
});

changeR.onChange(function(value) {
  var i = guiControls.selection;
  ass.balls[i].r = value;
  ass.balls[i].update();
  var init_radius = spheres[i].geometry.parameters.radius;
  spheres[i].scale.x = value / init_radius;
  spheres[i].scale.y = value / init_radius;
  spheres[i].scale.z = value / init_radius;
  updateAssembly();
});

changeA.onChange(function(value) {
  ass.balls[guiControls.selection].d_alpha = value;
});

changeB.onChange(function(value) {
  ass.balls[guiControls.selection].d_beta = value;
});

select.onChange(function(value) {
  updateControllers();
  updateSelection(value);
});

function updateControllers() {
  guiControls.radius = ass.balls[guiControls.selection].r;
  guiControls.d_alpha = ass.balls[guiControls.selection].d_alpha;
  guiControls.d_beta = ass.balls[guiControls.selection].d_beta;
  for (var i in gui.__controllers) {
    gui.__controllers[i].updateDisplay();
  }
}

///////////////////////////////////////////////// 

function animate() {
  requestAnimationFrame( animate );
  
  renderer.setClearColor( guiControls.background, 1 );
  clear.color.setHex( guiControls.assembly );
  clear2.color.setHex( guiControls.assembly );
  line_mat.color.setHex( guiControls.stroke );
  color.color.setHex( guiControls.stroke );

  updateAssembly( guiControls.play );
  if (index != -1) path.geometry.attributes.position.needsUpdate = true; 

  renderer.render( scene, camera );
}
animate();
