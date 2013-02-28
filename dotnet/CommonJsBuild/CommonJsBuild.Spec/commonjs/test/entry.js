window.$ = require('jquery')
window.bezier = require('bezier');
window.draggy = require('draggy');
window.raf = require('raf');
window.easing = require('easing');


$(document).ready(function(){

  var cn = $('<canvas />');
  cn.attr({ width: 1000, height: 1000});
  cn.css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1000,
    height: 1000
  });



  var output = ($('<input type="text" />')).css({ position: 'absolute', top: 680, left: 100, width: 500}).appendTo($('body'));

 

  canvas = cn[0].getContext('2d');

  $('body').append( cn );

 canvas.fillStyle = '#FFF';
   canvas.fillRect(0,0,1000,500);
   canvas.lineWidth = 3;

  var p1 = ($('<div />')).css({ position : 'absolute', top: 450, left: 250, width: 10, height: 10, background: '#F00'}).appendTo($('body'));
  var p4 = ($('<div />')).css({ position : 'absolute', top: 250, left: 450, width: 10, height: 10, background: '#F00'}).appendTo($('body'));
  var p2 = ($('<div />')).css({ position : 'absolute', top: 450, left: 250, width: 10, height: 10, background: '#0F0'}).appendTo($('body'));
  var p3 = ($('<div />')).css({ position : 'absolute', top: 250, left: 450, width: 10, height: 10, background: '#0F0'}).appendTo($('body'));
  
 var dot1 = ($('<div />')).css({position: 'absolute', top: 320, left: 100, width: 10, height: 10, borderRadius : 3, background: '#333'}).appendTo( $('body') );

  var curve = bezier()
    .c1([250, 450])
    .c2([250, 450])
    .c3([450, 250])
    .c4([450, 250]);

  var normX = function( val ){

    return ((val - 250) / 200);

  }

  var normY = function( val ){

    return ((val - 450) / 200);

  }

  var norm = function( arr ){

    return [normX(arr[0]), normY(arr[1])];

  }

  var process = function( query ){

    var n = {
      c2 : norm(query.c2),
      c3 : norm(query.c3)
    };

    output.val("curve={ c1 : [0,0], c2 : [" + n.c2[0] + "," + n.c2[1] + "], c3 : [" + n.c3[0] + "," + n.c3[1] + "], c4 : [1,-1]};")

  }


  var updateCurve = function(){

    process(curve.query());

    canvas.fillStyle = '#FFF';
    canvas.fillRect(0,0,1000,500);

    canvas.fillStyle = '#000';
    curve.renderToCanvas( canvas );

  }

  updateCurve();

  //draggy(p1).dragMove( function(){curve.c1(p1.position()); updateCurve() });
  draggy(p2).dragMove( function(){curve.c2(p2.position()); updateCurve() } );
  draggy(p3).dragMove( function(){curve.c3(p3.position()); updateCurve() } );
  //draggy(p4).dragMove( function(){curve.c4(p4.position()); updateCurve() } );

  var startTime = (new Date()).getTime();

  var flag = true;

  var step = function(){

    raf(step);

    var percent = (((new Date()).getTime() - startTime) % 2000) / 2000;


    var coords = curve.point( percent );
    dot1.css({ left : coords.x});


  };

  step();


});