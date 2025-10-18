"""
Build script to create executable for Magno.bp
Run: python build_exe.py
"""
import PyInstaller.__main__
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
game_path = os.path.join(script_dir, 'game.py')

PyInstaller.__main__.run([
    game_path,
    '--onefile',
    '--windowed',
    '--name=MagnoBP',
    '--icon=NONE',
    '--add-data=save.json;.',
    '--add-data=leaderboard.json;.',
    '--clean',
])

print("\n✅ Build complete! Check the 'dist' folder for MagnoBP.exe")
print("📦 You can now distribute this .exe file to players")
