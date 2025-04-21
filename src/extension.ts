import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'robotvibecoder.sidebar',
      new SidebarProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
}

class SidebarProvider implements vscode.WebviewViewProvider {
  constructor(private context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = { enableScripts: true };
    view.webview.html = this.getHtml(view.webview);

    view.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'generate') {
        const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!folder) return;
        const filePath = path.join(folder, `src/main/java/frc/robot/${msg.data.package.replace(".", "/")}/${msg.data.name}_config.json`);
		const cp = require('child_process')
		console.log("Executing that thang")
		let term: vscode.Terminal = vscode.window.createTerminal({
			name: "robotvibecoder",
			isTransient: true,
			hideFromUser: true,
		});
		term.sendText(`echo '${JSON.stringify(msg.data, null, 0)}' | robotvibecoder -f src/main/java/frc/robot/${msg.data.package.replace(".", "/")} generate --stdin`, true)
		term.show(false);
        fs.writeFileSync(filePath, JSON.stringify(msg.data, null, 2));
        vscode.window.showInformationMessage('Config saved!');
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
			background-color:rgb(219, 32, 32);
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
			background-color:rgb(0, 79, 227);
			color: white;
			border: none;
			cursor: pointer;
		  }
		  #add-motor:hover {
			background-color:rgb(0, 64, 202);
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
		</style>
	  </head>
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
  
		  updateLeadMotorDropdown();
		</script>
	  </body>
	  </html>
	`;
}


  
}

export function deactivate() {}
