/* global window */
const global = window;

class Player {
  constructor() {
    this.id = global.PlayerId();
    this.pedId = global.PlayerPedId();
  }

  isDead() {
    return global.IsEntityDead(this.pedId);
  }

  getLocation() {
    return global.GetEntityCoords(this.pedId, !this.isDead());
  }

  getHeading() {
    return global.GetEntityHeading(this.pedId);
  }
}

module.exports = Player;
