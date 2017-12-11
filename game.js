'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw Error('Можно прибавлять к вектору только вектор типа Vector');
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(n = 1) {
    return new Vector(this.x * n, this.y * n);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector && size instanceof Vector && speed instanceof Vector)) {
      throw new Error('Передан неверный тип данных');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

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

  act() {}

  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('Передан неверный тип данных');
    }
    if (actor === this) {
      return false;
    }
    return actor.left < this.right && actor.right > this.left && actor.top < this.bottom && actor.bottom > this.top;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice();
    this.actors = actors.slice();
    this.player = this.actors.find(x => x.type === 'player');
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(x => x.length));
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor) {
    if(!(actor instanceof Actor)) {
      throw new Error('Передан неверный тип данных');
    }
    return this.actors.find(elements => actor.isIntersect(elements));
  }

  obstacleAt(pos, size) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error("Необходим объект типа Vector");
    }
    if (pos.x < 0 || (pos.x + size.x >= this.width) || pos.y < 0) {
      return 'wall';
    }
    if (pos.y + size.y >= this.height) {
      return 'lava';
    }

    const horizontalStart = Math.floor(pos.x);
    const horizontalEnd = Math.ceil(pos.x + size.x);
    const verticalStart = Math.floor(pos.y);
    const verticalEnd = Math.ceil(pos.y + size.y);
    for (let verticalIndex = verticalStart; verticalIndex < verticalEnd; verticalIndex++) {
      for (let horizontalIndex = horizontalStart; horizontalIndex < horizontalEnd; horizontalIndex++) {
        const cell = this.grid[verticalIndex][horizontalIndex];
        if (cell) {
          return cell;
        }
      }
    }
  }

  removeActor(actor) {
    const index = this.actors.indexOf(actor);
    if(index !== -1) {
      this.actors.splice(index, 1);
    }
  }

  noMoreActors(type) {
    return !this.actors.some(elem => elem.type === type);
  }

  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    }
    if (type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionary = {}) {
    this.dictionary = Object.assign({}, dictionary);
  }

  actorFromSymbol(symbol) {
    return this.dictionary[symbol];
  }

  static obstacleFromSymbol(symbol) {
    if (symbol === "x") {
      return "wall";
    }
    if (symbol === "!") {
      return "lava";
    }
  }

  static createGrid(plan = []) {
    return plan.map(row => row.split('').map(item => this.obstacleFromSymbol(item)));
  }

  createActors(stringsArr = []) {
    return stringsArr.reduce((actors, actor, i) => {
      actor.split('').forEach((char, z) => {
        const func = this.actorFromSymbol(char);
        if (typeof func === 'function') {
          const actor = new func(new Vector(z, i));
          if ( actor instanceof Actor) {
            actors.push(actor);
          }
        }
      });
      return actors;
    },[]);
  }

  parse(stringsArr) {
    return new Level(LevelParser.createGrid(stringsArr), this.createActors(stringsArr));
  }
}

class Fireball extends Actor {
  constructor(pos, speed) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    const fireRainSpeed = new Vector(0, 3);
    super(pos, fireRainSpeed);
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

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
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getNextPosition(time = 1) {
    this.spring += this.springSpeed * time;
    return this.newPosition.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  'v': FireRain,
  '|': VerticalFireball,
  'o': Coin
};

const parser = new LevelParser(actorDict);

loadLevels().then(levelsStr => {
  const levels = JSON.parse(levelsStr);
  return runGame(levels, parser, DOMDisplay);
}).then(() => {
  alert('Вы выиграли!');
});
