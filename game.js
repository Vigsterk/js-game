'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  plus(vector) {
    if (!(vector instanceof Vector)) {
			throw new Error('Можно прибавлять к вектору только вектор типа Vector');
		}
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(n) {
    return new Vector(this.x * n, this.y * n);
  }
}

//----------------------------------------------------

class Actor {
  constructor(pos, size, speed) {
    if (!pos) {
			pos = new Vector(0, 0);
		}
		if (!size) {
			size = new Vector(1, 1);
		}
		if (!speed) {
			speed = new Vector(0, 0);
		}
		if (!(pos instanceof Vector)) {
			throw new Error('pos не является объектом типа Vector');
		}
		if (!(size instanceof Vector)) {
			throw new Error('size не является объектом типа Vector');
		}
		if (!(speed instanceof Vector)) {
			throw new Error('speed не является объектом типа Vector');
		}
    this.pos = pos;
    this.size = size;
    this.speed = speed;

  }

  act() {} // Должен быть определен метод act, который ничего не делает.
  
  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
		return 'actor';
	}

//----------------------------------------------------
  
isIntersect(actor) {
  if (actor instanceof Actor) {
      if (this === actor) return false;
    
      let horizontal = actor.left === this.left && actor.right === this.right,
          vertical = actor.top === this.top && actor.bottom === this.bottom,
          axisX = (actor.left < this.left && this.left < actor.right) || (this.left < actor.left && actor.left < this.right),
          axisY = (actor.top < this.top && this.top < actor.bottom) || (this.top < actor.top && actor.top < this.bottom);
    
      return (axisX && axisY) || (axisX && vertical) || (axisY && horizontal) || (horizontal && vertical);
    } else {
      throw new Error("Необходим объект типа Actor");
    }
}
}

//----------------------------------------------------

class Level {
constructor(grid = [], actors = []) {
  this.grid = grid; // Имеет свойство grid — сетку игрового поля. Двумерный массив строк.
  this.actors = actors; // actors — список движущихся объектов игрового поля, массив объектов Actor.
  this.player = actors.find(actor => actor.type === 'player'); // player — движущийся объект, тип которого — свойство type — равно player.
  this.height = grid.length; // height — высоту игрового поля, равное числу строк в сетке из первого аргмента.
  this.width = grid.reduce((cell, row) => row.length > cell ? row.length : cell, 0);
  /* width — ширину игрового поля, равное числу ячеек в строке сетки из первого аргумента. При этом, если в разных строках разное число ячеек, то width будет равно максимальному количеству ячеек в строке. */
  this.status = null; // status — состояние прохождения уровня, равное null после создания.
  this.finishDelay = 1; // finishDelay — таймаут после окончания игры, равен 1 после создания.
}

isFinished() {
  return (this.status !== null && this.finishDelay < 0);
}

actorAt(actor){
  if (!(actor instanceof Actor) || actor === undefined) {
    throw new Error("Необходим объект типа Actor");
  }
  return this.actors.find(el => el.isIntersect(actor));
}
  
//-------------------------------------------------------

obstacleAt(pos, size) {
  if (!(pos instanceof Vector) || !(size instanceof Vector)) {
    throw new Error("Необходим объект типа Vector");
  }
    if (pos.x < 0 || (pos.x + size.x >= this.width) || pos.y < 0 )  {
      return 'wall';
    } else if (pos.y + size.y >= this.height) {
      return 'lava';
    }
    
    let verticalStart = Math.floor(pos.y),
        verticalEnd = Math.ceil(pos.y + size.y),
        horizontalStart = Math.floor(pos.x),
        horizontalEnd = Math.ceil(pos.x + size.x);

    for (let verticalValue = verticalStart; verticalValue < verticalEnd; verticalValue++) {
      for (let horizontalValue = horizontalStart; horizontalValue < horizontalEnd; horizontalValue++) {
        let vertDirection = this.grid[verticalValue];
        if (vertDirection) {
        	let horzntDirection = vertDirection[horizontalValue];
        	if (horzntDirection) return horzntDirection;
        }
      }
    }
  
    return undefined;

}
  
//-------------------------------------------------------

  removeActor(actor) {
    let indexActor = this.actors.indexOf(actor);
    if (indexActor > -1) {
        this.actors.splice(indexActor, 1);
    }
  }

  noMoreActors(type) {
    let actors = [];
    this.actors.forEach(actor => {
        if (actor.type === type) {
            actors.push(actor);
        }
    })
    
    return actors.length === 0;
  }

//----------------------------------------------------
  
playerTouched(type, actor){
  if (this.status !== null)
    return; //Если состояние игры уже отлично от null, то не делаем ничего, игра уже и так завершилась.
  
  if (type === 'lava' || type === 'fireball') {
    this.status ='lost';
  }
  
  if (type === 'coin') {
      this.removeActor(actor);
    if (this.noMoreActors('coin')) {
      this.status = 'won';
    }
  }
}

}

//----------------------------------------------------

class LevelParser {
  constructor(objDictionary) {
    this.objDictionary = objDictionary;
  }
  actorFromSymbol(symbol) {
    if (symbol === undefined){
    return undefined;
  }
  return this.objDictionary[symbol];
}
  
obstacleFromSymbol(symbol) {
  if (symbol === "x") { //Вернет wall, если передать x.
     return "wall";
   } else if (symbol === "!") { //Вернет lava, если передать !
     return "lava";
   }
}
  
//----------------------------------------------------
  
createGrid(stringsArr) {
  if (stringsArr.length < 1)
    return [];
    let grid = [], row;
    for (let string of stringsArr) {
      row = [];
      for (let key of string)
      row.push(this.obstacleFromSymbol(key));
      grid.push(row);
    }
    return grid;
  }

  createActors(stringsArr) {
    let actor,
        actors = [],
        func;   
    for (let i = 0; i < stringsArr.length; i++) {
      for (let z = 0; z < stringsArr[i].length; z++) {
        let char = stringsArr[i][z];
        try {
          func = this.actorFromSymbol(char);
          actor = new func(new Vector(z, i));
          if (actor instanceof Actor)actors.push(actor);
        } catch (exception) {}
      }
    }
    return actors;
  }
  parse(stringsArr) {
  return new Level(this.createGrid(stringsArr), this.createActors(stringsArr));
  }
}

//----------------------------------------------------

class Fireball extends Actor {
  constructor(pos = new Vector(), speed = new Vector()) {
    super(pos, new Vector(1, 1), speed);
  }
  
  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }

  handleObstacle() {
    this.speed = new Vector(-this.speed.x, -this.speed.y);
  }

  act(time, level) {
    let nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size))
      this.handleObstacle();
    else
      this.pos = nextPosition;
  }

}

//----------------------------------------------------

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(), speed = new Vector(2, 0)) {
    super(pos, speed);
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(), speed = new Vector(0, 2)) {
    super(pos, speed);
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    let speed = new Vector(0,3);
    super(pos, speed);
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

//----------------------------------------------------

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.newPosition = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.spring += this.springSpeed * time;
    return this.newPosition.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

//----------------------------------------------------

class Player extends Actor {
  constructor(pos) {
    super(pos, new Vector(0.8, 1.5));
    this.pos.y -= 0.5;
  }
  get type() {
    return 'player';
  }
}

let levels = [
  
  [
  "     v                 ",
  "                       ",
  "                       ",
  "                       ",
  "                       ",
  " |                     ",
  " o  o               o  ",
  " x  x               x  ",
  " x          o o  =  x  ",
  " x  @       xxxxx   x  ",
  " xxxxxx             x  ",
  "      x!!!!!!!!!!!!!x  ",
  "      xxxxxxxxxxxxxxx  ",
  "                       "
  ],

  [
  "        |           |  ",
  "                       ",
  "                       ",
  "                       ",
  "                       ",
  "                       ",
  "                       ",
  "                       ",
  "                       ",
  "     |                 ",
  "                       ",
  "         =      |      ",
  " @ |  o            o   ",
  "xxxxxxxxx!!!!!!!xxxxxxx",
  "                       "
  ],

  [
  "                       ",
  "                       ",
  "                       ",
  "    o                  ",
  "    x      | x!!x=     ",
  "         x             ",
  "                      x",
  "                       ",
  "                       ",
  "                       ",
  "               xxx     ",
  "                       ",
  "                       ",
  "       xxx  |          ",
  "                       ",
  " @                     ",
  "xxx                    ",
  "                       "
  ],

  [
  "   v         v",
  "              ",
  "         !o!  ",
  "              ",
  "              ",
  "              ",
  "              ",
  "         xxx  ",
  "          o   ",
  "        =     ",
  "  @           ",
  "  xxxx        ",
  "  |           ",
  "      xxx    x",
  "              ",
  "          !   ",
  "              ",
  "              ",
  " o       x    ",
  " x      x     ",
  "       x      ",
  "      x       ",
  "   xx         ",
  "              "
  ],
// Хардкор ниже ^___^
  [
  "     v      v                 |    v  v    v     ",
  "                 o       =                       ",
  "                 x                               ",
  "               =       o            o        =   ",
  "         o             x            x   =        ",
  " |       x                                   o   ",
  " o                  o          o    =   x    x   ",
  " x                  x          x                 ",
  " x          o o  =  x                x           ",
  " x  @       xxxxx   x       o           =        ",
  " xxxxxx                     x                    ",
  "      x!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ! ",
  "      xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx! ! ",
  "                                             ! ! ",
  "                                             ! ! ",
  "                                             ! ! ",
  "                                             !o! ",
  "                                              x  ",
  "                                                 "
  ]

  ];



const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  'v': FireRain,
  '|': VerticalFireball,
  'o': Coin
};

  const parser = new LevelParser(actorDict);
  runGame(levels,parser,DOMDisplay)
  .then(() => alert('Было сложно?:) Молодец, усердия тебе не занимать=)!'));
