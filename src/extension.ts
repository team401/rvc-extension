import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	const hasInstalled = context.globalState.get<boolean>('robotvibecoderInstalled');
	if (!hasInstalled) {
		promptInstall(context);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand('robotvibecoder.promptInstall', () => promptInstall(context))
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'robotvibecoder.sidebar',
			new SidebarProvider(context),
			{ webviewOptions: { retainContextWhenHidden: true } }
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"robotvibecoder.generateMechanism", generateMechanism
		)
	);
}

function promptInstall(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage(
		"RobotVibeCoder requires the Python package `robotvibecoder`. If you do not install, then you won't be able to use the extension.",
		"Install", "Not for now"
	).then(selection => {
		if (selection === "Install") {
			exec('pip install robotvibecoder', (error, stdout, stderr) => {
				if (error) {
					vscode.window.showErrorMessage(`Failed to install robotvibecoder: ${stderr}`);
					return;
				}
				context.globalState.update('robotvibecoderInstalled', true);
				vscode.window.showInformationMessage('Successfully installed robotvibecoder!');
			});
		}
	});
}

interface MechanismConfig {
	package: string,
	name: string,
	kind: "Arm" | "Elevator" | "Flywheel",
	canbus: string,
	motors: string[],
	lead_motor: string,
	encoder: string
}

async function generateMechanism() {
	const configFilePath = vscode.window.activeTextEditor?.document.uri.fsPath;
	if (!configFilePath || !fs.existsSync(configFilePath)) {
		vscode.window.showErrorMessage("Couldn't open config: please open a config JSON file");
		return;
	}
	let jsonData: MechanismConfig;
	try {
		const fileContent = fs.readFileSync(configFilePath, "utf-8");
		jsonData = JSON.parse(fileContent);
	} catch (error) {
		vscode.window.showErrorMessage(`Error reading/parsing JSON: ${error}. Please open a valid config JSON file.`);
		return;
	}
	ensurePackagePath(jsonData.package);
	await executeRVCGenerate(jsonData.package, configFilePath);
}

function ensurePackagePath(pkg: string): string | undefined {
	const workspaceUri = vscode.workspace.workspaceFolders?.[0].uri;
	const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if (!workspaceUri || !folder) return;

	const configFolderPath = path.normalize(path.join(folder, `src/main/java/frc/robot/${pkg.replace(".", "/")}/`));
	if (!fs.existsSync(configFolderPath)) {
		fs.mkdirSync(configFolderPath, { recursive: true });
	}

	return configFolderPath;
}

async function executeRVCGenerate(pkg: string, configFilePath: string) {
	const folder = path.normalize(`src/main/java/frc/robot/${pkg.replace(".", "/")}/`);
	const command = `robotvibecoder -f ${folder} generate -c ${configFilePath}`;
	const shell = new vscode.ShellExecution(command);

	const workspaceUri = vscode.workspace.workspaceFolders?.[0].uri;
	if (!workspaceUri) return;

	const workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceUri);
	if (!workspaceFolder) {
		vscode.window.showErrorMessage("RobotVibeCoder couldn't generate mechanism because workspace was undefined. Try opening a folder!");
		return;
	}

	const task = new vscode.Task({ type: "rvc-generate" }, workspaceFolder, "Generate", "robotvibecoder", shell);
	task.presentationOptions.echo = true;
	task.presentationOptions.clear = true;

	await vscode.tasks.executeTask(task);
}

class SidebarProvider implements vscode.WebviewViewProvider {
	constructor(private context: vscode.ExtensionContext) { }

	resolveWebviewView(view: vscode.WebviewView) {
		view.webview.options = { enableScripts: true };
		view.webview.html = this.getHtml(view.webview);

		view.webview.onDidReceiveMessage(async msg => {
			if (msg.command === 'generate') {
				const configFolderPath = ensurePackagePath(msg.data.package);
				if (!configFolderPath) {
					vscode.window.showErrorMessage("RobotVibeCoder couldn't generate mechanism because workspace was undefined. Try opening a folder!");
					return;
				}
				const configFilePath = path.join(configFolderPath, `${msg.data.name}_config.json`);
				fs.writeFileSync(configFilePath, JSON.stringify(msg.data, null, 2));
				vscode.window.showInformationMessage('Config saved!');
				await executeRVCGenerate(msg.data.package, configFilePath);
			}
			if (msg.command === 'promptInstall') {
				vscode.commands.executeCommand('robotvibecoder.promptInstall');
			}
		});
	}

	private getHtml(webview: vscode.Webview) {
		return `
	  <!DOCTYPE html>
	  <html lang="en">
	  <head>
		<meta charset="UTF-8" />
		<style>
		  body {
			font-family: sans-serif;
			padding: 1rem;
			position: relative;
		  }
		  h2 {
			margin-top: 0;
			color: #007acc;
		  }
		  label {
			display: block;
			margin-top: 1rem;
			font-weight: bold;
		  }
		  input, select, button {
			width: 100%;
			padding: 0.4rem;
			margin-top: 0.3rem;
			box-sizing: border-box;
		  }
		  #motors-container {
			margin-top: 0.5rem;
		  }
		  .motor-input {
			display: flex;
			margin-top: 0.3rem;
			gap: 0.5rem;
		  }
		  .motor-input input {
			flex-grow: 1;
		  }
		  .remove-button {
			background-color: rgb(219, 32, 32);
			color: white;
			border: none;
			padding: 0 0.6rem;
			cursor: pointer;
		  }
		  .remove-button:hover {
			background-color: rgb(180, 4, 4);
		  }
		  #add-motor {
			margin-top: 0.5rem;
			background-color: rgb(0, 79, 227);
			color: white;
			border: none;
			cursor: pointer;
		  }
		  #add-motor:hover {
			background-color: rgb(0, 64, 202);
		  }
		  #generate {
			margin-top: 1.5rem;
			background-color: rgb(0, 79, 227);
			color: white;
			border: none;
			cursor: pointer;
		  }
		  #generate:hover {
			background-color: rgb(0, 76, 163);
		  }
		  #settings {
		  position: absolute;
		  top: 0px;
		  right: -100px;
		  background: none;
		  border: none;
		  cursor: pointer;
		  font-size: 20px;
		  }	

		</style>
	  </head>
	  <button id="settings" title="Settings">⚙️</button>
	  <body>
		<h2>Robot Vibe Coder</h2>
		<label>Package</label>
		<input id="package" value="subsystems.scoring" />
		<label>Mechanism Name</label>
		<input id="name" value="Wrist" />
		<label>Kind</label>
		<select id="kind">
		  <option value="Elevator">Elevator</option>
		  <option value="Arm" selected>Arm</option>
		  <option value="Flywheel">Flywheel</option>
		</select>
		<label>CAN Bus</label>
		<input id="canbus" value="canivore" />
		<label>Motors</label>
		<div id="motors-container">
		  <div class="motor-input">
			<input type="text" value="wristMotor" />
			<button class="remove-button" onclick="removeMotor(this)">×</button>
		  </div>
		</div>
		<button id="add-motor">Add Motor</button>
		<label>Lead Motor</label>
		<select id="lead_motor"></select>
		<label>Encoder</label>
		<input id="encoder" value="wristEncoder" />
		<button id="generate">Generate</button>
		
		<script>
		  const vscode = acquireVsCodeApi();

		  function updateLeadMotorDropdown() {
			const motorInputs = document.querySelectorAll('#motors-container input');
			const leadMotorSelect = document.getElementById('lead_motor');
			leadMotorSelect.innerHTML = '';
			motorInputs.forEach(input => {
			  const val = input.value.trim();
			  if (val) {
				const option = document.createElement('option');
				option.value = val;
				option.textContent = val;
				leadMotorSelect.appendChild(option);
			  }
			});
		  }

		  function removeMotor(btn) {
			const container = btn.parentElement;
			container.remove();
			updateLeadMotorDropdown();
		  }

		  document.getElementById('add-motor').addEventListener('click', () => {
			const div = document.createElement('div');
			div.className = 'motor-input';
			div.innerHTML = \`
			  <input type="text" />
			  <button class="remove-button" onclick="removeMotor(this)">×</button>
			\`;
			document.getElementById('motors-container').appendChild(div);
			updateLeadMotorDropdown();
		  });

		  document.getElementById('motors-container').addEventListener('input', updateLeadMotorDropdown);

		  document.getElementById('generate').addEventListener('click', () => {
			const motors = Array.from(document.querySelectorAll('#motors-container input'))
			  .map(input => input.value.trim())
			  .filter(val => val);

			const data = {
			  package: document.getElementById('package').value.trim(),
			  name: document.getElementById('name').value.trim(),
			  kind: document.getElementById('kind').value.trim(),
			  canbus: document.getElementById('canbus').value.trim(),
			  motors: motors,
			  lead_motor: document.getElementById('lead_motor').value.trim(),
			  encoder: document.getElementById('encoder').value.trim()
			};

			vscode.postMessage({ command: 'generate', data });
		  });

		  document.getElementById('settings').addEventListener('click', () => {
			vscode.postMessage({ command: 'promptInstall' });
		  });

		  updateLeadMotorDropdown();
		</script>
	  </body>
	  </html>
		`;
	}
}

export function deactivate() { }
