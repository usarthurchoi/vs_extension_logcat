const vscode = require('vscode');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

let lastWriteTime = Date.now();
const writeInterval = 100; // milliseconds

function writeToTerminal(terminal, data) {
	const now = Date.now();
	if (now - lastWriteTime > writeInterval) {
		terminal.sendText(data);
		lastWriteTime = now;
	}
}

/**
 * Activates the extension.
 */
function activate(context) {
	console.log('Your extension "logcat-extension" is now active!');

	let terminal = vscode.window.createTerminal(`LogCat Terminal`);
	// Determine the log file path, supporting multi-root workspaces
	// let logFilePath = getLogFilePath();
	// console.log('logpath to ', logFilePath, '...');

	// let logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
	// Capture LogCat logs
	const adbProcess = spawn('adb', ['logcat']);
	console.log('adbProcess opened... ');

	context.subscriptions.push(vscode.commands.registerCommand('extension.captureLogCat', async function () {
		let logFilePath = getLogFilePath(); // Attempt to get a log file path based on an open workspace

		if (!logFilePath) {
			// No workspace folder is open; ask the user to select a directory
			logFilePath = await selectLogDirectory();
		}

		if (!logFilePath) {
			// User cancelled the directory selection or an error occurred
			vscode.window.showErrorMessage("LogCat Extension: Log directory selection was cancelled or an error occurred.");
			return;
		}
		let logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

		adbProcess.stdout.on('data', (data) => {
			let logData = data.toString();
			// Display in the terminal
			//terminal.sendText(logData, true);
			writeToTerminal(terminal, logData);
			// Write to file
			logStream.write(logData);
		});

		adbProcess.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
		});

		adbProcess.on('close', (code) => {
			console.log(`child process exited with code ${code}`);
			logStream.close();
		});
	}));
	console.log('extension.captureLogCat command registration is done!');

	context.subscriptions.push(vscode.commands.registerCommand('extension.stopLogCat', function () {
		// Implement logic to stop logcat process and close the file stream
		adbProcess.kill();
	}));

	console.log('extension.stopLogCat command registration is done!')

	// Implement a simple filter UI and logic as needed
}

function getLogFilePath() {
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		// Use the first workspace folder by default
		const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
		return path.join(workspaceFolder, "logcat.txt");
	} else {
		return null; // No workspace folder is open
	}
}

async function selectLogDirectory() {
	const options = {
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Select Log Directory'
	};

	const folderUri = await vscode.window.showOpenDialog(options);

	if (folderUri && folderUri.length > 0) {
		return path.join(folderUri[0].fsPath, 'logcat.txt');
	} else {
		return null; // User cancelled the dialog
	}
}


function deactivate() { }

module.exports = {
	activate,
	deactivate
}