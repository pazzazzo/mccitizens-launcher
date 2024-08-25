const Store = require('electron-store');

const store = new Store();

store.clear();

console.log('Electron store has been cleared.');