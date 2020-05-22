///////////////////////////////////////////////// SETUP

var scene = new THREE.Scene();
//var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var viewSize = 10;
var aspectRatio = window.innerWidth / window.innerHeight;
var camera = new THREE.OrthographicCamera( -aspectRatio * viewSize / 2, aspectRatio * viewSize /2, viewSize / 2, -viewSize /2, -1000, 1000)
scene.add( camera );

var light = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(light);

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
renderer.setClearColor( 0xffffff, 1 );

controls = new THREE.OrbitControls(camera, renderer.domElement);
var axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );

///////////////////////////////////////////////// MATERIALS 

var clear = new THREE.MeshBasicMaterial({ 
  color: 0x000000,
  transparent: true,
  opacity: 0.25,
});
clear.depthWrite = false;
//renderer.sortObjects = false;

var line_mat = new THREE.LineBasicMaterial( {
	color: 0xff0000,
	linewidth: 1,
} );

///////////////////////////////////////////////// ASSEMBLY & PATH FUNCTIONS

var spheres = []; // mesh array
var ass = new Assembly(); // main data-structure

var MAX_POINTS = 10000;
var drawCount = 2;
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
      var geometry = new THREE.SphereGeometry(ball.r, 32, 32);
      var tmp = new THREE.Mesh (geometry, clear);
      spheres[i] = tmp;
      scene.add( spheres[i] );
    }
  }
}
createAssembly();

function updateAssembly( play ) { // updates position of each sphere and path points
  for (var k = 0; k < ass.speed; k++) {
    if (play) ass.update();
    for (var i = 0; i < ass.size; i++) {
      var tmp = new THREE.Vector3(0,0,0);
      var tmp2 = ass.balls[i].pos;
      for (var j = 0; j < i; j++) {
        tmp.addVectors(tmp, ass.balls[j].pos);
      }
      spheres[i].position.set(tmp.x, tmp.y, tmp.z);
      if (play) {
        tmp.addVectors(tmp, tmp2);
        path.geometry.attributes.position.array[index++] = tmp.x;
        path.geometry.attributes.position.array[index++] = tmp.y;
        path.geometry.attributes.position.array[index++] = tmp.z;
        drawCount++;
        path.geometry.setDrawRange(0, drawCount);
      }
    }
  }
}

///////////////////////////////////////////////// GUI CONTROLS

var guiControls = new function() {
  this.speed = 1;
  this.weight = 1;
  this.showAssembly = true;
  this.play = false;
  this.normal = false;
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
  }
  this.remove = function() {
    if (ass.size != 1) {
      ass.rem();
      spheres.pop().visible = false;
      if (this.selection == ass.size) this.selection--;
    }
  }
  this.clear = function() {
    path.geometry.attributes.position.array = new Float32Array( MAX_POINTS * 3 );
    drawCount = 2;
    path.geometry.setDrawRange(0, drawCount);
  }
}

var gui = new dat.GUI();
var changeSpeed = gui.add(guiControls, 'speed', 1, 100).step(1);
var changeWeight = gui.add(guiControls, 'weight', 1, 40).step(1);
var toggleAssembly = gui.add(guiControls, 'showAssembly');
gui.add(guiControls, 'play');
gui.add(guiControls, 'normal');
gui.addColor(guiControls, 'stroke');
gui.addColor(guiControls, 'background');
gui.addColor(guiControls, 'assembly');
var select = gui.add(guiControls, 'selection').min(0).step(1).max(15);
var changeR = gui.add(guiControls, 'radius', 1, 10);
var changeA = gui.add(guiControls, 'd_alpha', -5, 5).step(0.1);
var changeB = gui.add(guiControls, 'd_beta', -5, 5).step(0.1);
gui.add(guiControls, 'add');
gui.add(guiControls, 'remove');
gui.add(guiControls, 'clear');

changeSpeed.onChange(function(value) {ass.speed = value;});

changeWeight.onChange(function(value) {path.material.linewidth = value;})

toggleAssembly.onChange(function(value) { 
  for (var i = 0; i < ass.size; i++) {
    if (value) spheres[i].visible = true;
    else spheres[i].visible = false;
  }
}); 

changeR.onChange(function(value) {
  var i = guiControls.selection % ass.size;
  ass.balls[i].r = value;
  var init_radius = spheres[i].geometry.parameters.radius;
  spheres[i].scale.x = value / init_radius;
  spheres[i].scale.y = value / init_radius;
  spheres[i].scale.z = value / init_radius;
});

changeA.onChange(function(value) {
  ass.balls[guiControls.selection % ass.size].d_alpha = value;
});

changeB.onChange(function(value) {
  ass.balls[guiControls.selection % ass.size].d_beta = value;
});

select.onChange(function(value) {
  guiControls.radius = ass.balls[value % ass.size].r;
  guiControls.d_alpha = ass.balls[value % ass.size].d_alpha;
  guiControls.d_beta = ass.balls[value % ass.size].d_beta;
  for (var i in gui.__controllers) {
    gui.__controllers[i].updateDisplay();
  }
});

///////////////////////////////////////////////// 

camera.position.z = 10;

function animate() {
  requestAnimationFrame( animate );
  
  renderer.setClearColor( guiControls.background, 1 );
  clear.color.setHex( guiControls.assembly );
  line_mat.color.setHex( guiControls.stroke );

  updateAssembly( guiControls.play );

  if (drawCount != -1) path.geometry.attributes.position.needsUpdate = true; 

  renderer.render( scene, camera );
}
animate();
