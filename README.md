# RobotVibeCoder VSCode Extension

This is a VSCode extension to help FRC teams generate robot mechanism code (Arm, Elevator, Flywheel) using the [robotvibecoder](https://github.com/team401/robotvibecoder) CLI tool.

## How to Use

1. Open VSCode. It’ll ask to install `robotvibecoder` — click "Install".
2. Make sure your project uses the normal WPILib structure:
   ```
   src/main/java/frc/robot/your/package/here
   ```
3. Use the sidebar to fill in your mechanism and click **Generate**.

## Notes

- The extension will create the package folder if it doesn’t exist.
- Python and pip are required.
