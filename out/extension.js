"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function activate(context) {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('robotvibecoder.sidebar', new SidebarProvider(context), { webviewOptions: { retainContextWhenHidden: true } }));
}
class SidebarProvider {
    context;
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(view) {
        view.webview.options = { enableScripts: true };
        view.webview.html = this.getHtml(view.webview);
        view.webview.onDidReceiveMessage(msg => {
            if (msg.command === 'generate') {
                const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
                if (!folder)
                    return;
                const filePath = path.join(folder, 'robotvibecoder_config.json');
                fs.writeFileSync(filePath, JSON.stringify(msg.data, null, 2));
                vscode.window.showInformationMessage('Config saved!');
            }
        });
    }
    getHtml(webview) {
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
		  .rainbow-text {
			background: linear-gradient(to right, red, orange, yellow, green, cyan, blue, violet);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			display: inline-block;
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
		<h2>Robot <span class="rainbow-text">Vibe</span> Coder</h2>
  
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
  
		  updateLeadMotorDropdown(); // Initialize
		</script>
	  </body>
	  </html>
	`;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map