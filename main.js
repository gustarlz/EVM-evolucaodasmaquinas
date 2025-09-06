const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {

  const win = new BrowserWindow({
    width: 1920, 
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), 
      nodeIntegration: true, 
      contextIsolation: false 
    }
  });

  win.loadFile('index.html');


  
  win.removeMenu();
}


app.whenReady().then(createWindow);


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {

  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

